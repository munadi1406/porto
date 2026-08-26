import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
    },
}));

vi.mock('@/lib/news', () => ({ getStockNews: vi.fn() }));

import { getStockNews } from '@/lib/news';
import { GET } from '@/app/api/news/route';

const mockedGetStockNews = vi.mocked(getStockNews);

describe('API /api/news', () => {
    afterEach(() => mockedGetStockNews.mockReset());

    it('mengembalikan 400 jika symbol kosong', async () => {
        const res = await GET(new Request('http://localhost/api/news'));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('symbol is required');
    });

    it('mengembalikan daftar berita untuk symbol', async () => {
        mockedGetStockNews.mockResolvedValue([
            { title: 'T', link: 'http://x/1', source: 'Kontan', published: '', publishTime: 0, summary: 's' },
        ]);
        const res = await GET(new Request('http://localhost/api/news?symbol=BBCA'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.symbol).toBe('BBCA');
        expect(json.news).toHaveLength(1);
    });

    it('mengembalikan 502 saat sumber berita gagal', async () => {
        mockedGetStockNews.mockRejectedValue(new Error('gagal'));
        const res = await GET(new Request('http://localhost/api/news?symbol=BBCA'));
        expect(res.status).toBe(502);
        expect((await res.json()).success).toBe(false);
    });
});