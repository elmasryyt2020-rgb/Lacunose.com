/**
 * Anthropic provider for the LLM abstraction layer.
 *
 * Translates our unified `LLMMessage[]` format to the `@anthropic-ai/sdk`
 * Messages API and normalizes the response back to `ChatResponse`.
 *
 * Key behaviours:
 *  - The first `role:'system'` message is hoisted to the SDK's top-level
 *    `system` parameter (as a text-block array so we can attach cache_control).
 *  - Any message carrying `cache: true` receives a `cache_control` marker
 *    so Anthropic's prompt cache kicks in at that boundary.
 *  - `LLMToolDef[]` maps 1:1 to Anthropic `{name, description, input_schema}`.
 *  - `tool_use` content blocks in the response are mapped back to `LLMToolCall[]`.
 *  - Usage reports include `cache_read_input_tokens` → `cachedInputTokens`.
 *  - If `opts.jsonSchema` is set, we append a grounding instruction to the
 *    system prompt (Anthropic has no native JSON mode).
 *  - Rate-limit / overloaded errors get ONE retry after 2s.
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatOptions,
  ChatResponse,
  LLMMessage,
  LLMToolCall,
  LLMToolDef,
} from '@lacunose/types';
import { env } from '../../lib/env.js';
import { log } from '../../lib/logger.js';

const clog = log.child('llm:anthropic');

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set — cannot use anthropic provider');
    }
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/** Anthropic text-block shape — kept local to avoid over-importing SDK internals. */
interface AnthropicTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

/** Translate our unified `LLMMessage[]` to Anthropic's messages + system. */
function translateMessages(
  messages: LLMMessage[],
  jsonSchema?: Record<string, unknown>,
): {
  system: AnthropicTextBlock[] | undefined;
  messages: Array<{ role: 'user' | 'assistant'; content: AnthropicTextBlock[] }>;
} {
  // Pull all leading system messages into the top-level `system` array.
  const systemBlocks: AnthropicTextBlock[] = [];
  const rest: LLMMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      const block: AnthropicTextBlock = { type: 'text', text: m.content };
      if (m.cache) block.cache_control = { type: 'ephemeral' };
      systemBlocks.push(block);
    } else {
      rest.push(m);
    }
  }

  // If caller wants JSON, append the schema instruction as a final system block.
  if (jsonSchema) {
    systemBlocks.push({
      type: 'text',
      text: `Respond with valid JSON matching the schema below, no prose, no markdown fences:\n${JSON.stringify(jsonSchema)}`,
    });
  }

  // Anthropic only accepts user/assistant in `messages`. We map `tool` → user
  // (their SDK also has a tool_result content block; for our simple flow we
  // inline tool outputs as user text, which is what we actually do upstream).
  const mapped = rest.map((m) => {
    const role: 'user' | 'assistant' = m.role === 'assistant' ? 'assistant' : 'user';
    const block: AnthropicTextBlock = { type: 'text', text: m.content };
    if (m.cache) block.cache_control = { type: 'ephemeral' };
    return { role, content: [block] };
  });

  return {
    system: systemBlocks.length > 0 ? systemBlocks : undefined,
    messages: mapped,
  };
}

/** Convert our tool defs to Anthropic's shape (near-identical). */
function translateTools(tools: LLMToolDef[] | undefined) {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    // Anthropic types `input_schema` with a nested SDK type; the runtime
    // contract is "any JSON-schema-shaped object" so we cast loosely here.
    input_schema: t.input_schema as unknown as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
  }));
}

/** Detect Anthropic rate-limit / overloaded errors (worth a retry). */
function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; error?: { type?: string } };
  if (e.status === 429 || e.status === 529) return true;
  if (e.error?.type === 'overloaded_error' || e.error?.type === 'rate_limit_error') return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Call the Anthropic Messages API. `concreteModel` is the resolved vendor
 * model string (e.g. "claude-opus-4-7") — the router is responsible for
 * tier → model resolution, not this function.
 */
export async function chat(
  opts: ChatOptions,
  concreteModel: string,
): Promise<ChatResponse> {
  const start = Date.now();
  const { system, messages } = translateMessages(opts.messages, opts.jsonSchema);
  const tools = translateTools(opts.tools);

  const doCall = async () => {
    return client().messages.create(
      {
        model: concreteModel,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.2,
        system,
        messages,
        tools,
      },
      { signal: opts.signal },
    );
  };

  let raw: Anthropic.Messages.Message;
  try {
    raw = await doCall();
  } catch (e) {
    if (isRetryable(e)) {
      clog.warn('retryable error, retrying in 2s', { error: (e as Error).message });
      await sleep(2000);
      try {
        raw = await doCall();
      } catch (e2) {
        throw new Error(`anthropic chat failed after retry: ${(e2 as Error).message}`);
      }
    } else {
      throw new Error(`anthropic chat failed: ${(e as Error).message}`);
    }
  }

  // Collect text + tool_use blocks.
  const toolCalls: LLMToolCall[] = [];
  const textParts: string[] = [];
  for (const block of raw.content) {
    if (block.type === 'text') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
      });
    }
  }

  const latencyMs = Date.now() - start;
  const inputTokens = raw.usage.input_tokens ?? 0;
  const outputTokens = raw.usage.output_tokens ?? 0;
  // The SDK exposes these as optional fields for cache-enabled calls.
  const cachedInputTokens =
    (raw.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens;

  clog.info('chat', {
    tier: opts.model,
    model: concreteModel,
    latencyMs,
    inputTokens,
    outputTokens,
    cachedInputTokens: cachedInputTokens ?? 0,
    toolCalls: toolCalls.length,
  });

  const response: ChatResponse = {
    content: textParts.join(''),
    usage: {
      inputTokens,
      outputTokens,
      ...(cachedInputTokens !== undefined ? { cachedInputTokens } : {}),
    },
    provider: 'anthropic',
    model: concreteModel,
    latencyMs,
  };
  if (toolCalls.length > 0) response.toolCalls = toolCalls;
  return response;
}
