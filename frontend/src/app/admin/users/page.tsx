'use client';

import { useState, type FormEvent } from 'react';
import { RoleBadge } from '@/components/badges';
import { useSession } from '@/components/session-context';
import { Alert, Button, Card, EmptyState, Field, Input, Loading, PageHeader, Select } from '@/components/ui';
import { api, errorMessage, toQuery } from '@/lib/api';
import { formatDateTime, humanize } from '@/lib/format';
import { ROLES, type Paginated, type Role, type User } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const me = useSession();
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const query = toQuery({ role: roleFilter, page, pageSize: PAGE_SIZE });
  const { data, error, loading, reload, setData } = useApi(query, () => api.get<Paginated<User>>(`/users${query}`));

  async function updateUser(user: User, patch: Partial<Pick<User, 'role' | 'isActive'>>) {
    setSavingId(user.id);
    setRowError(null);
    try {
      const updated = await api.patch<User>(`/users/${user.id}`, patch);
      if (data) setData({ ...data, data: data.data.map((u) => (u.id === updated.id ? updated : u)) });
    } catch (err) {
      setRowError(`${user.name}: ${errorMessage(err)}`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts, change roles and deactivate users."
        actions={<Button onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Close' : 'New user'}</Button>}
      />

      {showCreate && (
        <CreateUserForm
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}

      <Card>
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <Select
            aria-label="Filter by role"
            className="sm:w-48"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | '');
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </Select>
          {data && <span className="text-sm text-slate-500">{data.meta.total} users</span>}
        </div>

        {rowError && (
          <div className="p-4">
            <Alert>{rowError}</Alert>
          </div>
        )}
        {error && (
          <div className="p-4">
            <Alert onRetry={reload}>{error}</Alert>
          </div>
        )}
        {loading && !data && <Loading label="Loading users…" />}
        {data && data.data.length === 0 && <EmptyState title="No users found" />}

        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
                {data.data.map((user) => {
                  const isMe = user.id === me.id;
                  const saving = savingId === user.id;
                  return (
                    <tr key={user.id} className={user.isActive ? undefined : 'bg-slate-50 text-slate-500'}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{user.name}</span>
                        {isMe && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                        <span className="block text-xs text-slate-500">{user.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isMe ? (
                          <RoleBadge role={user.role} />
                        ) : (
                          <Select
                            aria-label={`Role for ${user.name}`}
                            className="w-36"
                            value={user.role}
                            disabled={saving}
                            onChange={(e) => void updateUser(user, { role: e.target.value as Role })}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {humanize(r)}
                              </option>
                            ))}
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            user.isActive ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{formatDateTime(user.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {!isMe && (
                          <Button
                            variant={user.isActive ? 'secondary' : 'primary'}
                            loading={saving}
                            onClick={() => void updateUser(user, { isActive: !user.isActive })}
                          >
                            {user.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Page {data.meta.page} of {data.meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

type NewUser = { name: string; email: string; password: string; role: Role };

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [values, setValues] = useState<NewUser>({ name: '', email: '', password: '', role: 'AGENT' });
  const [errors, setErrors] = useState<Partial<Record<keyof NewUser, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (values.name.trim().length < 2) found.name = 'At least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = 'Enter a valid email';
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(values.password))
      found.password = '8+ characters with a letter and a number';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFormError(null);
    try {
      await api.post<User>('/users', { ...values, name: values.name.trim(), email: values.email.trim() });
      onCreated();
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  const set = (key: keyof NewUser, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <Card className="mb-6 p-5">
      <h2 className="text-base font-semibold text-slate-900">New user</h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
        <Field label="Name" htmlFor="new-name" error={errors.name}>
          <Input id="new-name" value={values.name} invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="new-email" error={errors.email}>
          <Input id="new-email" type="email" value={values.email} invalid={!!errors.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Temporary password" htmlFor="new-password" error={errors.password}>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            invalid={!!errors.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </Field>
        <Field label="Role" htmlFor="new-role">
          <Select id="new-role" value={values.role} onChange={(e) => set('role', e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center justify-end gap-3 sm:col-span-2 lg:col-span-4">
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <Button type="submit" loading={saving}>
            Create user
          </Button>
        </div>
      </form>
    </Card>
  );
}
