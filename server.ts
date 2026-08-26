// Custom Next.js Server with WebSocket support
// Run with: npx tsx server.ts

import { createServer } from "http";
import next from "next";
import { initWebSocket } from "./src/server/ws-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        await handle(req, res);
    });

    // Initialize WebSocket server
    initWebSocket(server);

    server.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket available at ws://${hostname}:${port}/ws`);
    });
});
