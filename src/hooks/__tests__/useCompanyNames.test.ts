// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCompanyNames } from '@/hooks/useCompanyNames';

function fakeRes(ok: boolean, body: any) {
    return { ok, json: async () => body };
}

describe('useCompanyNames', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('mengambil nama untuk ticker unik', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                if (url.includes('BBCA')) return fakeRes(true, { name: 'Bank Central Asia' });
                return fakeRes(true, { name: 'Telkom Indonesia' });
            })
        );
        const { result } = renderHook(() => useCompanyNames(['BBCA', 'TLKM']));
        await waitFor(() => expect(Object.keys(result.current).length).toBe(2));
        expect(result.current.BBCA).toBe('Bank Central Asia');
        expect(result.current.TLKM).toBe('Telkom Indonesia');
    });

    it('tidak mem-fetch ulang ticker yang sudah diambil', async () => {
        const fetchMock = vi.fn(async (url: string) => fakeRes(true, { name: 'X' }));
        vi.stubGlobal('fetch', fetchMock);
        const { result, rerender } = renderHook(({ t }) => useCompanyNames(t), {
            initialProps: { t: ['BBCA'] },
        });
        await waitFor(() => expect(result.current.BBCA).toBe('X'));
        rerender({ t: ['BBCA', 'BBRI'] });
        await waitFor(() => expect(Object.keys(result.current).length).toBe(2));
        expect(fetchMock).toHaveBeenCalledTimes(2); // BBCA + BBRI (BBCA tidak diulang)
    });

    it('fallback ke ticker saat fetch gagal', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('network');
            })
        );
        const { result } = renderHook(() => useCompanyNames(['ZZZZ']));
        await waitFor(() => expect(result.current.ZZZZ).toBe('ZZZZ'));
    });
});