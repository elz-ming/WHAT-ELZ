'use client';

import { useEffect, useRef } from 'react';
import { useDrawerStore } from '@/lib/shell/drawer-store';
import { useChatContext } from './ShellProvider';

export function RightDrawer() {
  const { state, dispatch } = useDrawerStore();
  const { messages, status } = useChatContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <aside
      className={`fixed top-0 right-0 z-30 flex h-screen w-[360px] flex-col border-l border-zinc-200 bg-[var(--background)] transition-transform duration-200 ${
        state.right ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-label="Chat"
    >
      {/* Top spacer matches header */}
      <div className="h-14 shrink-0 border-b border-zinc-200 flex items-center justify-between px-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Ask Edmund</p>
          <p className="font-mono text-[10px] text-zinc-400 mt-0.5">Groq · streaming · 20/hr</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'CLOSE_RIGHT' })}
          aria-label="Close chat"
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
        {messages.length === 0 && status !== 'submitted' && status !== 'streaming' ? (
          <p className="text-sm text-zinc-400 mt-8 text-center">Ask me anything about Edmund.</p>
        ) : (
          messages.map(m => {
            const text = (m.parts as Array<{ type: string; text?: string }>)
              .filter(p => p.type === 'text')
              .map(p => p.text ?? '')
              .join('');
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  {isUser ? 'You' : 'Site'}
                </span>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-zinc-900' : 'text-zinc-700'}`}>
                  {text || <span className="text-zinc-400">…</span>}
                </p>
              </div>
            );
          })
        )}
        {status === 'submitted' && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>
    </aside>
  );
}
