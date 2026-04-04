// Utility untuk cek jam bursa Indonesia (IDX)

export interface MarketStatus {
    isOpen: boolean;
    reason?: string;
    nextOpen?: string;
}

/**
 * Check if Indonesian Stock Exchange (IDX) is currently open
 * Trading hours:
 * - Session 1: Monday-Friday, 09:00-11:30 WIB
 * - Session 2: Monday-Thursday, 13:30-16:00 WIB
 * - Session 2: Friday, 14:00-16:00 WIB
 */
export const isMarketOpen = (): MarketStatus => {
    // Get current time in WIB (GMT+7)
    const now = new Date();
    const wibOffset = 7 * 60; // WIB is GMT+7
    const localOffset = now.getTimezoneOffset();
    const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);

    const day = wibTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hours = wibTime.getHours();
    const minutes = wibTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // Check if it's weekend
    if (day === 0 || day === 6) {
        const nextMonday = new Date(wibTime);
        nextMonday.setDate(wibTime.getDate() + (day === 0 ? 1 : 2));
        nextMonday.setHours(9, 0, 0, 0);

        return {
            isOpen: false,
            reason: 'Bursa tutup (Akhir pekan)',
            nextOpen: `Senin, ${nextMonday.toLocaleDateString('id-ID')} 09:00 WIB`
        };
    }

    // Trading session 1: 09:00 - 11:30 (all weekdays)
    const session1Start = 9 * 60; // 09:00
    const session1End = 11 * 60 + 30; // 11:30

    // Trading session 2: Different times for Mon-Thu vs Friday
    // Monday-Thursday: 13:30 - 16:00
    // Friday: 14:00 - 16:00
    const isFriday = day === 5;
    const session2Start = isFriday ? (14 * 60) : (13 * 60 + 30); // 14:00 on Friday, 13:30 on Mon-Thu
    const session2End = 16 * 60; // 16:00

    // Check if in session 1
    if (timeInMinutes >= session1Start && timeInMinutes < session1End) {
        return {
            isOpen: true
        };
    }

    // Check if in session 2
    if (timeInMinutes >= session2Start && timeInMinutes < session2End) {
        return {
            isOpen: true
        };
    }

    // Market is closed - determine reason and next open time
    let reason = '';
    let nextOpen = '';

    if (timeInMinutes < session1Start) {
        // Before market opens
        reason = 'Bursa belum buka';
        nextOpen = `Hari ini, 09:00 WIB`;
    } else if (timeInMinutes >= session1End && timeInMinutes < session2Start) {
        // Break time
        reason = 'Bursa istirahat (Break)';
        const breakEndTime = isFriday ? '14:00' : '13:30';
        nextOpen = `Hari ini, ${breakEndTime} WIB`;
    } else {
        // After market closes
        reason = 'Bursa sudah tutup';
        const tomorrow = new Date(wibTime);
        tomorrow.setDate(wibTime.getDate() + 1);

        // If tomorrow is Saturday, next open is Monday
        if (tomorrow.getDay() === 6) {
            tomorrow.setDate(tomorrow.getDate() + 2);
        }
        // If tomorrow is Sunday, next open is Monday
        else if (tomorrow.getDay() === 0) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }

        tomorrow.setHours(9, 0, 0, 0);
        nextOpen = `${tomorrow.toLocaleDateString('id-ID', { weekday: 'long' })}, ${tomorrow.toLocaleDateString('id-ID')} 09:00 WIB`;
    }

    return {
        isOpen: false,
        reason,
        nextOpen
    };
};

/**
 * Get formatted market status message
 */
export const getMarketStatusMessage = (): string => {
    const status = isMarketOpen();

    if (status.isOpen) {
        return '🟢 Bursa Buka - Trading Aktif';
    }

    return `🔴 ${status.reason} - Buka: ${status.nextOpen}`;
};

/**
 * Get current WIB time
 */
export const getCurrentWIBTime = (): Date => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const localOffset = now.getTimezoneOffset();
    return new Date(now.getTime() + (wibOffset + localOffset) * 60000);
};
