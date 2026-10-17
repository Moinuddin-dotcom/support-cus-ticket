export interface SuggestInput {
  title: string;
  description: string;
}

/** A provider returns the model's raw structured output; validation happens in AiService. */
export interface AiProvider {
  readonly name: string;
  suggest(input: SuggestInput, signal: AbortSignal): Promise<unknown>;
}
