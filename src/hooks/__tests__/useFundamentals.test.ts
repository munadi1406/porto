// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFundamentals } from '@/hooks/useFundamentals';

function fakeRes(ok: boolean, body: any) {
    return { ok, json: async () => body };
}

describe('useFundamentals', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('memuat data fundamental (envelope nested dari route)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => fakeRes(true, { success: true, data: { ticker: 'BBCA', peRatio: 20 }, source: 'api' }))
        );
        const { result } = renderHook(() => useFundamentals('BBCA'));
        await waitFor(() => expect(result.current.data).not.toBeNull());
        expect(result.current.data?.ticker).toBe('BBCA');
        expect(result.current.data?.peRatio).toBe(20);
    });

    it('tetap terima body flat (kompatibilitas ke belakang)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => fakeRes(true, { ticker: 'BBCA', peRatio: 20 }))
        );
        const { result } = renderHook(() => useFundamentals('BBCA'));
        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.data).not.toBeNull());
        expect(result.current.loading).toBe(false);
        expect(result.current.data?.ticker).toBe('BBCA');
        expect(result.current.data?.peRatio).toBe(20);
    });

    it('menangkap error saat response bukan OK', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
        const { result } = renderHook(() => useFundamentals('BBCA'));
        await waitFor(() => expect(result.current.error).not.toBeNull());
        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('menangkap error saat fetch menolak', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
        const { result } = renderHook(() => useFundamentals('BBCA'));
        await waitFor(() => expect(result.current.error).toBe('network down'));
    });

    it('tidak memanggil fetch jika ticker kosong', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const { result } = renderHook(() => useFundamentals(''));
        expect(result.current.loading).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});