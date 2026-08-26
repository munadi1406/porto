"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ClientMessage, ServerMessage, PriceData } from "@/lib/ws-types";

interface UseWebSocketOptions {
    autoConnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
    connected: boolean;
    prices: Record<string, PriceData>;
    marketOpen: boolean;
    subscribe: (tickers: string[]) => void;
    unsubscribe: (tickers: string[]) => void;
    reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
    const {
        autoConnect = true,
        reconnectInterval = 3000,
        maxReconnectAttempts = 10,
    } = options;

    const [connected, setConnected] = useState(false);
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [marketOpen, setMarketOpen] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectCount = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const subscribedTickers = useRef<Set<string>>(new Set());

    const getWsUrl = useCallback(() => {
        if (typeof window === "undefined") return "";
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.host}/ws`;
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const url = getWsUrl();
        if (!url) return;

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[WS] Connected");
                setConnected(true);
                reconnectCount.current = 0;

                // Re-subscribe to previous tickers
                if (subscribedTickers.current.size > 0) {
                    const msg: ClientMessage = {
                        type: "subscribe",
                        tickers: Array.from(subscribedTickers.current),
                    };
                    ws.send(JSON.stringify(msg));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const msg: ServerMessage = JSON.parse(event.data);
                    switch (msg.type) {
                        case "price_update":
                            setPrices((prev) => ({ ...prev, ...msg.data }));
                            break;
                        case "market_status":
                            setMarketOpen(msg.isOpen);
                            break;
                        case "pong":
                            break;
                        case "welcome":
                            setMarketOpen(msg.marketOpen);
                            break;
                    }
                } catch {}
            };

            ws.onclose = () => {
                console.log("[WS] Disconnected");
                setConnected(false);
                wsRef.current = null;

                // Auto-reconnect
                if (reconnectCount.current < maxReconnectAttempts) {
                    reconnectTimer.current = setTimeout(() => {
                        reconnectCount.current++;
                        connect();
                    }, reconnectInterval);
                }
            };

            ws.onerror = () => {
                // Will trigger onclose
            };
        } catch {}
    }, [getWsUrl, reconnectInterval, maxReconnectAttempts]);

    const disconnect = useCallback(() => {
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
        }
        reconnectCount.current = maxReconnectAttempts; // Prevent auto-reconnect
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, [maxReconnectAttempts]);

    const subscribe = useCallback((tickers: string[]) => {
        tickers.forEach((t) => subscribedTickers.current.add(t));
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const msg: ClientMessage = { type: "subscribe", tickers };
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    const unsubscribe = useCallback((tickers: string[]) => {
        tickers.forEach((t) => subscribedTickers.current.delete(t));
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const msg: ClientMessage = { type: "unsubscribe", tickers };
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    const reconnect = useCallback(() => {
        disconnect();
        reconnectCount.current = 0;
        connect();
    }, [connect, disconnect]);

    useEffect(() => {
        if (autoConnect) connect();
        return () => disconnect();
    }, [autoConnect, connect, disconnect]);

    return { connected, prices, marketOpen, subscribe, unsubscribe, reconnect };
}
