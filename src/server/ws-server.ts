// WebSocket Server — handles client connections and messages

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { SubscriptionManager } from "./subscription-manager";
import { PricePublisher } from "./price-publisher";
import type { ClientMessage } from "../lib/ws-types";

let wss: WebSocketServer | null = null;
let manager: SubscriptionManager | null = null;
let publisher: PricePublisher | null = null;
let clientCounter = 0;

export function initWebSocket(server: Server) {
    if (wss) return;

    manager = new SubscriptionManager();
    publisher = new PricePublisher(manager);

    // PENTING: pakai noServer + filter manual supaya upgrade SELAIN /ws
    // (mis. /_next/webpack-hmr milik Next.js dev) TIDAK dihancurkan.
    // Sebelumnya mode {server, path} membuat HMR sering putus → halaman
    // ter-refresh sendiri di mode development.
    wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
        let pathname = "";
        try {
            pathname = new URL(req.url || "/", "http://localhost").pathname;
        } catch {}
        if (pathname === "/ws") {
            wss!.handleUpgrade(req, socket, head, (ws) => {
                wss!.emit("connection", ws, req);
            });
        }
        // Selain /ws: tidak melakukan apa pun → listener Next.js tetap berjalan
    });

    wss.on("connection", (ws, req) => {
        const clientId = `client_${++clientCounter}`;
        console.log(`[WS] Client connected: ${clientId} (total: ${manager!.getClientCount() + 1})`);

        manager!.addClient(clientId, ws);

        // Send welcome message
        ws.send(JSON.stringify({
            type: "welcome",
            sessionId: clientId,
            marketOpen: false,
        }));

        ws.on("message", (data) => {
            try {
                const msg: ClientMessage = JSON.parse(data.toString());
                handleMessage(clientId, msg);
            } catch {}
        });

        ws.on("close", () => {
            console.log(`[WS] Client disconnected: ${clientId} (total: ${manager!.getClientCount() - 1})`);
            manager!.removeClient(clientId);
        });

        ws.on("error", (err) => {
            console.error(`[WS] Client error: ${clientId}`, err.message);
            manager!.removeClient(clientId);
        });

        ws.on("pong", () => {
            manager!.updateHeartbeat(clientId);
        });
    });

    // Start heartbeat check
    setInterval(() => {
        wss?.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        });
    }, 30_000);

    // Start price publisher
    publisher.start();

    console.log("[WS] WebSocket server initialized on /ws");
}

function handleMessage(clientId: string, msg: ClientMessage) {
    switch (msg.type) {
        case "subscribe":
            manager!.subscribe(clientId, msg.tickers);
            console.log(`[WS] ${clientId} subscribed to: ${msg.tickers.join(", ")}`);
            break;

        case "unsubscribe":
            manager!.unsubscribe(clientId, msg.tickers);
            break;

        case "ping":
            manager!.updateHeartbeat(clientId);
            const ws = manager!.getClient(clientId);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            }
            break;
    }
}

export function getWSS() { return wss; }
export function getManager() { return manager; }
export function getPublisher() { return publisher; }
