import { AiService, fallbackSuggestion } from './ai.service';
import { AiSettings } from './ai.settings';
import { AiProvider } from './providers/ai-provider';

const settings: AiSettings = { provider: 'anthropic', apiKey: 'k', model: 'm', timeoutMs: 1000 };
const input = { title: 'Refund please', description: 'I was charged twice for my plan.' };

function providerReturning(impl: AiProvider['suggest']): AiProvider {
  return { name: 'fake', suggest: jest.fn(impl) };
}

describe('AiService', () => {
  it('returns validated AI output', async () => {
    const provider = providerReturning(() =>
      Promise.resolve({ category: 'Billing', priority: 'HIGH', summary: ' Double charge. ' }),
    );
    const service = new AiService(settings, provider);
    await expect(service.suggest(input)).resolves.toEqual({
      category: 'Billing',
      priority: 'HIGH',
      summary: 'Double charge.',
      source: 'ai',
    });
  });

  it.each([
    ['an unknown category', { category: 'Sales', priority: 'HIGH', summary: 'x' }],
    ['an unknown priority', { category: 'Billing', priority: 'URGENT', summary: 'x' }],
    ['an empty summary', { category: 'Billing', priority: 'LOW', summary: '   ' }],
    ['a non-object', 'Billing'],
  ])('falls back when the model returns %s', async (_label, raw) => {
    const service = new AiService(
      settings,
      providerReturning(() => Promise.resolve(raw)),
    );
    await expect(service.suggest(input)).resolves.toMatchObject({
      category: 'General',
      priority: 'MEDIUM',
      source: 'fallback',
    });
  });

  it('falls back when the provider throws', async () => {
    const service = new AiService(
      settings,
      providerReturning(() => Promise.reject(new Error('HTTP 500'))),
    );
    await expect(service.suggest(input)).resolves.toMatchObject({ source: 'fallback' });
  });

  it('falls back when the provider times out', async () => {
    jest.useFakeTimers();
    try {
      const provider = providerReturning(
        (_input, signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );
      const service = new AiService(settings, provider);
      const pending = service.suggest(input);
      jest.advanceTimersByTime(settings.timeoutMs + 1);
      await expect(pending).resolves.toMatchObject({ source: 'fallback' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses the fallback without calling anything when no provider is configured', async () => {
    const service = new AiService({ ...settings, provider: 'none', apiKey: '' });
    expect(service.isConfigured).toBe(false);
    await expect(service.suggest(input)).resolves.toMatchObject({ source: 'fallback' });
  });

  it('builds a short fallback summary from the description', () => {
    const long = { title: 't', description: 'word '.repeat(100) };
    const result = fallbackSuggestion(long);
    expect(result.summary.length).toBeLessThanOrEqual(160);
    expect(result.summary.endsWith('…')).toBe(true);
  });
});
