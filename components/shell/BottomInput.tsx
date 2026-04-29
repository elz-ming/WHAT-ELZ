'use client';

import { useEffect, useRef } from 'react';
import { useDrawerStore } from '@/lib/shell/drawer-store';
import { useChatContext } from './ShellProvider';
import { MAX_INPUT_CHARS } from '@/lib/chat-prompt';

export function BottomInput() {
  const { state, dispatch } = useDrawerStore();
  const { input, setInput, sendMessage, status, stop } = useChatContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = status === 'submitted' || status === 'streaming';
  const trimmed = input.trim();
  const overLimit = trimmed.length > MAX_INPUT_CHARS;
  const canSend = !busy && trimmed.length > 0 && !overLimit;

  // `/` keybinding — focus input unless already in a text field
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== '/') return;
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      dispatch({ type: 'OPEN_RIGHT' });
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dispatch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    sendMessage({ text: trimmed });
    setInput('');
    dispatch({ type: 'OPEN_RIGHT' });
  }

  const ml = state.left ? 256 : 0;
  const mr = state.right ? 360 : 0;

  return (
    <div
      className="fixed bottom-0 z-30"
      style={{
        left: ml,
        right: mr,
        transition: 'left 200ms, right 200ms',
        background: 'linear-gradient(to top, var(--background) 60%, rgba(255,255,255,0))',
      }}
    >
      <div className="mx-auto max-w-2xl px-4 pb-4 pt-6">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 overflow-hidden border border-zinc-200 bg-white px-4 py-2"
          style={{ borderRadius: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_CHARS))}
            placeholder="Ask about Edmund… (press / to focus)"
            aria-label="Ask about Edmund"
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                <rect x="1" y="1" width="8" height="8" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-zinc-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M6 10V2M2 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
