import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Support Desk', template: '%s · Support Desk' },
  description: 'Create, track and resolve customer support tickets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
