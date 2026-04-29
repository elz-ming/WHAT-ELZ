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

// ── Keyword → navigation target ───────────────────────────────────────────────

function detectTarget(text: string): string | null {
  const t = text.toLowerCase();
  if (/hackathon|hackomania|pan.?sea|singhack|coding.{0,20}win|win.{0,20}hack/.test(t)) return 'hackathons';
  if (/internship|career|prudential|setel|asiaverify|work.{0,15}experience|experience.{0,15}work/.test(t)) return 'career';
  if (/\batlas\b|doublelead|double.?lead|\bproject/.test(t)) return 'projects';
  if (/contact|email.{0,15}edmund|reach.{0,15}edmund|get.{0,15}touch/.test(t)) return 'contact';
  if (/youtube|instagram|\bmedium\b|linkedin|channel/.test(t)) return 'channels';
  return null;
}

// ── NavHandler — fires after stream finishes ──────────────────────────────────

function NavHandler() {
  const { messages, status } = useChatContext();
  const { dispatch } = useDrawerStore();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'ready') return;

    // Only process the latest assistant message
    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length === 0) return;
    const latest = assistantMsgs[assistantMsgs.length - 1];
    if (firedRef.current.has(latest.id)) return;

    let target: string | null = null;

    // 1. Prefer explicit navigate_to tool result
    for (const part of latest.parts) {
      if (part.type !== 'dynamic-tool') continue;
      const p = part as { toolName: string; toolCallId: string; state: string; output?: unknown };
      if (p.toolName !== 'navigate_to' || p.state !== 'output-available') continue;
      const result = p.output as { action: string; target: string } | undefined;
      if (result?.action === 'navigate' && navigationMap[result.target]) {
        target = result.target;
        break;
      }
    }

    // 2. Fallback: keyword detection on the response text
    if (!target) {
      const text = latest.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join(' ');
      target = detectTarget(text);
    }

    if (!target) return;

    firedRef.current.add(latest.id);

    const dest = navigationMap[target];
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
