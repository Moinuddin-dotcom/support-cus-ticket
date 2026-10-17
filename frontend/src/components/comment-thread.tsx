'use client';

import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Comment } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { RoleBadge } from './badges';
import { Alert, Button, Card, Loading, Textarea } from './ui';

const MAX_LENGTH = 5000;

export function CommentThread({
  ticketId,
  currentUserId,
  placeholder = 'Write a comment…',
  onPosted,
}: {
  ticketId: string;
  currentUserId: string;
  placeholder?: string;
  onPosted?: () => void;
}) {
  const { data, error, loading, reload, setData } = useApi(ticketId, () =>
    api.get<Comment[]>(`/tickets/${ticketId}/comments`),
  );
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) {
      setPostError('Comment cannot be empty');
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const comment = await api.post<Comment>(`/tickets/${ticketId}/comments`, { message: text });
      setData([...(data ?? []), comment]);
      setMessage('');
      onPosted?.();
    } catch (err) {
      setPostError(errorMessage(err));
    } finally {
      setPosting(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-900">Conversation</h2>

      <div className="mt-4 space-y-4">
        {loading && !data && <Loading label="Loading comments…" />}
        {error && <Alert onRetry={reload}>{error}</Alert>}
        {data?.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
        {data?.map((comment) => {
          const mine = comment.user.id === currentUserId;
          return (
            <div key={comment.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                  mine ? 'bg-indigo-50 ring-1 ring-indigo-100' : 'bg-slate-50 ring-1 ring-slate-200'
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{mine ? 'You' : comment.user.name}</span>
                  <RoleBadge role={comment.user.role} />
                  <time className="text-xs text-slate-500" dateTime={comment.createdAt}>
                    {formatDateTime(comment.createdAt)}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words text-slate-700">{comment.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-2 border-t border-slate-100 pt-4" noValidate>
        <label htmlFor="comment" className="sr-only">
          Add a comment
        </label>
        <Textarea
          id="comment"
          rows={3}
          value={message}
          maxLength={MAX_LENGTH}
          placeholder={placeholder}
          invalid={!!postError}
          onChange={(e) => setMessage(e.target.value)}
        />
        {postError && (
          <p className="text-xs text-rose-600" role="alert">
            {postError}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={posting}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}
