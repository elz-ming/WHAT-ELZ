import type { Metadata } from 'next';
import { InboxTabs } from './_components/InboxTabs';

export const metadata: Metadata = { title: 'Inbox — whatelz.ai' };

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl space-y-5">
      {/* Test workspace banner */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Test workspace</span>
          {' '}— data here is isolated and capped. Not your real pipeline.
        </p>
        <button
          disabled
          className="text-xs font-medium text-blue-400 border border-blue-200 rounded px-2.5 py-1 cursor-not-allowed"
          title="Connect a real channel first"
        >
          Switch to real workspace
        </button>
      </div>

      {/* Platform tabs */}
      <InboxTabs />

      {children}
    </div>
  );
}
