/**
 * Runtime verification of configured LLM model IDs.
 *
 * Called once at worker/edge-fn boot. Logs a warning (doesn't crash) when a
 * configured model isn't in the vendor's catalog — this catches the "Opus
 * 4.7 model name drift" class of bug at startup instead of on the first
 * analysis. For `anthropic` / `anthropic-allopus` we hit /v1/models with
 * the configured key. For `deepseek` we rely on the `openai`-compatible
 * /v1/models which DeepSeek also implements.
 */
import { fetch } from 'undici';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';

const logger = log.child('llm:verify');

async function fetchAnthropicModels(): Promise<string[] | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!res.ok) {
      logger.warn('anthropic_models_list_failed', { status: res.status });
      return null;
    }
    const body = (await res.json()) as { data?: Array<{ id: string }> };
    return (body.data ?? []).map((m) => m.id);
  } catch (err) {
    logger.warn('anthropic_models_network_error', { err: (err as Error).message });
    return null;
  }
}

async function fetchDeepseekModels(): Promise<string[] | null> {
  if (!env.DEEPSEEK_API_KEY) return null;
  try {
    const res = await fetch(`${env.DEEPSEEK_BASE_URL}/v1/models`, {
      headers: { authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
    });
    if (!res.ok) {
      logger.warn('deepseek_models_list_failed', { status: res.status });
      return null;
    }
    const body = (await res.json()) as { data?: Array<{ id: string }> };
    return (body.data ?? []).map((m) => m.id);
  } catch (err) {
    logger.warn('deepseek_models_network_error', { err: (err as Error).message });
    return null;
  }
}

/**
 * Best-effort verification. Runs in the background; never throws.
 * Warns loudly if a configured model is unknown so ops can swap the
 * env var before gap analyses start failing at the first LLM call.
 */
export async function verifyModelsOnBoot(): Promise<void> {
  const provider = env.LLM_PROVIDER;
  if (provider === 'mock') return;

  if (provider === 'anthropic' || provider === 'anthropic-allopus') {
    const ids = await fetchAnthropicModels();
    if (!ids) return;
    const required = new Set([env.ANTHROPIC_OPUS_MODEL, env.ANTHROPIC_HAIKU_MODEL]);
    for (const id of required) {
      if (!ids.includes(id)) {
        logger.warn('configured_model_not_found', {
          provider,
          model: id,
          hint: 'Override ANTHROPIC_OPUS_MODEL / ANTHROPIC_HAIKU_MODEL to a valid id from Anthropic /v1/models',
          availableSample: ids.slice(0, 10),
        });
      } else {
        logger.info('model_ok', { provider, model: id });
      }
    }
    return;
  }

  if (provider === 'deepseek') {
    const ids = await fetchDeepseekModels();
    if (!ids) return;
    for (const id of ['deepseek-reasoner', 'deepseek-chat']) {
      if (!ids.includes(id)) {
        logger.warn('configured_model_not_found', { provider, model: id });
      } else {
        logger.info('model_ok', { provider, model: id });
      }
    }
  }
}
