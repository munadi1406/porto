// Socket.IO Server — replaces ws WebSocketServer
import { Server as IOServer } from "socket.io";
import type { Server } from "http";
import { SubscriptionManager } from "./subscription-manager";
import { PricePublisher } from "./price-publisher";
import type { ClientMessage } from "../lib/ws-types";

let io: IOServer | null = null;
let manager: SubscriptionManager | null = null;
let publisher: PricePublisher | null = null;
let clientCounter = 0;

export function initWebSocket(server: Server) {
    if (io) return;

    io = new IOServer(server, {
        path: "/ws",
        cors: { origin: "*", methods: ["GET", "POST"] },
        transports: ["websocket", "polling"],
        pingInterval: 25000,
        pingTimeout: 20000,
    });

    manager = new SubscriptionManager(io);
    publisher = new PricePublisher(manager);

    io.on("connection", (socket) => {
        const clientId = `client_${++clientCounter}`;
        console.log(`[WS] Client connected: ${clientId} (${socket.id}) total: ${manager!.getClientCount() + 1}`);

        manager!.addClient(clientId, socket as any);
        // Store mapping socket.id -> clientId for cleanup
        (socket as any).clientId = clientId;

        socket.emit("welcome", { type: "welcome", sessionId: clientId, marketOpen: false });

        socket.on("subscribe", (msg: ClientMessage & { tickers: string[] }) => {
            const tickers = (msg as any).tickers || [];
            manager!.subscribe(clientId, tickers);
            console.log(`[WS] ${clientId} subscribe: ${tickers.join(", ")}`);
        });

        socket.on("unsubscribe", (msg: any) => {
            manager!.unsubscribe(clientId, msg.tickers || []);
        });

        socket.on("ping", () => {
            manager!.updateHeartbeat(clientId);
            socket.emit("pong", { type: "pong", timestamp: Date.now() });
        });

        // Backward compat: generic message event with {type}
        socket.on("message", (msg: ClientMessage) => handleMessage(clientId, msg, socket));

        socket.on("disconnect", (reason) => {
            console.log(`[WS] Client disconnected: ${clientId} (${reason}) total: ${manager!.getClientCount() - 1}`);
            manager!.removeClient(clientId);
        });

        socket.on("error", (err) => {
            console.error(`[WS] Client error: ${clientId}`, err.message);
            manager!.removeClient(clientId);
        });
    });

    publisher.start();
    console.log("[WS] Socket.IO server initialized on /ws");
}

function handleMessage(clientId: string, msg: ClientMessage, socket: any) {
    switch (msg.type) {
        case "subscribe":
            manager!.subscribe(clientId, (msg as any).tickers || []);
            break;
        case "unsubscribe":
            manager!.unsubscribe(clientId, (msg as any).tickers || []);
            break;
        case "ping":
            manager!.updateHeartbeat(clientId);
            socket.emit("pong", { type: "pong", timestamp: Date.now() });
            break;
    }
}

export function getIO() { return io; }
export function getWSS() { return io as any; }
export function getManager() { return manager; }
export function getPublisher() { return publisher; }
