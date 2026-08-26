import { describe, it, expect } from 'vitest';
import { cn, formatIDR, formatCompactIDR, formatPercentage, formatNumber } from '@/lib/utils';

describe('utils', () => {
    it('cn menggabungkan class dan membuang yang falsy', () => {
        expect(cn('a', 'b')).toBe('a b');
        expect(cn(false, 'x', undefined, 'y', null)).toBe('x y');
        expect(cn()).toBe('');
    });

    it('formatIDR memformat angka ke Rupiah id-ID', () => {
        expect(formatIDR(1234)).toContain('1.234');
        expect(formatIDR(0).replace(/\u00A0/g, ' ')).toBe('Rp 0');
        expect(formatIDR(NaN)).toBe('Rp0');
        expect(formatIDR(Infinity)).toBe('Rp0');
    });

    it('formatCompactIDR memadatkan nilai besar', () => {
        expect(formatCompactIDR(2_000_000_000_000)).toBe('Rp2.00T');
        expect(formatCompactIDR(1_500_000_000)).toBe('Rp1.50M');
        expect(formatCompactIDR(2_000_000)).toBe('Rp2.00JT');
        expect(formatCompactIDR(1_234)).toBe('Rp1RB');
        expect(formatCompactIDR(999).replace(/\u00A0/g, ' ')).toBe('Rp 999');
        expect(formatCompactIDR(NaN)).toBe('Rp0');
    });

    it('formatPercentage menambahkan tanda +/-', () => {
        expect(formatPercentage(1.234)).toBe('+1.23%');
        expect(formatPercentage(-0.5)).toBe('-0.50%');
        expect(formatPercentage(0)).toBe('+0.00%');
        expect(formatPercentage(NaN)).toBe('0.00%');
    });

    it('formatNumber memformat ribuan dengan pemisah id-ID', () => {
        expect(formatNumber(1234567)).toBe('1.234.567');
        expect(formatNumber(NaN)).toBe('0');
    });
});