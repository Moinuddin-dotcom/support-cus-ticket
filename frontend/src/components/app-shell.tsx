'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import type { Role, SessionUser } from '@/lib/types';
import { RoleBadge } from './badges';
import { SessionProvider } from './session-context';
import { cx } from './ui';

const NAV: Record<Role, { href: string; label: string }[]> = {
  CUSTOMER: [
    { href: '/customer/tickets', label: 'My tickets' },
    { href: '/customer/tickets/new', label: 'New ticket' },
  ],
  AGENT: [{ href: '/agent/tickets', label: 'Assigned tickets' }],
  ADMIN: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/tickets', label: 'All tickets' },
    { href: '/admin/users', label: 'Users' },
  ],
};

/** The most specific nav item matching the path (so /customer/tickets/new highlights "New ticket"). */
function activeHref(pathname: string, items: { href: string }[]): string | undefined {
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const items = NAV[user.role];
  const current = activeHref(pathname, items);

  async function logout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href={items[0].href} className="flex items-center gap-2 font-bold text-slate-900">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-sm text-white">S</span>
            Support Desk
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Main">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium',
                  item.href === current
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <RoleBadge role={user.role} />
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SessionProvider value={user}>{children}</SessionProvider>
      </main>
    </div>
  );
}
