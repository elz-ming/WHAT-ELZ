'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { DrawerStoreProvider, useDrawerStore } from '@/lib/shell/drawer-store';
import { NavRegistryProvider } from '@/lib/shell/nav-registry';
import { AppHeader } from './AppHeader';
import { LeftDrawer } from './LeftDrawer';
import { RightDrawer } from './RightDrawer';
import { BottomInput } from './BottomInput';

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
          <LeftDrawer />
          <RightDrawer />
          <ShellCanvas isAdmin={isAdmin}>{children}</ShellCanvas>
        </DrawerStoreProvider>
      </NavRegistryProvider>
    </ChatCtxRef.Provider>
  );
}
