// IDX Trading Hours Detection (WIB = GMT+7)
// Regular session: Mon-Fri, 09:00-16:00 WIB
// Pre-opening: 08:45-09:00 WIB

export type MarketSession = "pre_open" | "trading" | "post_close" | "closed";

export interface MarketStatus {
    isOpen: boolean;
    session: MarketSession;
}

function getWIBDate(date: Date = new Date()): Date {
    const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    return new Date(utc + 7 * 60 * 60 * 1000);
}

export function getMarketStatus(now: Date = new Date()): MarketStatus {
    const wib = getWIBDate(now);
    const day = wib.getDay();
    const hours = wib.getHours();
    const minutes = wib.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // Weekend
    if (day === 0 || day === 6) {
        return { isOpen: false, session: "closed" };
    }

    // Pre-opening: 08:45 - 09:00
    if (timeInMinutes >= 525 && timeInMinutes < 540) {
        return { isOpen: false, session: "pre_open" };
    }

    // Trading: 09:00 - 16:00
    if (timeInMinutes >= 540 && timeInMinutes < 960) {
        return { isOpen: true, session: "trading" };
    }

    // After close
    if (timeInMinutes >= 960) {
        return { isOpen: false, session: "post_close" };
    }

    // Before pre-open
    return { isOpen: false, session: "closed" };
}

export function isMarketOpen(): boolean {
    return getMarketStatus().isOpen;
}

// Tanggal bursa terakhir (YYYYMMDD, zona WIB).
// Skip Sabtu/Minggu. Pada hari kerja sebelum 09:15 WIB dianggap
// data harian belum tersedia → pakai hari bursa sebelumnya.
export function lastTradingDayWIB(now: Date = new Date()): string {
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7
    const minutesNow = wib.getUTCHours() * 60 + wib.getUTCMinutes();
    let day = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
    const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

    if (!isWeekend(day) && minutesNow >= 555) { // >= 09:15 → hari ini sudah berjalan
        return fmt(day);
    }
    do {
        day = new Date(day.getTime() - 86400000);
    } while (isWeekend(day));
    return fmt(day);

    function fmt(d: Date): string {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        return `${y}${m}${dd}`;
    }
}
