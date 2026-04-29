'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useRouter, usePathname } from 'next/navigation';
import { DrawerStoreProvider, useDrawerStore } from '@/lib/shell/drawer-store';
import { NavRegistryProvider } from '@/lib/shell/nav-registry';
import { useIsDesktop } from '@/lib/shell/use-is-desktop';
import { navigationMap } from '@/lib/navigation-map';
import { supabase } from '@/lib/supabase-client';
import { AppHeader } from './AppHeader';
import { LeftDrawer } from './LeftDrawer';
import { RightDrawer } from './RightDrawer';
import { BottomInput } from './BottomInput';
import { DeviceTracker } from './DeviceTracker';

// ── Nav queue types ───────────────────────────────────────────────────────────

type NavStep =
  | { type: 'push'; route: string }
  | { type: 'scroll'; id: string }
  | { type: 'blink-heading'; id: string }
  | { type: 'blink-row'; dataAttr: string; dataValue: string; destRoute: string }
  | { type: 'delay'; ms: number };

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

// ── Specific hackathon name patterns → search query ───────────────────────────

const HACKATHON_PATTERNS: Array<{ re: RegExp; q: string }> = [
  { re: /hackomania/i,         q: 'hackomania'    },
  { re: /pan.?sea/i,           q: 'pan-sea'       },
  { re: /singhacks|sing hacks/i, q: 'singhacks'  },
  { re: /youth.?finance/i,     q: 'youth finance' },
  { re: /asmi/i,               q: 'asmi'          },
];

async function lookupHackathonRoute(text: string): Promise<string | null> {
  for (const { re, q } of HACKATHON_PATTERNS) {
    if (!re.test(text)) continue;
    const { data } = await supabase
      .from('hackathons')
      .select('slug')
      .ilike('name', `%${q}%`)
      .eq('published', true)
      .limit(1)
      .single();
    if (data?.slug) return data.slug;
  }
  return null;
}

// ── General topic detection ───────────────────────────────────────────────────

function detectTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/hackathon|hackomania|pan.?sea|singhack|coding.{0,20}win|win.{0,20}hack/.test(t)) return 'hackathons';
  if (/internship|career|prudential|setel|asiaverify|work.{0,15}experience|experience.{0,15}work/.test(t)) return 'career';
  if (/\batlas\b|doublelead|double.?lead|\bproject/.test(t)) return 'projects';
  if (/contact|email.{0,15}edmund|reach.{0,15}edmund|get.{0,15}touch/.test(t)) return 'contact';
  if (/youtube|instagram|\bmedium\b|linkedin|channel/.test(t)) return 'channels';
  return null;
}

// ── buildSteps — constructs the nav queue ─────────────────────────────────────

function buildSteps(
  nav: { target: string; mode: string; slug?: string },
  currentPath: string,
  dest: { scrollId: string; route: string },
): NavStep[] {
  const isHome = currentPath === '/';
  const isListPage = currentPath === dest.route;
  const steps: NavStep[] = [];

  if (nav.mode === 'section') {
    if (isHome) {
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
    } else {
      steps.push({ type: 'push', route: '/' });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
    }
  } else if (nav.mode === 'list') {
    if (isHome) {
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
    } else if (isListPage) {
      // Already on list page — nothing to do
    } else {
      steps.push({ type: 'push', route: '/' });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
    }
  } else if (nav.mode === 'item' && nav.slug) {
    const detailRoute = `${dest.route}/${nav.slug}`;
    const dataAttr = nav.target === 'hackathons' ? 'data-hackathon-slug' : 'data-career-slug';

    if (isListPage) {
      steps.push({ type: 'blink-row', dataAttr, dataValue: nav.slug, destRoute: detailRoute });
    } else if (isHome) {
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'blink-row', dataAttr, dataValue: nav.slug, destRoute: detailRoute });
    } else {
      steps.push({ type: 'push', route: '/' });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'scroll', id: dest.scrollId });
      steps.push({ type: 'blink-heading', id: `${dest.scrollId}-heading` });
      steps.push({ type: 'delay', ms: 1200 });
      steps.push({ type: 'push', route: dest.route });
      steps.push({ type: 'delay', ms: 400 });
      steps.push({ type: 'blink-row', dataAttr, dataValue: nav.slug, destRoute: detailRoute });
    }
  }

  return steps;
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

// ── NavHandler — detects tool results and kicks off nav queue ─────────────────

function NavHandler({ startNav }: { startNav: (steps: NavStep[]) => void }) {
  const { messages, status } = useChatContext();
  const { dispatch } = useDrawerStore();
  const pathname = usePathname();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'ready') return;

    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length === 0) return;
    const latest = assistantMsgs[assistantMsgs.length - 1];
    if (firedRef.current.has(latest.id)) return;
    firedRef.current.add(latest.id);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    (async () => {
      // 1. Explicit navigate_to tool result
      type NavToolOutput = { action: string; target: string; mode?: string; slug?: string };
      let toolResult: NavToolOutput | null = null;
      for (const part of latest.parts) {
        if (part.type !== 'dynamic-tool') continue;
        const p = part as { toolName: string; state: string; output?: unknown };
        if (p.toolName !== 'navigate_to' || p.state !== 'output-available') continue;
        toolResult = p.output as NavToolOutput;
        break;
      }

      if (toolResult && toolResult.action === 'navigate') {
        const dest = navigationMap[toolResult.target];
        if (!dest) return;
        if (isMobile) dispatch({ type: 'CLOSE_RIGHT' });
        const steps = buildSteps(
          { target: toolResult.target, mode: toolResult.mode ?? 'section', slug: toolResult.slug },
          pathname,
          dest,
        );
        if (steps.length) startNav(steps);
        return;
      }

      const text = latest.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text).join(' ');

      // 2. Fallback: specific hackathon name lookup
      const hackathonSlug = await lookupHackathonRoute(text);
      if (hackathonSlug) {
        const dest = navigationMap['hackathons'];
        if (isMobile) dispatch({ type: 'CLOSE_RIGHT' });
        const steps = buildSteps(
          { target: 'hackathons', mode: 'item', slug: hackathonSlug },
          pathname,
          dest,
        );
        if (steps.length) startNav(steps);
        return;
      }

      // 3. Fallback: general topic detection
      const topic = detectTopic(text);
      if (topic) {
        const dest = navigationMap[topic];
        if (!dest) return;
        if (isMobile) dispatch({ type: 'CLOSE_RIGHT' });
        const steps = buildSteps(
          { target: topic, mode: 'section', slug: undefined },
          pathname,
          dest,
        );
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
