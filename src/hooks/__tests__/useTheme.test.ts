// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme } from '@/hooks/useTheme';

describe('useTheme', () => {
    beforeEach(() => {
        localStorage.clear();
        useTheme.setState({ theme: 'light' });
        document.documentElement.classList.remove('dark');
    });

    it('nilai awal light (matchMedia default false)', () => {
        expect(useTheme.getState().theme).toBe('light');
    });

    it('toggle membalik tema dan menyimpan ke localStorage + class html', () => {
        useTheme.getState().toggle();
        expect(useTheme.getState().theme).toBe('dark');
        expect(localStorage.getItem('porto-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        useTheme.getState().toggle();
        expect(useTheme.getState().theme).toBe('light');
        expect(localStorage.getItem('porto-theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});