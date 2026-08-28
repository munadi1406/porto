"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

/**
 * WsProvider — single Socket.IO connection per browser tab.
 *
 * Problem (Sprint 4): `LiveIhsgChip` and `useMarketData` each called `useWebSocket({autoConnect:true})`
 * → 2 parallel Socket.IO connections per tab (one for `^JKSE`, one for ~40 market tickers).
 *
 * Solution: call `useWebSocket` once here at the root layout and share via React Context.
 * All consumers call `useWsContext()` and reuse the same socket/underlying `subscribedTickers` set.
 *
 * Backward-compat / opt-in: if a component renders outside <WsProvider> (e.g. in tests,
 * Storybook, or before migration) `useWsContext()` returns null. Consumers should fall back
 * to an isolated `useWebSocket` instance. That keeps the dual-WS behaviour intact until
 * the provider is mounted, so no breaking change.
 *
 * Migration:
 *   // before (isolated)
 *   const { prices, connected, subscribe } = useWebSocket({autoConnect:true});
 *
 *   // after (shared, with fallback)
 *   const ctx = useWsContext();
 *   const fallback = useWebSocket({ autoConnect: ctx ? false : true });
 *   const { prices, connected, subscribe } = ctx ?? fallback;
 *
 * Or use the helper `useSharedWs()` below which encapsulates the above pattern.
 *
 * Layout wiring (src/app/layout.tsx):
 *   import { WsProvider } from "@/components/WsProvider";
 *   <QueryProvider>
 *     <WsProvider>
 *       <TooltipProvider> ... </TooltipProvider>
 *     </WsProvider>
 *   </QueryProvider>
 */

type WsContextValue = ReturnType<typeof useWebSocket>;

const WsContext = createContext<WsContextValue | null>(null);

export function WsProvider({ children }: { children: ReactNode }) {
  const ws = useWebSocket({ autoConnect: true });
  return <WsContext.Provider value={ws}>{children}</WsContext.Provider>;
}

/** Returns shared WS value, or null if no provider above (opt-in). */
export function useWsContext(): WsContextValue | null {
  return useContext(WsContext);
}

/**
 * Convenience hook: returns shared WS if inside <WsProvider>, otherwise
 * creates an isolated connection that autoConnects. Keeps backward compat
 * while allowing gradual migration to the single-socket model.
 *
 * Note: this hook always calls `useWebSocket` (rules of hooks) but disables
 * autoConnect when a shared context exists to avoid a second socket.
 */
export function useSharedWs(): WsContextValue {
  const ctx = useWsContext();
  // Always call hook; suppress connection when shared context is available.
  const fallback = useWebSocket({ autoConnect: ctx ? false : true });
  return ctx ?? fallback;
}
