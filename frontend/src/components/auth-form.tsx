'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authApi, errorMessage } from '@/lib/api';
import { ROLE_HOME, type Role } from '@/lib/types';
import { Alert, Button, Card, Field, Input } from './ui';

type Mode = 'login' | 'register';
type Values = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Values, string>>;

/** Seeded accounts (backend/src/seed/seed.ts). Set NEXT_PUBLIC_DEMO_LOGIN=false to hide the buttons. */
const DEMO_ACCOUNTS: { label: string; email: string; password: string }[] = [
  { label: 'Admin', email: 'admin@example.com', password: 'Admin123!' },
  { label: 'Agent', email: 'agent1@example.com', password: 'Agent123!' },
  { label: 'Customer', email: 'customer1@example.com', password: 'Customer123!' },
];
const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_DEMO_LOGIN !== 'false';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

function validate(mode: Mode, v: Values): Errors {
  const errors: Errors = {};
  if (mode === 'register' && v.name.trim().length < 2) errors.name = 'Enter your name (at least 2 characters)';
  if (!EMAIL.test(v.email.trim())) errors.email = 'Enter a valid email address';
  if (mode === 'login' && !v.password) errors.password = 'Enter your password';
  if (mode === 'register' && !PASSWORD.test(v.password))
    errors.password = 'Use 8+ characters with at least one letter and one number';
  return errors;
}

/** Sends the user to ?next=… when it belongs to their role's area, otherwise to their home page. */
function destinationFor(role: Role): string {
  const next = new URLSearchParams(window.location.search).get('next');
  const home = ROLE_HOME[role];
  const area = `/${home.split('/')[1]}`;
  return next && next.startsWith('/') && !next.startsWith('//') && next.startsWith(area) ? next : home;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set(key: keyof Values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function fillDemo(email: string, password: string) {
    setValues((prev) => ({ ...prev, email, password }));
    setErrors({});
    setFormError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(mode, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const email = values.email.trim();
      const { user } =
        mode === 'login'
          ? await authApi.login({ email, password: values.password })
          : await authApi.register({ name: values.name.trim(), email, password: values.password });
      router.replace(destinationFor(user.role));
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-indigo-600 text-lg font-bold text-white">S</span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{isLogin ? 'Sign in to Support Desk' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLogin ? 'Track and manage support tickets.' : 'Open tickets and follow their progress.'}
          </p>
        </div>
        <Card className="p-6">
          {isLogin && SHOW_DEMO_LOGIN && (
            <div className="mb-5 border-b border-slate-100 pb-5">
              <p className="mb-2 text-xs font-medium text-slate-500">Demo accounts: click to fill in the form</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.label}
                    type="button"
                    variant="secondary"
                    className="px-2"
                    disabled={submitting}
                    onClick={() => fillDemo(account.email, account.password)}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={submit} className="space-y-4" noValidate>
            {!isLogin && (
              <Field label="Name" htmlFor="name" error={errors.name}>
                <Input id="name" autoComplete="name" value={values.name} invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
            )}
            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={values.email}
                invalid={!!errors.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              error={errors.password}
              hint={isLogin ? undefined : 'At least 8 characters, including a letter and a number.'}
            >
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={values.password}
                invalid={!!errors.password}
                onChange={(e) => set('password', e.target.value)}
              />
            </Field>
            {formError && <Alert>{formError}</Alert>}
            <Button type="submit" loading={submitting} className="w-full">
              {isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-500">
          {isLogin ? (
            <>
              New customer?{' '}
              <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
