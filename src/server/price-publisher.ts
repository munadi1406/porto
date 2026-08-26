// Price Publisher — periodically fetches prices and broadcasts to subscribed clients

import { SubscriptionManager } from "./subscription-manager";
import { fetchPrices } from "../lib/price-fetcher";
import { getMarketStatus } from "../lib/market-hours";
import type { PriceUpdateMessage, MarketStatusMessage } from "../lib/ws-types";

export class PricePublisher {
    private manager: SubscriptionManager;
    private interval: ReturnType<typeof setInterval> | null = null;
    private lastMarketStatus: string = "";

    constructor(manager: SubscriptionManager) {
        this.manager = manager;
    }

    start() {
        console.log("[Publisher] Starting price publisher...");

        // Fetch and broadcast every 3 seconds during market hours
        // 10 seconds outside market hours (for stale data updates)
        this.interval = setInterval(() => this.publish(), 3_000);

        // Send initial market status
        this.publishMarketStatus();
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private async publish() {
        const marketStatus = getMarketStatus();

        // Send market status if changed
        const statusKey = `${marketStatus.isOpen}-${marketStatus.session}`;
        if (statusKey !== this.lastMarketStatus) {
            this.lastMarketStatus = statusKey;
            this.publishMarketStatus();
        }

        // Get all subscribed tickers
        const tickers = this.manager.getAllSubscribedTickers();
        if (tickers.length === 0) return;

        // Fetch prices for all subscribed tickers
        try {
            const prices = await fetchPrices(tickers);
            if (Object.keys(prices).length === 0) return;

            const message: PriceUpdateMessage = {
                type: "price_update",
                data: prices,
                timestamp: Date.now(),
            };

            // Broadcast to clients subscribed to these tickers
            this.manager.broadcast(tickers, JSON.stringify(message));
        } catch (err) {
            console.error("[Publisher] Error fetching prices:", err);
        }
    }

    private publishMarketStatus() {
        const status = getMarketStatus();
        const message: MarketStatusMessage = {
            type: "market_status",
            isOpen: status.isOpen,
            session: status.session,
        };
        this.manager.broadcastAll(JSON.stringify(message));
    }
}
