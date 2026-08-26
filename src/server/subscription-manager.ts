// WebSocket Subscription Manager — tracks which clients subscribe to which tickers

import type { WebSocket } from "ws";

interface ClientSubscription {
    ws: WebSocket;
    tickers: Set<string>;
    lastHeartbeat: number;
}

export class SubscriptionManager {
    private clients: Map<string, ClientSubscription> = new Map();
    private tickerToClients: Map<string, Set<string>> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor() {
        // Cleanup stale connections every 30 seconds
        this.cleanupInterval = setInterval(() => this.cleanup(), 30_000);
    }

    addClient(clientId: string, ws: WebSocket) {
        this.clients.set(clientId, {
            ws,
            tickers: new Set(),
            lastHeartbeat: Date.now(),
        });
    }

    removeClient(clientId: string) {
        const client = this.clients.get(clientId);
        if (client) {
            // Remove from all ticker subscriptions
            for (const ticker of client.tickers) {
                const subs = this.tickerToClients.get(ticker);
                if (subs) {
                    subs.delete(clientId);
                    if (subs.size === 0) this.tickerToClients.delete(ticker);
                }
            }
            this.clients.delete(clientId);
        }
    }

    subscribe(clientId: string, tickers: string[]) {
        const client = this.clients.get(clientId);
        if (!client) return;

        for (const ticker of tickers) {
            client.tickers.add(ticker);
            if (!this.tickerToClients.has(ticker)) {
                this.tickerToClients.set(ticker, new Set());
            }
            this.tickerToClients.get(ticker)!.add(clientId);
        }
    }

    unsubscribe(clientId: string, tickers: string[]) {
        const client = this.clients.get(clientId);
        if (!client) return;

        for (const ticker of tickers) {
            client.tickers.delete(ticker);
            const subs = this.tickerToClients.get(ticker);
            if (subs) {
                subs.delete(clientId);
                if (subs.size === 0) this.tickerToClients.delete(ticker);
            }
        }
    }

    updateHeartbeat(clientId: string) {
        const client = this.clients.get(clientId);
        if (client) client.lastHeartbeat = Date.now();
    }

    // Get all unique tickers being subscribed to
    getAllSubscribedTickers(): string[] {
        return Array.from(this.tickerToClients.keys());
    }

    // Get all client IDs subscribed to a specific ticker
    getClientsForTicker(ticker: string): string[] {
        return Array.from(this.tickerToClients.get(ticker) || []);
    }

    // Get client's WebSocket by ID
    getClient(clientId: string): WebSocket | undefined {
        return this.clients.get(clientId)?.ws;
    }

    // Broadcast message to all clients subscribed to specific tickers
    broadcast(tickers: string[], message: string) {
        const clientIds = new Set<string>();
        for (const ticker of tickers) {
            const subs = this.tickerToClients.get(ticker);
            if (subs) {
                for (const id of subs) clientIds.add(id);
            }
        }

        for (const id of clientIds) {
            const client = this.clients.get(id);
            if (client && client.ws.readyState === 1) { // WebSocket.OPEN
                client.ws.send(message);
            }
        }
    }

    // Broadcast to ALL connected clients
    broadcastAll(message: string) {
        for (const [, client] of this.clients) {
            if (client.ws.readyState === 1) {
                client.ws.send(message);
            }
        }
    }

    getClientCount(): number {
        return this.clients.size;
    }

    getTickerCount(): number {
        return this.tickerToClients.size;
    }

    private cleanup() {
        const now = Date.now();
        const staleThreshold = 60_000; // 60 seconds without heartbeat

        for (const [clientId, client] of this.clients) {
            if (now - client.lastHeartbeat > staleThreshold) {
                console.log(`[WS] Cleaning up stale client: ${clientId}`);
                try { client.ws.close(); } catch {}
                this.removeClient(clientId);
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        for (const [clientId] of this.clients) {
            this.removeClient(clientId);
        }
    }
}
