// IDX Sector Mapping — mapping manual saham-saham IDX ke sektor
// Yahoo tidak return sector untuk saham IDX, jadi kita mapping manual.
// Saham yang tidak dikenal → "Lainnya"

const SECTOR_MAP: Record<string, string> = {
    // Perbankan
    BBCA: 'Perbankan', BBRI: 'Perbankan', BMRI: 'Perbankan', BBNI: 'Perbankan',
    BRIS: 'Perbankan', BDMN: 'Perbankan', BNGA: 'Perbankan', NISP: 'Perbankan',
    BNII: 'Perbankan', BBTN: 'Perbankan', BTPN: 'Perbankan', BJBR: 'Perbankan',
    BJTM: 'Perbankan', BNLI: 'Perbankan', PNBN: 'Perbankan', BKSW: 'Perbankan',
    SDRA: 'Perbankan', AGRO: 'Perbankan', MEGA: 'Perbankan', BEKS: 'Perbankan',
    // Infrastruktur & Telekomunikasi
    TLKM: 'Infrastruktur', JSMR: 'Infrastruktur', PGAS: 'Infrastruktur', TOWR: 'Infrastruktur',
    TBIG: 'Infrastruktur', EXCL: 'Infrastruktur', ISAT: 'Infrastruktur', FREN: 'Infrastruktur',
    WIFI: 'Infrastruktur', MTEL: 'Infrastruktur', TOWR2: 'Infrastruktur', CMNP: 'Infrastruktur',
    WIKA: 'Infrastruktur', PTPP: 'Infrastruktur', ADHI: 'Infrastruktur', WSKT: 'Infrastruktur',
    PNBS: 'Infrastruktur', ACST: 'Infrastruktur', BALI: 'Infrastruktur',
    // Tambang & Batubara
    ADRO: 'Tambang', PTBA: 'Tambang', ANTM: 'Tambang', BUMI: 'Tambang',
    MEDC: 'Tambang', ITMG: 'Tambang', HRUM: 'Tambang', INDY: 'Tambang',
    DOID: 'Tambang', DEWA: 'Tambang', MYOH: 'Tambang', DSSA: 'Tambang',
    SMMT: 'Tambang', TINS: 'Tambang', INCO: 'Tambang', ANTM2: 'Tambang',
    KKGI: 'Tambang', ARII: 'Tambang', BORN: 'Tambang', GTBO: 'Tambang',
    BYAN: 'Energi', RAJA: 'Energi', MBMA: 'Energi', BESS: 'Energi',
    POWR: 'Energi', SULI: 'Energi', RUMI: 'Energi', MDKA: 'Energi',
    // Konsumen
    UNVR: 'Konsumen', ICBP: 'Konsumen', INDF: 'Konsumen', GGRM: 'Konsumen',
    HMSP: 'Konsumen', KLBF: 'Konsumen', CPIN: 'Konsumen', JPFA: 'Konsumen',
    MYOR: 'Konsumen', MLBI: 'Konsumen', ROTI: 'Konsumen', ULTJ: 'Konsumen',
    AALI: 'Konsumen', LSIP: 'Konsumen', SGRO: 'Konsumen', SIMP: 'Konsumen',
    TAPG: 'Konsumen', MPPA: 'Konsumen', AMRT: 'Konsumen', MAPI: 'Konsumen',
    ACES: 'Konsumen', RALS: 'Konsumen', LPPF: 'Konsumen', MIDI: 'Konsumen',
    MIKA: 'Konsumen', SILO: 'Konsumen', HEAL: 'Konsumen', PRDA: 'Konsumen',
    // Properti
    SMGR: 'Properti', PWON: 'Properti', BSDE: 'Properti', CTRA: 'Properti',
    LPKR: 'Properti', MKPI: 'Properti', ASRI: 'Properti', KIJA: 'Properti',
    DUTI: 'Properti', ELTY: 'Properti', GPRA: 'Properti', PLIN: 'Properti',
    RODA: 'Properti', MAND: 'Properti', INPP: 'Properti', EMDE: 'Properti',
    // Teknologi
    GOTO: 'Teknologi', BUKA: 'Teknologi', DCII: 'Teknologi', EMTK: 'Teknologi',
    MLPT: 'Teknologi', KPAS: 'Teknologi', KBLV: 'Teknologi', AWSY: 'Teknologi',
    DIVA: 'Teknologi', EDGE: 'Teknologi', BAYU: 'Teknologi',
    // Otomotif
    ASII: 'Otomotif', DRMA: 'Otomotif', INDS: 'Otomotif', PRAS: 'Otomotif',
    LPIN: 'Otomotif', GJTL: 'Otomotif', BRAM: 'Otomotif', ARNA: 'Otomotif',
    AUTO: 'Otomotif', SMSM: 'Otomotif', IMAS: 'Otomotif', MASA: 'Otomotif',
    // Manufaktur & Industri
    INTP: 'Industri', SMCB: 'Industri', SMGR2: 'Industri', TKIM: 'Industri',
    INKP: 'Industri', TALF: 'Industri', FASW: 'Industri', IFII: 'Industri',
    KBLM: 'Industri', JKSW: 'Industri', FPNI: 'Industri', SULI2: 'Industri',
    AKRA: 'Industri', MPMX: 'Industri', ASII2: 'Industri',
    // Farmasi & Kesehatan
    KAEF: 'Kesehatan', INAF: 'Kesehatan', PYFA: 'Kesehatan', SIDO: 'Kesehatan',
    DVLA: 'Kesehatan', MERK: 'Kesehatan', TSPC: 'Kesehatan', PEHA: 'Kesehatan',
    // Media & Hiburan
    MNCN: 'Media', SCMA: 'Media', NETV: 'Media', BMTR: 'Media',
    MSIN: 'Media', MDIA: 'Media', VIVA: 'Media', CNMA: 'Media',
    // Transportasi
    BIRD: 'Transportasi', CMPP: 'Transportasi', SMDR: 'Transportasi',
    SDMU: 'Transportasi', TMAS: 'Transportasi', BBRM: 'Transportasi',
    // Keuangan & Asuransi
    BRPT: 'Keuangan', BBMD: 'Keuangan', ADMF: 'Keuangan', BAF: 'Keuangan',
    MFIN: 'Keuangan', PPRO: 'Keuangan', ASMI: 'Keuangan', BIMA: 'Keuangan',
    // Agrikultur
    TBLA: 'Agrikultur', ANJT: 'Agrikultur', GOLL: 'Agrikultur',
    // Listrik
    PGAS2: 'Energi', ABMM: 'Energi', MYOH2: 'Tambang',
};

// Peta sektor lengkap 910 emiten (hasil Yahoo assetProfile, di-generate scripts/build-sector-map.cjs)
import sectorData from "./sectorData.json";

const SECTOR_DATA = sectorData as Record<string, string>;

export function getSectorForCode(code: string): string {
    const normalized = code.toUpperCase().replace('.JK', '');
    // Static map lebih spesifik (Perbankan, Tambang, dst) — prioritas utama
    return SECTOR_MAP[normalized] || SECTOR_DATA[normalized] || 'Lainnya';
}