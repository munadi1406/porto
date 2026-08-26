import { describe, it, expect } from 'vitest';
import { BROKER_CODES, getBrokerName } from '@/lib/brokerCodes';

describe('brokerCodes', () => {
    it('BROKER_CODES berisi banyak kode broker', () => {
        expect(Object.keys(BROKER_CODES).length).toBeGreaterThan(100);
    });

    it('getBrokerName mengembalikan nama untuk kode yang dikenal', () => {
        expect(getBrokerName('AA')).toBe('AAA Sekuritas');
        expect(getBrokerName('BB')).toBe('Binaartha Sekuritas');
    });

    it('getBrokerName case-insensitive', () => {
        expect(getBrokerName('aa')).toBe('AAA Sekuritas');
        expect(getBrokerName('Bb')).toBe('Binaartha Sekuritas');
    });

    it('getBrokerName mengembalikan kode asli jika tidak dikenal', () => {
        expect(getBrokerName('ZZ')).toBe('ZZ');
        expect(getBrokerName('')).toBe('');
    });
});