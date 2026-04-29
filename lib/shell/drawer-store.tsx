'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';

type State = { left: boolean; right: boolean };

type Action =
  | { type: 'TOGGLE_LEFT';  mobile?: boolean }
  | { type: 'TOGGLE_RIGHT'; mobile?: boolean }
  | { type: 'OPEN_RIGHT' }
  | { type: 'CLOSE_LEFT' }
  | { type: 'CLOSE_RIGHT' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE_LEFT': {
      const next = !state.left;
      return { left: next, right: action.mobile && next ? false : state.right };
    }
    case 'TOGGLE_RIGHT': {
      const next = !state.right;
      return { right: next, left: action.mobile && next ? false : state.left };
    }
    case 'OPEN_RIGHT':   return { ...state, right: true };
    case 'CLOSE_LEFT':   return { ...state, left: false };
    case 'CLOSE_RIGHT':  return { ...state, right: false };
  }
}

type DrawerCtx = { state: State; dispatch: React.Dispatch<Action> };
const Ctx = createContext<DrawerCtx | null>(null);

export function DrawerStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { left: false, right: false });
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useDrawerStore(): DrawerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDrawerStore must be inside DrawerStoreProvider');
  return ctx;
}
