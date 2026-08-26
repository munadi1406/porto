import { NextRequest } from 'next/server';
import { getCompanyDetail } from '@/lib/idxApiClientExtended';

export async function GET(req: NextRequest) {
    try {
        const code = req.nextUrl.searchParams.get('code') || '';
        if (!code) return Response.json({ success: false, error: 'code required' }, { status: 400 });
        const data = await getCompanyDetail(code);
        if (!data || !data.Profiles || data.Profiles.length === 0) {
            return Response.json({ success: true, data: null });
        }
        const profile = data.Profiles[0];
        return Response.json({
            success: true,
            data: {
                profile: {
                    address: profile.Alamat,
                    bae: profile.BAE,
                    industry: profile.Industri,
                    subIndustri: profile.SubIndustri,
                    email: profile.Email,
                    fax: profile.Fax,
                    businessActivity: profile.KegiatanUsahaUtama,
                    code: profile.KodeEmiten,
                    name: profile.NamaEmiten,
                    phone: profile.Telepon,
                    website: profile.Website,
                    npwp: profile.NPWP,
                    history: profile.SejarahPencatatan,
                    listingDate: profile.TanggalPencatatan,
                    board: profile.PapanPencatatan,
                    sector: profile.Sektor,
                    subSector: profile.SubSektor,
                    status: profile.Status,
                },
                secretary: (data.Sekretaris || []).map((s: any) => ({ name: s.Nama, email: s.Email, phone: s.Telepon })),
                directors: (data.Direktur || []).map((d: any) => ({ name: d.Nama, position: d.Jabatan })),
                commissioners: (data.Komisaris || []).map((c: any) => ({ name: c.Nama, position: c.Jabatan })),
                committees: (data.Komite || []).map((k: any) => ({ name: k.Nama, position: k.Jabatan, type: k.JabatanLain })),
                shareholders: (data.PemegangSaham || []).map((s: any) => ({ name: s.Nama, count: s.Jumlah, percentage: s.Persentase })),
                subsidiaries: (data.AnakPerusahaan || []).map((s: any) => ({ name: s.Nama, type: s.JenisUsaha, location: s.Lokasi, status: s.Status, percentage: s.Persentase, totalAssets: s.TotalAset, unit: s.Satuan })),
            }
        });
    } catch (error: any) {
        return Response.json({ success: true, data: null });
    }
}
