import { buildUserPrompt, SUGGESTION_JSON_SCHEMA, SYSTEM_PROMPT } from '../ai.schema';
import { AiProvider, SuggestInput } from './ai-provider';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null; refusal?: string | null } }[];
}

/** OpenAI Chat Completions with strict JSON-schema structured output. */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async suggest(input: SuggestInput, signal: AbortSignal): Promise<unknown> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input.title, input.description) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'ticket_suggestion', strict: true, schema: SUGGESTION_JSON_SCHEMA },
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI API returned HTTP ${res.status}`);
    }
    const body = (await res.json()) as ChatCompletionResponse;
    const message = body.choices?.[0]?.message;
    if (!message?.content) {
      throw new Error(message?.refusal ? 'Model refused' : 'Empty response from OpenAI');
    }
    return JSON.parse(message.content) as unknown;
  }
}
