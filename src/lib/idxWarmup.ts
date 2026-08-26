// IDX API Warm-up Module
// Dipanggil saat server start untuk mengurangi cold start latency.

import { warmupSession, getLastTradingDate } from './idxApiClient';

let warmedUp = false;

export function triggerWarmup() {
    if (warmedUp) return;
    warmedUp = true;

    // Warm-up session cookie (background)
    warmupSession();

    // Pre-fetch last trading date (background)
    getLastTradingDate().catch(() => {});
}

// Auto-warm-up saat module di-import
triggerWarmup();
