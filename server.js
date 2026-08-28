// cPanel-ready Next.js + WebSocket server
// Entry file for cPanel Node.js (Phusion Passenger) -> Application Startup File = server.js
// Run locally: node server.js  OR  npx tsx server.ts (dev)
// WS auto-fallback to polling if init fails (shared hosting without ws/tsx)

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || '0.0.0.0'
const port = parseInt(process.env.PORT || process.env.port || '8080', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Try to load WS init — supports both compiled JS and TS (via tsx)
let initWebSocket = null
try {
    // Try JS first (after build, or if ws-server.js exists)
    initWebSocket = require('./src/server/ws-server').initWebSocket
} catch (e1) {
    try {
        require('tsx/cjs')
        initWebSocket = require('./src/server/ws-server').initWebSocket
    } catch (e2) {
        console.warn('[WS] WebSocket init not available, polling fallback active:', e2.message)
    }
}

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true)
            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })

    if (initWebSocket) {
        try {
            initWebSocket(server)
            console.log('[WS] WebSocket enabled on /ws')
        } catch (err) {
            console.error('[WS] Failed to init WebSocket:', err.message)
        }
    } else {
        console.log('[WS] Disabled — polling fallback (POST /api/price-batch 5s) active')
    }

    server.listen(port, hostname, (err) => {
        if (err) throw err
        console.log(`> Ready on http://${hostname}:${port}`)
        console.log(`> WS at ws://${hostname}:${port}/ws`)
        if (dev) console.log(`> Next.js dev: http://localhost:${port}`)
    })
})
