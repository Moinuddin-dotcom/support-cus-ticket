/**
 * Evaluates POST /ai/suggest classification quality against labeled tickets.
 *
 *   npm run eval                     # uses AI_PROVIDER / AI_API_KEY / AI_MODEL from env or .env
 *   npm run eval -- --file other.json
 *
 * Calls AiService directly (same prompt, schema validation and fallback as the API),
 * then prints per-ticket results and accuracy for category and priority separately.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AiService, AiSuggestion } from '../src/ai/ai.service';
import { aiSettingsFromEnv } from '../src/ai/ai.settings';

interface LabeledTicket {
  id: number;
  title: string;
  description: string;
  expectedCategory: string;
  expectedPriority: string;
}

interface EvalRow {
  id: number;
  title: string;
  expectedCategory: string;
  expectedPriority: string;
  predicted: AiSuggestion;
  categoryCorrect: boolean;
  priorityCorrect: boolean;
}

const CONCURRENCY = 4;

function percent(correct: number, total: number): string {
  return total === 0 ? 'n/a' : `${((correct / total) * 100).toFixed(1)}%`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const fileFlag = process.argv.indexOf('--file');
  const file = fileFlag > -1 ? process.argv[fileFlag + 1] : join(__dirname, 'sample-tickets.json');
  const tickets = JSON.parse(readFileSync(file, 'utf8')) as LabeledTicket[];

  const settings = aiSettingsFromEnv(process.env);
  const service = new AiService(settings);
  console.log(
    `Evaluating ${tickets.length} tickets with provider=${settings.provider} model=${settings.model || '-'}`,
  );
  if (!service.isConfigured) {
    console.warn(
      'WARNING: no AI provider configured (AI_PROVIDER/AI_API_KEY). Every prediction will be the\n' +
        'safe fallback (General / MEDIUM), so these numbers are only a trivial baseline.\n',
    );
  }

  const started = Date.now();
  const rows = await mapWithConcurrency(tickets, CONCURRENCY, async (ticket): Promise<EvalRow> => {
    const predicted = await service.suggest({
      title: ticket.title,
      description: ticket.description,
    });
    return {
      id: ticket.id,
      title: ticket.title,
      expectedCategory: ticket.expectedCategory,
      expectedPriority: ticket.expectedPriority,
      predicted,
      categoryCorrect: predicted.category === ticket.expectedCategory,
      priorityCorrect: predicted.priority === ticket.expectedPriority,
    };
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log('\n id | ok  | expected (cat / prio)         | predicted (cat / prio)        | src');
  console.log(
    '----+-----+-------------------------------+-------------------------------+---------',
  );
  for (const row of rows) {
    const mark = `${row.categoryCorrect ? 'C' : '-'}${row.priorityCorrect ? 'P' : '-'}`;
    const expected = `${row.expectedCategory} / ${row.expectedPriority}`.padEnd(29);
    const predicted = `${row.predicted.category} / ${row.predicted.priority}`.padEnd(29);
    console.log(
      `${String(row.id).padStart(3)} | ${mark.padEnd(3)} | ${expected} | ${predicted} | ${row.predicted.source}`,
    );
  }

  const total = rows.length;
  const categoryCorrect = rows.filter((row) => row.categoryCorrect).length;
  const priorityCorrect = rows.filter((row) => row.priorityCorrect).length;
  const bothCorrect = rows.filter((row) => row.categoryCorrect && row.priorityCorrect).length;
  const fallbacks = rows.filter((row) => row.predicted.source === 'fallback').length;

  console.log('\nResults');
  console.log(
    `  Category accuracy : ${categoryCorrect}/${total} = ${percent(categoryCorrect, total)}`,
  );
  console.log(
    `  Priority accuracy : ${priorityCorrect}/${total} = ${percent(priorityCorrect, total)}`,
  );
  console.log(`  Both correct      : ${bothCorrect}/${total} = ${percent(bothCorrect, total)}`);
  console.log(`  Fallbacks used    : ${fallbacks}/${total}`);
  console.log(`  Wall time         : ${seconds}s`);

  const out = join(__dirname, 'results.json');
  writeFileSync(
    out,
    JSON.stringify(
      {
        provider: settings.provider,
        model: settings.model,
        runAt: new Date().toISOString(),
        total,
        categoryAccuracy: categoryCorrect / total,
        priorityAccuracy: priorityCorrect / total,
        bothAccuracy: bothCorrect / total,
        fallbacks,
        rows,
      },
      null,
      2,
    ),
  );
  console.log(`\nDetailed results written to ${out}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
