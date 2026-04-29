'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useRouter, usePathname } from 'next/navigation';
import { DrawerStoreProvider, useDrawerStore } from '@/lib/shell/drawer-store';
import { NavRegistryProvider } from '@/lib/shell/nav-registry';
import { useIsDesktop } from '@/lib/shell/use-is-desktop';
import { type NavStep, buildSteps, detectTopic, lookupHackathonRoute, lookupCareerRoute } from '@/lib/shell/nav-intent';
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
  isNavigating: boolean;
  startNav: (steps: NavStep[]) => void;
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

// ── blinkRow ──────────────────────────────────────────────────────────────────

function blinkRowEl(el: HTMLElement, onDone: () => void) {
  const flash = 'rgba(250,204,21,0.35)';
  el.style.transition = 'background-color 200ms ease';
  el.style.backgroundColor = flash;
  setTimeout(() => { el.style.backgroundColor = ''; }, 300);
  setTimeout(() => { el.style.backgroundColor = flash; }, 600);
  setTimeout(() => {
    el.style.backgroundColor = '';
    el.style.transition = '';
    onDone();
  }, 1000);
}

// ── processSteps — recursive timer chain, no React state needed ──────────────

function processSteps(
  steps: NavStep[],
  router: ReturnType<typeof useRouter>,
  onDone: () => void,
) {
  if (steps.length === 0) { onDone(); return; }
  const [head, ...tail] = steps;
  const next = () => processSteps(tail, router, onDone);

  switch (head.type) {
    case 'push':
      router.push(head.route);
      setTimeout(next, 500);
      break;
    case 'scroll': {
      const el = document.getElementById(head.id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(next, 800);
      break;
    }
    case 'blink-heading': {
      const el = document.getElementById(head.id);
      if (el) pulseElement(el);
      setTimeout(next, 1000);
      break;
    }
    case 'blink-row': {
      const el = document.querySelector<HTMLElement>(`[${head.dataAttr}="${head.dataValue}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => blinkRowEl(el, () => { router.push(head.destRoute); onDone(); }), 400);
      } else {
        router.push(head.destRoute);
        onDone();
      }
      return; // terminal — don't call next
    }
    case 'delay':
      setTimeout(next, head.ms);
      break;
  }
}

// ── useNavQueue ───────────────────────────────────────────────────────────────

function useNavQueue() {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const startNav = useCallback((s: NavStep[]) => {
    if (s.length === 0) return;
    setIsNavigating(true);
    processSteps(s, router, () => setIsNavigating(false));
  }, [router]);

  return { isNavigating, startNav };
}

// ── NavHandler — fires after AI response, reads user message for intent ────────

function NavHandler({ startNav }: { startNav: (steps: NavStep[]) => void }) {
  const { messages, status } = useChatContext();
  const { dispatch } = useDrawerStore();
  const pathname = usePathname();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'ready') return;

    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length === 0) return;
    const latestAssistant = assistantMsgs[assistantMsgs.length - 1];
    if (firedRef.current.has(latestAssistant.id)) return;
    firedRef.current.add(latestAssistant.id);

    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;
    const latestUser = userMsgs[userMsgs.length - 1];
    const text = latestUser.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text).join(' ');

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    (async () => {
      const hackathonSlug = await lookupHackathonRoute(text);
      if (hackathonSlug) {
        const dest = navigationMap['hackathons'];
        if (isMobile) dispatch({ type: 'CLOSE_RIGHT' });
        const steps = buildSteps({ target: 'hackathons', mode: 'item', slug: hackathonSlug }, pathname, dest);
        if (steps.length) startNav(steps);
        return;
      }

      const careerSlug = await lookupCareerRoute(text);
      if (careerSlug) {
        const dest = navigationMap['career'];
        if (isMobile) dispatch({ type: 'CLOSE_RIGHT' });
        const steps = buildSteps({ target: 'career', mode: 'item', slug: careerSlug }, pathname, dest);
        if (steps.length) startNav(steps);
        return;
      }

      const topic = detectTopic(text);
      if (topic) {
        const dest = navigationMap[topic];
        if (!dest) return;
        if (isMobile) dispatch({ type: 'CLOSE_RIGHT' });
        const steps = buildSteps({ target: topic, mode: 'list', slug: undefined }, pathname, dest);
        if (steps.length) startNav(steps);
      }
    })();
  }, [status, messages, pathname, dispatch, startNav]);

  return null;
}

// ── ShellCanvas — reads drawer state and shifts the content area ──────────────

function ShellCanvas({ isAdmin, startNav, children }: { isAdmin: boolean; startNav: (steps: NavStep[]) => void; children: ReactNode }) {
  const { state } = useDrawerStore();
  const isDesktop = useIsDesktop();
  const ml = isDesktop && state.left ? 256 : 0;
  const mr = isDesktop && state.right ? 360 : 0;

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
      <NavHandler startNav={startNav} />
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
  const { isNavigating, startNav } = useNavQueue();

  return (
    <ChatCtxRef.Provider value={{ messages, sendMessage, status, stop, input, setInput, isNavigating, startNav }}>
      <NavRegistryProvider>
        <DrawerStoreProvider>
          <LeftDrawer isAdmin={isAdmin} />
          <RightDrawer />
          <ShellCanvas isAdmin={isAdmin} startNav={startNav}>{children}</ShellCanvas>
        </DrawerStoreProvider>
      </NavRegistryProvider>
    </ChatCtxRef.Provider>
  );
}
