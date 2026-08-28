// Subscription Manager — Socket.IO version
import type { Server as IOServer, Socket } from "socket.io";

interface ClientSubscription {
    socket: Socket;
    tickers: Set<string>;
    lastHeartbeat: number;
}

export class SubscriptionManager {
    private clients: Map<string, ClientSubscription> = new Map();
    private tickerToClients: Map<string, Set<string>> = new Map();
    private io: IOServer | null = null;
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor(io?: IOServer) {
        if (io) this.io = io;
        this.cleanupInterval = setInterval(() => this.cleanup(), 30_000);
    }

    setIO(io: IOServer) { this.io = io; }

    addClient(clientId: string, socket: Socket) {
        this.clients.set(clientId, { socket, tickers: new Set(), lastHeartbeat: Date.now() });
    }

    removeClient(clientId: string) {
        const client = this.clients.get(clientId);
        if (client) {
            for (const ticker of client.tickers) {
                const subs = this.tickerToClients.get(ticker);
                if (subs) { subs.delete(clientId); if (subs.size === 0) this.tickerToClients.delete(ticker); }
            }
            this.clients.delete(clientId);
        }
    }

    subscribe(clientId: string, tickers: string[]) {
        const client = this.clients.get(clientId);
        if (!client) return;
        for (const ticker of tickers) {
            client.tickers.add(ticker);
            if (!this.tickerToClients.has(ticker)) this.tickerToClients.set(ticker, new Set());
            this.tickerToClients.get(ticker)!.add(clientId);
            client.socket.join(ticker);
        }
    }

    unsubscribe(clientId: string, tickers: string[]) {
        const client = this.clients.get(clientId);
        if (!client) return;
        for (const ticker of tickers) {
            client.tickers.delete(ticker);
            const subs = this.tickerToClients.get(ticker);
            if (subs) { subs.delete(clientId); if (subs.size === 0) this.tickerToClients.delete(ticker); }
            client.socket.leave(ticker);
        }
    }

    updateHeartbeat(clientId: string) {
        const c = this.clients.get(clientId);
        if (c) c.lastHeartbeat = Date.now();
    }

    getAllSubscribedTickers(): string[] { return Array.from(this.tickerToClients.keys()); }
    getClientsForTicker(ticker: string): string[] { return Array.from(this.tickerToClients.get(ticker) || []); }
    getClient(clientId: string): Socket | undefined { return this.clients.get(clientId)?.socket; }

    broadcast(tickers: string[], event: string, data: any) {
        // Socket.IO room broadcast — efficient
        if (!this.io) return;
        const sent = new Set<string>();
        for (const ticker of tickers) {
            if (sent.has(ticker)) continue;
            sent.add(ticker);
            this.io.to(ticker).emit(event, data);
        }
        // Also handle clients subscribed to any of the tickers via fallback direct emit (covers multi-ticker emit)
        // Room approach already covers it; no extra loop needed
    }

    // Legacy JSON string broadcast compat — now emits typed event
    broadcastJson(tickers: string[], message: string) {
        try {
            const obj = JSON.parse(message);
            const event = obj.type || "message";
            this.broadcast(tickers, event, obj);
        } catch {
            this.broadcast(tickers, "message", message);
        }
    }

    broadcastAll(event: string, data: any) {
        if (!this.io) return;
        this.io.emit(event, data);
    }

    broadcastAllJson(message: string) {
        try {
            const obj = JSON.parse(message);
            const event = obj.type || "message";
            this.broadcastAll(event, obj);
        } catch {
            this.broadcastAll("message", message);
        }
    }

    getClientCount(): number { return this.clients.size; }
    getTickerCount(): number { return this.tickerToClients.size; }

    private cleanup() {
        const now = Date.now();
        for (const [id, c] of this.clients) {
            if (now - c.lastHeartbeat > 60_000) {
                console.log(`[WS] Cleaning stale client: ${id}`);
                try { c.socket.disconnect(true); } catch {}
                this.removeClient(id);
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        for (const [id] of this.clients) this.removeClient(id);
    }
}
