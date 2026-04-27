import { ChatWindow } from '../_components/ChatWindow';
import { PLATFORMS } from '../_data/leads';

const platform = PLATFORMS.find(p => p.id === 'email')!;

export default function EmailPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#3B82F6" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M2 7l10 7 10-7"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Email</h1>
          <span className="inline-block text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 mt-0.5">
            Not connected
          </span>
        </div>
      </div>
      <ChatWindow platform={platform} />
    </div>
  );
}
