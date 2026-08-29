import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ReachInbox.ai - Autonomous Email Job Scheduler',
  description: 'Production-grade email scheduler dashboard built with Next.js, Express.js, BullMQ, Redis, PostgreSQL, and Elasticsearch.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
