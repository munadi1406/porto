// Custom Next.js Server
// Run with: npx tsx server.ts

import { createServer } from "http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        await handle(req, res);
    });

    server.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log("> Market data: API polling every 5 seconds");
    });
});
