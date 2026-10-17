export type AiProviderName = 'anthropic' | 'openai' | 'none';

export interface AiSettings {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export const AI_SETTINGS = Symbol('AI_SETTINGS');

export const DEFAULT_MODELS: Record<Exclude<AiProviderName, 'none'>, string> = {
  anthropic: 'claude-opus-5-5',
  openai: 'gpt-4o-mini',
};

/** Builds settings from raw env values (used by the Nest module and the standalone eval script). */
export function aiSettingsFromEnv(env: Record<string, string | undefined>): AiSettings {
  const raw = (env.AI_PROVIDER ?? 'none').toLowerCase();
  const provider: AiProviderName = raw === 'anthropic' || raw === 'openai' ? raw : 'none';
  const timeout = Number(env.AI_TIMEOUT_MS);
  return {
    provider,
    apiKey: env.AI_API_KEY ?? '',
    model: env.AI_MODEL || (provider === 'none' ? '' : DEFAULT_MODELS[provider]),
    timeoutMs: Number.isFinite(timeout) && timeout >= 1000 ? timeout : 15_000,
  };
}
