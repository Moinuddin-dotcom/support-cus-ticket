'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { humanize } from '@/lib/format';
import { CATEGORIES, PRIORITIES, type AiSuggestion, type Category, type Priority, type Ticket } from '@/lib/types';
import { Alert, Button, Card, Field, Input, Select, Textarea } from './ui';

interface FormState {
  title: string;
  description: string;
  category: Category | '';
  priority: Priority | '';
  summary: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const LIMITS = { title: [5, 200], description: [10, 5000], summary: [0, 300] } as const;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  if (title.length < LIMITS.title[0]) errors.title = `Title must be at least ${LIMITS.title[0]} characters`;
  else if (title.length > LIMITS.title[1]) errors.title = `Title must be at most ${LIMITS.title[1]} characters`;
  if (description.length < LIMITS.description[0])
    errors.description = `Description must be at least ${LIMITS.description[0]} characters`;
  if (!form.category) errors.category = 'Choose a category';
  if (!form.priority) errors.priority = 'Choose a priority';
  if (form.summary.trim().length > LIMITS.summary[1]) errors.summary = `Summary must be at most ${LIMITS.summary[1]} characters`;
  return errors;
}

export function CreateTicketForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ title: '', description: '', category: '', priority: '', summary: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const canSuggest = form.title.trim().length >= 3 && form.description.trim().length >= 10;

  async function suggest() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const result = await api.post<AiSuggestion>('/ai/suggest', {
        title: form.title.trim(),
        description: form.description.trim(),
      });
      setSuggestion(result);
      // Fill the fields; the user can still change every one of them before submitting.
      setForm((prev) => ({ ...prev, category: result.category, priority: result.priority, summary: result.summary }));
      setErrors((prev) => ({ ...prev, category: undefined, priority: undefined, summary: undefined }));
    } catch (err) {
      setSuggestError(errorMessage(err));
    } finally {
      setSuggesting(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const ticket = await api.post<Ticket>('/tickets', {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        summary: form.summary.trim() || undefined,
      });
      router.push(`/customer/tickets/${ticket.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError && err.details.length > 1 ? err.details.join('. ') : errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input
            id="title"
            value={form.title}
            maxLength={LIMITS.title[1]}
            placeholder="e.g. I was charged twice this month"
            invalid={!!errors.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description} hint="What happened, what you expected, and any error messages.">
          <Textarea
            id="description"
            rows={6}
            value={form.description}
            maxLength={LIMITS.description[1]}
            invalid={!!errors.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Not sure how to categorise it?</p>
              <p className="text-xs text-slate-500">
                AI can suggest a category, priority and summary. Suggestions can be wrong — review and edit them before
                submitting.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={suggest}
              loading={suggesting}
              disabled={!canSuggest}
              title={canSuggest ? undefined : 'Write a title and description first'}
              className="shrink-0 whitespace-nowrap"
            >
              ✨ Suggest with AI
            </Button>
          </div>
          {suggestion?.source === 'ai' && (
            <p className="mt-3 text-xs text-indigo-700">Suggestion applied below. You can change any field.</p>
          )}
          {suggestion?.source === 'fallback' && (
            <div className="mt-3">
              <Alert tone="warning">The AI service is unavailable right now, so default values were filled in. Please adjust them.</Alert>
            </div>
          )}
          {suggestError && (
            <div className="mt-3">
              <Alert>{suggestError}</Alert>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" error={errors.category}>
            <Select id="category" value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="priority" error={errors.priority} hint="High: 4h SLA · Medium: 24h · Low: 48h">
            <Select id="priority" value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              <option value="" disabled>
                Select a priority
              </option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {humanize(p)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Summary (optional)" htmlFor="summary" error={errors.summary} hint="One or two lines for the support agent.">
          <Textarea
            id="summary"
            rows={2}
            value={form.summary}
            maxLength={LIMITS.summary[1]}
            invalid={!!errors.summary}
            onChange={(e) => set('summary', e.target.value)}
          />
        </Field>

        {submitError && <Alert>{submitError}</Alert>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create ticket
          </Button>
        </div>
      </form>
    </Card>
  );
}
