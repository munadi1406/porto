// Price Publisher — Socket.IO version
import { SubscriptionManager } from "./subscription-manager";
import { fetchPrices } from "../lib/price-fetcher";
import { getMarketStatus } from "../lib/market-hours";
import type { PriceUpdateMessage, MarketStatusMessage } from "../lib/ws-types";

export class PricePublisher {
    private manager: SubscriptionManager;
    private interval: ReturnType<typeof setInterval> | null = null;
    private lastMarketStatus: string = "";

    constructor(manager: SubscriptionManager) { this.manager = manager; }

    start() {
        console.log("[Publisher] Starting price publisher (Socket.IO)...");
        this.interval = setInterval(() => this.publish(), 3_000);
        this.publishMarketStatus();
    }
    stop() { if (this.interval) { clearInterval(this.interval); this.interval = null; } }

    private async publish() {
        const marketStatus = getMarketStatus();
        const statusKey = `${marketStatus.isOpen}-${marketStatus.session}`;
        if (statusKey !== this.lastMarketStatus) { this.lastMarketStatus = statusKey; this.publishMarketStatus(); }

        const tickers = this.manager.getAllSubscribedTickers();
        if (tickers.length === 0) return;

        try {
            const prices = await fetchPrices(tickers);
            if (Object.keys(prices).length === 0) return;
            const message: PriceUpdateMessage = { type: "price_update", data: prices, timestamp: Date.now() };
            this.manager.broadcast(tickers, "price_update", message);
        } catch (err) { console.error("[Publisher] Error fetching prices:", err); }
    }

    private publishMarketStatus() {
        const status = getMarketStatus();
        const message: MarketStatusMessage = { type: "market_status", isOpen: status.isOpen, session: status.session };
        this.manager.broadcastAll("market_status", message);
    }
}
