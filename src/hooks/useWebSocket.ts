"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
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
    const { autoConnect = true } = options;
    const [connected, setConnected] = useState(false);
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [marketOpen, setMarketOpen] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const subscribedTickers = useRef<Set<string>>(new Set());

    const getSocketUrl = useCallback(() => {
        if (typeof window === "undefined") return "";
        return window.location.origin;
    }, []);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;
        const url = getSocketUrl();
        if (!url) return;
        try {
            const socket: Socket = io(url, {
                path: "/ws",
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 3000,
                timeout: 10000,
            });
            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("[WS] Socket.IO connected", socket.id);
                setConnected(true);
                if (subscribedTickers.current.size > 0) {
                    socket.emit("subscribe", { type: "subscribe", tickers: Array.from(subscribedTickers.current) });
                }
            });

            socket.on("price_update", (msg: ServerMessage) => {
                if ((msg as any).type === "price_update") {
                    setPrices((prev) => ({ ...prev, ...(msg as any).data }));
                }
            });
            socket.on("market_status", (msg: any) => setMarketOpen(!!msg.isOpen));
            socket.on("welcome", (msg: any) => setMarketOpen(!!msg.marketOpen));
            socket.on("pong", () => {});

            socket.on("disconnect", () => {
                console.log("[WS] Socket.IO disconnected");
                setConnected(false);
            });
            socket.on("connect_error", () => setConnected(false));
        } catch {}
    }, [getSocketUrl]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setConnected(false);
        }
    }, []);

    const subscribe = useCallback((tickers: string[]) => {
        tickers.forEach((t) => subscribedTickers.current.add(t));
        if (socketRef.current?.connected) {
            socketRef.current.emit("subscribe", { type: "subscribe", tickers });
        }
    }, []);

    const unsubscribe = useCallback((tickers: string[]) => {
        tickers.forEach((t) => subscribedTickers.current.delete(t));
        if (socketRef.current?.connected) {
            socketRef.current.emit("unsubscribe", { type: "unsubscribe", tickers });
        }
    }, []);

    const reconnect = useCallback(() => {
        disconnect();
        setTimeout(() => connect(), 100);
    }, [connect, disconnect]);

    useEffect(() => {
        if (autoConnect) connect();
        return () => disconnect();
    }, [autoConnect, connect, disconnect]);

    return { connected, prices, marketOpen, subscribe, unsubscribe, reconnect };
}
