import { describe, it, expect, vi, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ instances: [] as any[] }));

vi.mock('yahoo-finance2', () => {
    class MockYF {
        quote = vi.fn();
        constructor() {
            h.instances.push(this);
        }
    }
    return { default: MockYF };
});

vi.mock('next/server', () => ({
    NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
    },
}));

import { GET } from '@/app/api/name/route';

function yf() {
    return h.instances[h.instances.length - 1];
}

describe('API /api/name', () => {
    afterEach(() => vi.clearAllMocks());

    it('mengembalikan 400 jika ticker kosong', async () => {
        const res = await GET(new Request('http://localhost/api/name'));
        expect(res.status).toBe(400);
    });

    it('mengambil nama perusahaan dari Yahoo', async () => {
        yf().quote.mockResolvedValue({ shortName: 'Bank Central Asia', longName: 'PT Bank Central Asia Tbk' });
        const res = await GET(new Request('http://localhost/api/name?ticker=BBCA.JK'));
        const json = await res.json();
        expect(json.name).toBe('Bank Central Asia');
        expect(json.source).toBe('live');
    });

    it('memakai cache pada panggilan kedua (ticker baru)', async () => {
        yf().quote.mockResolvedValue({ shortName: 'Bank Rakyat Indonesia' });
        await GET(new Request('http://localhost/api/name?ticker=BBRI.JK'));
        const res = await GET(new Request('http://localhost/api/name?ticker=BBRI.JK'));
        const json = await res.json();
        expect(json.source).toBe('cache');
        expect(yf().quote).toHaveBeenCalledTimes(1);
    });

    it('fallback ke ticker saat Yahoo error', async () => {
        yf().quote.mockRejectedValue(new Error('boom'));
        const res = await GET(new Request('http://localhost/api/name?ticker=ZZZZ.JK'));
        const json = await res.json();
        expect(json.name).toBe('ZZZZ.JK');
        expect(json.source).toBe('error');
    });
});