import { Logger } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { DEFAULT_CATEGORY, TicketCategory } from '../common/constants/categories';
import { SuggestionSchema } from './ai.schema';
import { AiSettings } from './ai.settings';
import { AiProvider, SuggestInput } from './providers/ai-provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAiProvider } from './providers/openai.provider';

export interface AiSuggestion {
  category: TicketCategory;
  priority: Priority;
  summary: string;
  /** "ai" when the model answered, "fallback" when the safe default was used. */
  source: 'ai' | 'fallback';
}

const FALLBACK_SUMMARY_LENGTH = 160;

export function createProvider(settings: AiSettings): AiProvider | null {
  if (!settings.apiKey) {
    return null;
  }
  switch (settings.provider) {
    case 'anthropic':
      return new AnthropicProvider(settings.apiKey, settings.model, settings.timeoutMs);
    case 'openai':
      return new OpenAiProvider(settings.apiKey, settings.model);
    default:
      return null;
  }
}

/** Safe default used whenever the AI is unavailable, slow, or returns something invalid. */
export function fallbackSuggestion(input: SuggestInput): AiSuggestion {
  const text = input.description.replace(/\s+/g, ' ').trim() || input.title.trim();
  const summary =
    text.length > FALLBACK_SUMMARY_LENGTH
      ? `${text.slice(0, FALLBACK_SUMMARY_LENGTH - 1).trimEnd()}…`
      : text;
  return { category: DEFAULT_CATEGORY, priority: Priority.MEDIUM, summary, source: 'fallback' };
}

export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: AiProvider | null;

  constructor(
    private readonly settings: AiSettings,
    provider?: AiProvider | null,
  ) {
    this.provider = provider === undefined ? createProvider(settings) : provider;
    if (!this.provider) {
      this.logger.warn('AI provider not configured; /ai/suggest will return safe defaults');
    }
  }

  get isConfigured(): boolean {
    return this.provider !== null;
  }

  /** Never throws: any failure (timeout, HTTP error, invalid JSON) yields the fallback. */
  async suggest(input: SuggestInput): Promise<AiSuggestion> {
    if (!this.provider) {
      return fallbackSuggestion(input);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.settings.timeoutMs);
    try {
      const raw = await this.provider.suggest(input, controller.signal);
      const parsed = SuggestionSchema.safeParse(raw);
      if (!parsed.success) {
        this.logger.warn(`AI returned invalid output: ${parsed.error.message}`);
        return fallbackSuggestion(input);
      }
      return { ...parsed.data, source: 'ai' };
    } catch (error) {
      const reason = controller.signal.aborted ? 'timed out' : String(error);
      this.logger.warn(`AI suggestion failed (${reason}); using fallback`);
      return fallbackSuggestion(input);
    } finally {
      clearTimeout(timer);
    }
  }
}
