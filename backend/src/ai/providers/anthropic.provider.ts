import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { buildUserPrompt, ModelSuggestionSchema, SYSTEM_PROMPT } from '../ai.schema';
import { AiProvider, SuggestInput } from './ai-provider';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
    timeoutMs: number,
  ) {
    // Retries are disabled: the caller has a hard timeout and a safe fallback instead.
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  }

  async suggest(input: SuggestInput, signal: AbortSignal): Promise<unknown> {
    const response = await this.client.messages.parse(
      {
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(input.title, input.description) }],
        // Simple classification: low effort keeps latency and cost down.
        output_config: { effort: 'low', format: zodOutputFormat(ModelSuggestionSchema) },
      },
      { signal },
    );
    if (response.stop_reason === 'refusal') {
      throw new Error('Model declined to classify the ticket');
    }
    if (!response.parsed_output) {
      throw new Error(`No structured output (stop_reason=${response.stop_reason})`);
    }
    return response.parsed_output;
  }
}
