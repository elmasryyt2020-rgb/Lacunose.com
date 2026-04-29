/**
 * DeepSeek provider for the LLM abstraction layer.
 *
 * Uses the `openai` SDK pointed at DeepSeek's OpenAI-compatible endpoint.
 * Translates our unified format to OpenAI Chat Completions shape and
 * normalizes the response back to `ChatResponse`.
 *
 * Key behaviours:
 *  - `response_format: { type: 'json_object' }` is set when `opts.jsonSchema`
 *    is provided; the schema is also injected into the system prompt because
 *    DeepSeek needs the structure in-prompt to behave correctly.
 *  - `LLMToolDef[]` maps to OpenAI function-call tools.
 *  - Tool calls in `choice.message.tool_calls` map back to `LLMToolCall[]`.
 *  - Usage includes `prompt_cache_hit_tokens` → `cachedInputTokens`.
 *    Because DeepSeek reports `prompt_tokens` inclusive of cache-hit tokens,
 *    we subtract them so `inputTokens` represents only the "fresh" portion
 *    (matches the Anthropic convention used by `usage.ts`).
 *  - One retry after 2s on 429 / overloaded.
 */
import OpenAI from 'openai';
import type {
  ChatOptions,
  ChatResponse,
  LLMMessage,
  LLMToolCall,
  LLMToolDef,
} from '@lacunose/types';
import { env } from '../../lib/env.js';
import { log } from '../../lib/logger.js';

const clog = log.child('llm:deepseek');

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    if (!env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not set — cannot use deepseek provider');
    }
    _client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: env.DEEPSEEK_BASE_URL,
    });
  }
  return _client;
}

/** Translate our messages to OpenAI shape, injecting JSON-schema into system if needed. */
function translateMessages(
  messages: LLMMessage[],
  jsonSchema?: Record<string, unknown>,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const toParam = (m: LLMMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
    if (m.role === 'system') {
      return { role: 'system', content: m.content };
    }
    if (m.role === 'assistant') {
      const msg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content: m.content,
      };
      if (m.tool_calls && m.tool_calls.length > 0) {
        msg.tool_calls = m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.input) },
        }));
      }
      return msg;
    }
    if (m.role === 'tool') {
      return {
        role: 'tool',
        content: m.content,
        tool_call_id: m.tool_call_id ?? '',
      };
    }
    return { role: 'user', content: m.content };
  };
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(toParam);

  if (jsonSchema) {
    const schemaHint = `Respond with valid JSON matching this schema. No prose, no markdown fences:\n${JSON.stringify(jsonSchema)}`;
    // DeepSeek needs schema in-prompt; prepend as a system message (or append
    // to an existing leading system message).
    const first = out[0];
    if (first && first.role === 'system') {
      out[0] = { role: 'system', content: `${first.content as string}\n\n${schemaHint}` };
    } else {
      out.unshift({ role: 'system', content: schemaHint });
    }
  }
  return out;
}

function translateTools(tools: LLMToolDef[] | undefined):
  OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; code?: string };
  if (e.status === 429 || e.status === 503 || e.status === 529) return true;
  if (e.code === 'rate_limit_exceeded' || e.code === 'overloaded') return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/** DeepSeek usage shape is a superset of OpenAI's — we narrow it locally. */
interface DeepSeekUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

/**
 * Call DeepSeek's chat-completions endpoint. `concreteModel` is the resolved
 * vendor model string (e.g. "deepseek-reasoner" or "deepseek-chat").
 */
export async function chat(
  opts: ChatOptions,
  concreteModel: string,
): Promise<ChatResponse> {
  const start = Date.now();
  const messages = translateMessages(opts.messages, opts.jsonSchema);
  const tools = translateTools(opts.tools);

  const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: concreteModel,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (tools) body.tools = tools;
  // DeepSeek's `response_format: { type: 'json_object' }`:
  //   • V4 (flash + pro) supports it on both thinking and non-thinking modes.
  //   • Legacy `deepseek-reasoner` does NOT accept it (400) — keep the guard
  //     so historical re-routes / mocks pinning the legacy name still work.
  //   • Requires the output to be a JSON OBJECT (not a bare array).
  // Our callers request `{type: 'array'}` for map/reduce outputs — we skip
  // response_format when either condition applies and rely on the
  // system-prompt instructions + zod validation on our side.
  const isLegacyReasoner = /^deepseek-reasoner$/i.test(concreteModel);
  const schemaIsArray =
    opts.jsonSchema && (opts.jsonSchema as { type?: string }).type === 'array';
  if (opts.jsonSchema && !isLegacyReasoner && !schemaIsArray) {
    body.response_format = { type: 'json_object' };
  }

  const doCall = async () => {
    return client().chat.completions.create(body, { signal: opts.signal });
  };

  let raw: OpenAI.Chat.Completions.ChatCompletion;
  try {
    raw = await doCall();
  } catch (e) {
    if (isRetryable(e)) {
      clog.warn('retryable error, retrying in 2s', { error: (e as Error).message });
      await sleep(2000);
      try {
        raw = await doCall();
      } catch (e2) {
        throw new Error(`deepseek chat failed after retry: ${(e2 as Error).message}`);
      }
    } else {
      throw new Error(`deepseek chat failed: ${(e as Error).message}`);
    }
  }

  const choice = raw.choices[0];
  if (!choice) {
    throw new Error('deepseek chat returned no choices');
  }

  const content = choice.message.content ?? '';
  const toolCalls: LLMToolCall[] = [];
  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      if (tc.type !== 'function') continue;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
      } catch {
        // Keep raw string under a conventional key if the model returned malformed JSON.
        parsed = { __raw: tc.function.arguments };
      }
      toolCalls.push({ id: tc.id, name: tc.function.name, input: parsed });
    }
  }

  const usage = (raw.usage ?? {}) as DeepSeekUsage;
  const totalIn = usage.prompt_tokens ?? 0;
  const cachedIn = usage.prompt_cache_hit_tokens ?? 0;
  // Normalize so "inputTokens" == fresh input only (matches usage.ts cost model).
  const freshIn = Math.max(0, totalIn - cachedIn);
  const outputTokens = usage.completion_tokens ?? 0;
  const latencyMs = Date.now() - start;

  clog.info('chat', {
    tier: opts.model,
    model: concreteModel,
    latencyMs,
    inputTokens: freshIn,
    outputTokens,
    cachedInputTokens: cachedIn,
    toolCalls: toolCalls.length,
  });

  const response: ChatResponse = {
    content,
    usage: {
      inputTokens: freshIn,
      outputTokens,
      ...(cachedIn > 0 ? { cachedInputTokens: cachedIn } : {}),
    },
    provider: 'deepseek',
    model: concreteModel,
    latencyMs,
  };
  if (toolCalls.length > 0) response.toolCalls = toolCalls;
  return response;
}
