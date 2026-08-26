import { describe, it, expect } from "vitest";
import { lastTradingDayWIB, getMarketStatus } from "../market-hours";

// Helper: bangun Date dari komponen WIB (UTC+7)
const wib = (y: number, m: number, d: number, hh: number, mm: number) =>
    new Date(Date.UTC(y, m - 1, d, hh - 7, mm));

describe("lastTradingDayWIB", () => {
    it("hari kerja setelah 09:15 → hari yang sama", () => {
        // Senin 24 Agustus 2026, 10:00 WIB
        expect(lastTradingDayWIB(wib(2026, 8, 24, 10, 0))).toBe("20260824");
    });

    it("hari kerja sebelum 09:15 → hari bursa sebelumnya", () => {
        // Senin 08:00 WIB → Jumat sebelumnya
        expect(lastTradingDayWIB(wib(2026, 8, 24, 8, 0))).toBe("20260821");
    });

    it("Sabtu → Jumat", () => {
        expect(lastTradingDayWIB(wib(2026, 8, 22, 12, 0))).toBe("20260821");
    });

    it("Minggu → Jumat", () => {
        expect(lastTradingDayWIB(wib(2026, 8, 23, 12, 0))).toBe("20260821");
    });

    it("Jumat 08:00 → Kamis", () => {
        expect(lastTradingDayWIB(wib(2026, 8, 21, 8, 0))).toBe("20260820");
    });
});

describe("getMarketStatus", () => {
    it("weekend → closed", () => {
        expect(getMarketStatus(wib(2026, 8, 22, 11, 0)).isOpen).toBe(false);
    });

    it("jam trading 10:00 → open", () => {
        const s = getMarketStatus(wib(2026, 8, 24, 10, 0));
        expect(s.isOpen).toBe(true);
        expect(s.session).toBe("trading");
    });

    it("07:00 → closed", () => {
        expect(getMarketStatus(wib(2026, 8, 24, 7, 0)).session).toBe("closed");
    });

    it("08:50 → pre_open", () => {
        expect(getMarketStatus(wib(2026, 8, 24, 8, 50)).session).toBe("pre_open");
    });

    it("17:00 → post_close", () => {
        expect(getMarketStatus(wib(2026, 8, 24, 17, 0)).session).toBe("post_close");
    });
});
