'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useRouter, usePathname } from 'next/navigation';
import { DrawerStoreProvider, useDrawerStore } from '@/lib/shell/drawer-store';
import { NavRegistryProvider } from '@/lib/shell/nav-registry';
import { navigationMap } from '@/lib/navigation-map';
import { AppHeader } from './AppHeader';
import { LeftDrawer } from './LeftDrawer';
import { RightDrawer } from './RightDrawer';
import { BottomInput } from './BottomInput';
import { DeviceTracker } from './DeviceTracker';

// ── Chat context ──────────────────────────────────────────────────────────────

type ChatCtx = {
  messages: UIMessage[];
  status: string;
  stop: () => void;
  sendMessage: (opts: { text: string }) => void;
  input: string;
  setInput: (v: string) => void;
};

const ChatCtxRef = createContext<ChatCtx | null>(null);

export function useChatContext(): ChatCtx {
  const ctx = useContext(ChatCtxRef);
  if (!ctx) throw new Error('useChatContext must be inside ShellProvider');
  return ctx;
}

// ── Pulse highlight ───────────────────────────────────────────────────────────

function pulseElement(el: HTMLElement) {
  const accent = 'rgba(250,204,21,0.7)';
  el.style.transition = 'box-shadow 300ms ease';
  el.style.boxShadow = `0 0 0 3px ${accent}`;
  setTimeout(() => { el.style.boxShadow = '0 0 0 0px transparent'; }, 300);
  setTimeout(() => { el.style.boxShadow = `0 0 0 3px ${accent}`; }, 600);
  setTimeout(() => {
    el.style.boxShadow = '0 0 0 0px transparent';
    setTimeout(() => { el.style.transition = ''; el.style.boxShadow = ''; }, 310);
  }, 900);
}

// ── NavHandler — fires navigate_to tool results after stream finishes ─────────

function NavHandler() {
  const { messages, status } = useChatContext();
  const { dispatch } = useDrawerStore();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'ready') return;

    // Scan all assistant messages for unfired navigate_to results
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      for (const part of msg.parts) {
        if (
          part.type !== 'dynamic-tool' ||
          (part as { toolName?: string }).toolName !== 'navigate_to'
        ) continue;

        const p = part as { type: 'dynamic-tool'; toolName: string; toolCallId: string; state: string; output?: unknown };
        if (p.state !== 'output-available') continue;
        if (firedRef.current.has(p.toolCallId)) continue;

        const result = p.output as { action: string; target: string } | undefined;
        if (!result || result.action !== 'navigate') continue;

        const dest = navigationMap[result.target];
        if (!dest) continue;

        firedRef.current.add(p.toolCallId);

        const doNavigate = () => {
          if (pathname === '/') {
            const el = document.getElementById(dest.scrollId);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setTimeout(() => pulseElement(el), 400);
            }
          } else {
            router.push(dest.route);
          }
        };

        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          dispatch({ type: 'CLOSE_RIGHT' });
          setTimeout(doNavigate, 220);
        } else {
          doNavigate();
        }
      }
    }
  }, [status, messages, dispatch, router, pathname]);

  return null;
}

// ── ShellCanvas — reads drawer state and shifts the content area ──────────────

function ShellCanvas({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  const { state } = useDrawerStore();
  const ml = state.left ? 256 : 0;
  const mr = state.right ? 360 : 0;

  return (
    <>
      <AppHeader isAdmin={isAdmin} />

      {/* Content viewport: fills space below header, shifts with drawers */}
      <div
        className="fixed overflow-y-auto pb-24"
        style={{ top: 56, bottom: 0, left: ml, right: mr, transition: 'left 200ms, right 200ms' }}
      >
        {children}
      </div>

      <BottomInput />
      {!isAdmin && <DeviceTracker />}
      <NavHandler />
    </>
  );
}

// ── ShellProvider ─────────────────────────────────────────────────────────────

interface Props {
  isAdmin: boolean;
  children: ReactNode;
}

export function ShellProvider({ isAdmin, children }: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), []);
  const { messages, sendMessage, status, stop } = useChat({ transport });
  const [input, setInput] = useState('');

  return (
    <ChatCtxRef.Provider value={{ messages, sendMessage, status, stop, input, setInput }}>
      <NavRegistryProvider>
        <DrawerStoreProvider>
          <LeftDrawer isAdmin={isAdmin} />
          <RightDrawer />
          <ShellCanvas isAdmin={isAdmin}>{children}</ShellCanvas>
        </DrawerStoreProvider>
      </NavRegistryProvider>
    </ChatCtxRef.Provider>
  );
}
