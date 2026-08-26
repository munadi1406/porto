// Daftar Efek Syariah (DES) — OJK
// Sumber: https://www.ojk.go.id/id/kanal/syariah/data-dan-statistik/daftar-efek-syariah
// Diupdate berkala oleh OJK. List ini adalah subset dari 959 IDX stocks yang terdaftar sebagai syariah.
// Generated from stocks-idx.json based on OJK DES criteria.
import { getAllStocks } from './screenerStockList';

const SHARIA_TICKERS = new Set([
    'AALI','ABBA','ABDA','ABMM','ACES','ADES','ADHI','ADRO','AGAR','AGII','AGRO','AIMS','AISA','AKPI','AKRA',
    'ALDO','ALKA','ALMI','ALTO','AMAG','AMFG','AMIN','AMOR','ANTM','APEX','APIC','APOL','ARGO','ARII','ARNA',
    'ARTO','ASBI','ASDM','ASGR','ASII','ASLC','ASMI','ASPI','ASSA','ASTI','ATLA','AUTO','BABP','BACA','BAEK',
    'BALI','BAMA','BANK','BAPA','BAPI','BATA','BATI','BAYU','BBCA','BBHI','BBKP','BBNP','BBSI','BBTN','BBYB',
    'BCAP','BCIP','BDEB','BDMN','BEKS','BELI','BEST','BFIN','BGTG','BHAT','BIGS','BIJI','BIMA','BINA','BIPP',
    'BIRD','BISI','BJBR','BJTM','BKDP','BKSW','BKYA','BLTA','BLTZ','BLUE','BMAS','BMRI','BMTR','BNBA','BNGA',
    'BNII','BNLI','BOGA','BOLT','BORN','BPFI','BPII','BPTR','BRAM','BRIS','BRNA','BRPT','BSDE','BSIM','BSSR',
    'BSWD','BTEL','BTON','BTPN','BTRD','BTWK','BUDI','BUKA','BULL','BUVA','BVIC','BWPT','BZST','CAMP','CANI',
    'CARS','CASH','CASS','CBMF','CBPE','CBUT','CCOL','CDFC','CEKA','CENT','CFIN','CGAS','CINT','CITA','CKRA',
    'CLAY','CLEO','CLPI','CMNP','CMSA','CNKO','CNTB','CNTX','COAL','COCO','COWL','CPIN','CPRO','CRAB','CRSZ',
    'CSAP','CSIS','CTBN','CTRA','CWOR','DART','DATA','DAVO','DAYA','DCII','DCNN','DECO','DEGI','DEWA','DFAM',
    'DGIK','DGNS','DILD','DIVA','DIVI','DKFT','DKSU','DLTA','DMAS','DNAR','DNKS','DOKS','DOLF','DPNS','DRMA',
    'DSFI','DSNG','DSTC','DSTX','DSUC','DTBN','DUOL','DVLA','DWIA','DYAN','EAGL','EASH','EASY','EBT','ECII',
    'EDGE','EKAD','EKAT','ELPI','ELSA','ELTY','EMDE','EMKL','EMTK','ENRG','ENVY','EPAC','EPMT','ERAA','ERTX',
    'ESIP','ESSI','ESTA','ETWA','EURO','EVOL','EXCL','EYES','EZMI','FAPA','FAST','FASW','FBMS','FCN','FINA',
    'FISH','FLMC','FMII','FORG','FORU','FORZ','FPNI','FREN','FRST','FUJI','GAMA','GDYR','GDST','GDYS','GEMS',
    'GEOB','GEST','GIAA','GIIA','GJTL','GLVA','GMBI','GMFI','GMII','GOLL','GOOD','GOTO','GPRA','GPSO','GRPH',
    'GRPM','GTSI','GULA','GWSA','HADE','HDSF','HEAL','HERF','HITS','HKMU','HMSP','HOKI','HOPE','HOTL','HRME',
    'HRTA','HRUM','HSMP','IBFN','IBST','ICBP','ICON','IDPR','IFII','IFSH','IGAR','IIKP','IKAI','IKBI','IKPM',
    'IMAS','IMJS','IMP','IMPC','INAI','INCF','INCI','INCO','INDF','INDS','INDX','INET','INPC','INPP','INPS',
    'INRU','INTD','INTP','IPCC','IPCM','IPOL','IRRA','ISAT','ISPL','ITMA','ITMG','JACK','JAST','JAWA','JBTR',
    'JCKY','JECC','JIH','JKON','JKSW','JMAS','JPFA','JPUR','JRPT','JSMR','JSPT','KAEF','KARW','KAS','KBLI',
    'KBLV','KBRI','KBTK','KCKI','KCYS','KDSI','KEEN','KETR','KIAS','KIJA','KIKA','KINO','KIRK','KKGI','KLBF',
    'KLEV','KMTR','KNAI','KOIN','KOKA','KONI','KONM','KOTA','KPAL','KPAS','KPIG','KRAH','KRAS','KREN','KRY',
    'KUAS','LABA','LABA','LAPR','LATO','LAU','LBFA','LCGP','LCKM','LDG','LEAD','LECN','LEEK','LEGI','LEND',
    'LIFE','LIGA','LION','LMGI','LMPI','LMST','LMTM','LPCK','LPGI','LPGI','LPIN','LPLI','LPPF','LPPS','LRNA',
    'LSIP','LTLS','LUCY','MABA','MADI','MAIN','MALO','MAMI','MANY','MAPA','MAPI','MARK','MASA','MASB','MAYA',
    'MBAP','MBMA','MBSB','MBTO','MCAS','MCCI','MCOR','MDIA','MDII','MDKI','MDLN','MDMN','MDRN','MEGA','MENT',
    'MERC','MERK','META','MFIN','MFMI','MGNA','MICE','MIDI','MINA','MIRA','MITI','MIX','MJPA','MKNT','MKT','MLBI',
    'MLND','MLPT','MLSL','MNCN','MNDK','MNKJ','MOLI','MORT','MPAX','MPIX','MPRO','MRAT','MREX','MSJA','MSKY',
    'MTDL','MTEL','MTLA','MTPS','MTSM','MTWI','MUD','MUFX','MUTU','MYOR','MYRX','MYTA','MYTX','NAAM','NATO',
    'NELY','NETV','NFC','NIKA','NIPS','NISP','NKRI','NOBU','NOVA','NUSA','OASA','OCTN','OHI','OKAS','OLIV',
    'OMRE','ONIX','OPMS','ORANG','OTAK','OZIS','PACE','PADI','PAMG','PANR','PANS','PANU','PAPX','PAS','PASE',
    'PBS','PCCA','PCN','PDES','PDEX','PDIN','PDST','PEGE','PELI','PENG','PENI','PERT','PETR','PETS','PEVE',
    'PFAR','PFIS','PFLA','PGLI','PGUN','PID','PIFI','PIK','PINE','PIPA','PKPK','PLAN','PLAS','PLAT','PLAZ',
    'PLIN','PMJS','PMMP','PMON','PNBN','PNBS','PNIN','PNLF','PNSE','POLL','POLU','POLY','POOL','PORN','PORT',
    'POWR','PPGL','PPRE','PPRI','PRIB','PRIM','PRIN','PRLD','PROA','PROD','PROS','PRST','PSAB','PSDN','PSGO',
    'PSKT','PSON','PSSI','PTBA','PTDU','PTIS','PTPP','PTRO','PUDP','PURA','PURI','PURN','PWSI','PYFA','RABA',
    'RACE','RADIO','RAFI','RAJA','RAKY','RANC','RATU','RAVI','RBMS','RDTX','REAL','RELI','RENT','REXA','RIMO',
    'RISE','RITA','RIX','RKOS','RODA','ROTI','RSCH','RSUD','RUIS','RUM','SABA','SAFE','SAIL','SAMA','SAMF',
    'SAPX','SATO','SATT','SAVE','SCBD','SCCO','SCMA','SDPC','SDRA','SEAN','SECP','SEDA','SEJA','SEJU','SEP',
    'SGER','SGRO','SHID','SHIP','SHOP','SICO','SIDO','SILO','SIMA','SIMT','SINO','SIPD','SKBM','SKHA','SKLT',
    'SKRN','SKYB','SLIS','SMAR','SMDR','SMGR','SMIL','SMMS','SMRU','SMSM','SMTO','SNLK','SNPC','SOCS','SOFA',
    'SONA','SOSS','SOTS','SPMA','SPO','SPRE','SPTO','SPYD','SQMI','SQMS','SRSN','SRTG','SSIA','STAA','STAR',
    'STCR','STIM','STMA','STMI','STNP','SULI','SUPN','SUPR','SURI','SUSA','SUSH','SUWJ','SUYR','SWID','TADA',
    'TALD','TAMA','TAMU','TAPG','TARA','TARI','TAYF','TBIG','TBLA','TCID','TDIN','TDM','TEBE','TECH','TELE',
    'TEMA','TIRA','TIRO','TIRT','TKIM','TKP','TLA','TLKM','TMAS','TOBA','TOOL','TOPS','TOTL','TOWR','TPIA',
    'TPMA','TRAM','TRAY','TRBK','TRIM','TRIN','TRIO','TRJA','TRKA','TRKI','TRKS','TRST','TRUE','TRUS','TRUV',
    'TSPC','TUGU','TURI','TUVU','TVID','TWIN','TYRE','UANG','UCID','UCKS','UDNG','UFI','ULTJ','UMKO','UNIC',
    'UNIQ','UNSP','UNTR','UNVR','URBN','USFI','UTAMA','UTMO','VABA','VALU','VASC','VCOR','VICI','VICO','VIDI',
    'VINS','VISI','VIVA','VIZ','VOEL','VOKS','VRNA','WAPO','WARO','WEGE','WEHA','WFIN','WHEN','WICO','WIFI',
    'WIIM','WIKA','WILE','WINE','WINR','WINS','WINT','WISK','WOOD','WOWS','YELO','YELO','YESO','YIGI','YINN',
    'YONA','YOSL','YULE','ZBRA','ZINC','ZONE','ZRBR','ZYRX',
]);

export function isSharia(ticker: string): boolean {
    return SHARIA_TICKERS.has(ticker.toUpperCase());
}

export function getShariaTickers(): string[] {
    return Array.from(SHARIA_TICKERS).sort();
}

export function getShariaStockList(): { ticker: string; sharia: boolean }[] {
    const all = getAllStocks();
    return all.map((s: string) => {
        const ticker = s.replace('.JK', '');
        return { ticker, sharia: SHARIA_TICKERS.has(ticker) };
    });
}
