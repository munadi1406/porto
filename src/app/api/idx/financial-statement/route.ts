import { NextRequest } from 'next/server';

// Financial Statement — menggunakan yahoo-finance2 fundamentalsTimeSeries
// (quoteSummary tidak lagi menyediakan nilai statement sejak Nov 2024)

let yf: any = null;

async function getYf() {
    if (!yf) {
        const YahooFinance = (await import('yahoo-finance2')).default;
        yf = new YahooFinance({ suppressNotices: ['yahooSurvey'], validateResult: false } as any);
    }
    return yf;
}

const period2 = () => Math.floor(Date.now() / 1000);
const period1 = (years: number) => period2() - years * 365 * 24 * 60 * 60;

// Coba 5 tahun dulu; jika modul kosong/gagal, fallback ke 3 tahun
async function fetchModule(symbol: string, module: string, type = 'annual') {
    // Coba type yang diminta, lalu fallback ke annual jika gagal (bank quarterly balance/cashflow kadang gagal validasi)
    const typesToTry = type === 'annual' ? ['annual'] : [type, 'annual'];
    for (const years of [5, 3]) {
        for (const t of typesToTry) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const result = await getYf().then((y: any) =>
                        y.fundamentalsTimeSeries(symbol, { module, type: t, period1: period1(years), period2: period2() })
                    );
                    if (Array.isArray(result) && result.length > 0) return result;
                } catch {}
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }
    return [];
}

// Yahoo membatasi fundamentalsTimeSeries quarterly sekitar lima titik per request.
// Ambil beberapa window historis lalu gabungkan agar tersedia tiga tahun kuartal.
async function fetchQuarterlyHistory(symbol: string, module: string) {
    const now = period2();
    const year = 365 * 24 * 60 * 60;
    const rows: any[] = [];
    for (const offset of [0, 2, 4]) {
        const end = now - offset * year;
        const start = end - 2 * year;
        try {
            const result = await getYf().then((y: any) =>
                y.fundamentalsTimeSeries(symbol, { module, type: 'quarterly', period1: start, period2: end })
            );
            if (Array.isArray(result)) rows.push(...result);
        } catch {}
    }
    const unique = new Map<string, any>();
    for (const row of rows) {
        const key = normDate(row);
        if (key) unique.set(key, row);
    }
    return [...unique.values()].sort((a, b) => normDate(a).localeCompare(normDate(b)));
}

// Ambil nilai dari item (bisa number langsung atau {raw, fmt})
function val(item: any, ...keys: string[]): number | null {
    for (const k of keys) {
        if (item == null) break;
        const raw = item[k];
        if (raw == null) continue;
        if (typeof raw === 'number') return raw;
        if (raw?.raw != null && typeof raw.raw === 'number') return raw.raw;
    }
    return null;
}

function normDate(item: any): string {
    const d = item?.date;
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
    try {
        const code = (req.nextUrl.searchParams.get('code') || 'BBCA').toUpperCase().replace('.JK', '');
        const symbol = `${code}.JK`;

        // Fetch 3 laporan keuangan (sequential untuk hindari rate limit)
        const periodType = req.nextUrl.searchParams.get('period') === 'quarterly' ? 'quarterly' : 'annual';
        const fetchHistory = periodType === 'quarterly' ? fetchQuarterlyHistory : fetchModule;
        const incomeRaw = await fetchHistory(symbol, 'financials', periodType);
        const balanceRaw = await fetchHistory(symbol, 'balance-sheet', periodType);
        const cashflowRaw = await fetchHistory(symbol, 'cash-flow', periodType);

        // Normalisasi income statement + metrik turunan per periode
        const incomeStatementHistory = incomeRaw.map((r: any) => ({
            period: normDate(r) || 'Annual',
            totalRevenue: val(r, 'operatingRevenue', 'totalRevenue', 'netInterestIncome', 'totalOperatingIncome'),
            costOfRevenue: val(r, 'costOfRevenue'),
            grossProfit: val(r, 'grossProfit', 'grossProfitIncomeStatement'),
            sgna: val(r, 'sellingGeneralAndAdministrationExpense', 'sgna', 'generalAndAdministrativeExpense'),
            researchAndDevelopment: val(r, 'researchAndDevelopmentExpense'),
            operatingExpenses: val(r, 'operatingExpenses'),
            operatingIncome: val(r, 'operatingIncome', 'operatingIncome2'),
            ebitda: val(r, 'ebitda', 'normalizedEBITDA'),
            depreciationAndAmortization: val(r, 'depreciationAmortizationDepletion', 'depreciationAndAmortization'),
            netInterestIncome: val(r, 'netInterestIncome'),
            nonInterestIncome: val(r, 'nonInterestIncome'),
            interestExpense: val(r, 'interestExpense'),
            preTaxIncome: val(r, 'pretaxIncome', 'incomeBeforeTax'),
            taxProvision: val(r, 'taxProvision', 'incomeTaxExpenseBenefit'),
            specialIncomeCharges: val(r, 'specialIncomeCharges'),
            netIncome: val(r, 'netIncome', 'netIncomeCommonStockholders', 'netIncomeFromContinuingAndDiscontinuedOperation'),
            dilutedEPS: val(r, 'dilutedEPS', 'dilutedEps'),
            basicEPS: val(r, 'basicEPS', 'basicEps'),
            dilutedAverageShares: val(r, 'dilutedAverageShares', 'basicAverageShares'),
            shareBasedCompensation: val(r, 'shareBasedCompensationExpense'),
        })).filter((r: any) => r.totalRevenue != null || r.netIncome != null)
          .map((r: any, i: number, arr: any[]) => {
            const prev = arr[i - 1];
            return {
                ...r,
                revenueGrowth: r.totalRevenue && prev?.totalRevenue ? (r.totalRevenue - prev.totalRevenue) / Math.abs(prev.totalRevenue) : null,
                profitGrowth: r.netIncome && prev?.netIncome ? (r.netIncome - prev.netIncome) / Math.abs(prev.netIncome) : null,
                grossMargin: r.totalRevenue ? ((r.grossProfit ?? r.netInterestIncome ?? 0) / r.totalRevenue) * 100 : null,
                operatingMargin: r.totalRevenue ? ((r.operatingIncome ?? r.ebitda ?? 0) / r.totalRevenue) * 100 : null,
                netMargin: r.totalRevenue ? ((r.netIncome ?? 0) / r.totalRevenue) * 100 : null,
                effectiveTaxRate: r.preTaxIncome ? ((r.taxProvision ?? 0) / r.preTaxIncome) * 100 : null,
            };
        });

        // Normalisasi balance sheet + rasio turunan per periode
        const balanceSheetHistory = balanceRaw.map((r: any) => {
            const assets = val(r, 'totalAssets', 'totalAssetsReported', 'totalAssets2');
            const liab = val(r, 'totalLiabilitiesNetMinorityInterest', 'totalLiabilities', 'totalLiab');
            const equity = val(r, 'totalEquityGrossMinorityInterest', 'totalStockholderEquity', 'stockholdersEquity');
            const curA = val(r, 'totalCurrentAssets');
            const curL = val(r, 'totalCurrentLiabilities');
            return {
                year: normDate(r) || 'Annual',
                totalAssets: assets,
                totalCurrentAssets: curA,
                totalNonCurrentAssets: val(r, 'totalNonCurrentAssets'),
                totalLiab: liab,
                totalCurrentLiabilities: curL,
                totalNonCurrentLiabilities: val(r, 'totalNonCurrentLiabilitiesNetMinorityInterest'),
                totalStockholderEquity: equity,
                minorityInterest: val(r, 'minorityInterest'),
                cash: val(r, 'cashCashEquivalentsFederalFundsSold', 'cashCashEquivalentsAndFederalFundsSold', 'cashAndCashEquivalents'),
                shortTermInvestments: val(r, 'otherShortTermInvestments', 'availableForSaleSecurities'),
                netReceivables: val(r, 'netReceivables', 'receivables'),
                inventory: val(r, 'inventory'),
                goodwill: val(r, 'goodwill'),
                intangibleAssets: val(r, 'goodwillAndOtherIntangibleAssets', 'intangibleAssets', 'otherIntangibleAssets'),
                propertyPlantEquipment: val(r, 'propertyPlantAndEquipment'),
                retainedEarnings: val(r, 'retainedEarnings', 'retainedEarningsCommonStockholders'),
                treasuryStock: val(r, 'treasuryStock'),
                commonStockShares: val(r, 'commonStock', 'shareIssued'),
                accountsPayable: val(r, 'accountsPayable', 'tradeandOtherPayablesNonCurrent'),
                longTermDebt: val(r, 'longTermDebtAndCapitalLeaseObligations', 'longTermDebt'),
                currentDebt: val(r, 'currentDebtAndCapitalLeaseObligation', 'currentDebt', 'currentPortionOfLongTermDebt'),
                totalDebt: val(r, 'totalDebt'),
                workingCapital: val(r, 'workingCapital') ?? (curA != null && curL != null ? curA - curL : null),
                netDebt: val(r, 'netDebt'),
                debtRatio: assets ? (liab ?? 0) / assets : null,
                currentRatio: curL ? (curA ?? 0) / curL : null,
                der: equity ? (liab ?? 0) / equity : null,
                tangibleBookValue: val(r, 'tangibleBookValue'),
            };
        }).filter((r: any) => r.totalAssets != null || r.totalStockholderEquity != null || r.totalLiab != null || r.cash != null);

        // Normalisasi cash flow + pos tambahan
        const cashflowStatementHistory = cashflowRaw.map((r: any) => ({
            period: normDate(r) || 'Annual',
            operatingCashflow: val(r, 'operatingCashFlow', 'cashFlowsfromusedinOperatingActivitiesDirect', 'totalCashFromOperatingActivities'),
            capitalExpenditures: val(r, 'capitalExpenditure', 'capex', 'purchaseOfPropertyPlantEquipment', 'purchaseOfPPE'),
            freeCashFlow: val(r, 'freeCashFlow'),
            investingCashflow: val(r, 'investingCashFlow', 'cashFlowFromInvestment'),
            financingCashflow: val(r, 'financingCashFlow', 'cashFlowFromFinancing'),
            dividendsPaid: val(r, 'cashDividendsPaid', 'dividendsPaid'),
            endCashPosition: val(r, 'endCashPosition'),
            beginningCashPosition: val(r, 'beginningCashPosition'),
            depreciationAndAmortization: val(r, 'depreciationAndAmortization', 'depreciationAmortizationDepletion', 'supplementalDepreciation'),
            stockBasedCompensation: val(r, 'stockBasedCompensation'),
            changeInWorkingCapital: val(r, 'changeInWorkingCapital'),
            taxesPaid: val(r, 'taxesPaid'),
            netIncome: val(r, 'netIncomeFromContinuingOperations', 'netIncome'),
            issuanceOfDebt: val(r, 'issuanceOfDebt'),
            repaymentOfDebt: val(r, 'repaymentOfDebt'),
            netIssuanceOfDebt: val(r, 'netIssuanceOfDebt'),
            repurchaseOfStock: val(r, 'repurchaseOfCapitalStock'),
            issuanceOfStock: val(r, 'issuanceOfCapitalstock'),
        })).filter((r: any) => r.operatingCashflow != null || r.freeCashFlow != null);

        // Hitung ringkasan (untuk tab Data IDX)
        const latestBalance = balanceRaw[balanceRaw.length - 1] || {};
        const latestIncome = incomeRaw[incomeRaw.length - 1] || {};
        const latestCash = cashflowRaw[cashflowRaw.length - 1] || {};

        const summaryBalance = {
            totalAssets: val(latestBalance, 'totalAssets', 'totalAssetsReported', 'totalAssets2'),
            totalLiabilities: val(latestBalance, 'totalLiabilitiesNetMinorityInterest', 'totalLiabilities', 'totalLiab'),
            totalEquity: val(latestBalance, 'totalEquityGrossMinorityInterest', 'totalStockholderEquity', 'stockholdersEquity'),
            currentAssets: val(latestBalance, 'totalCurrentAssets'),
            currentLiabilities: val(latestBalance, 'totalCurrentLiabilities'),
            cash: val(latestBalance, 'cashCashEquivalentsFederalFundsSold', 'cashCashEquivalentsAndFederalFundsSold', 'cashAndCashEquivalents'),
        };
        const summaryIncome = {
            sales: val(latestIncome, 'operatingRevenue', 'totalRevenue', 'netInterestIncome', 'totalOperatingIncome'),
            ebt: val(latestIncome, 'pretaxIncome', 'incomeBeforeTax'),
            profit: val(latestIncome, 'netIncome', 'netIncomeCommonStockholders'),
        };
        const summaryCash = {
            operatingCashflow: val(latestCash, 'operatingCashFlow', 'cashFlowsfromusedinOperatingActivitiesDirect', 'totalCashFromOperatingActivities'),
            freeCashFlow: val(latestCash, 'freeCashFlow'),
            financingCashflow: val(latestCash, 'financingCashFlow', 'cashFlowFromFinancing'),
        };

        // Quote untuk metrik pasar
        let quote: any = null;
        try {
            quote = await getYf().then((y: any) => y.quote(symbol));
        } catch {}

        // Rasio gabungan dari laporan terbaru
        const bAssets = summaryBalance.totalAssets ?? null;
        const bLiab = summaryBalance.totalLiabilities ?? null;
        const bEquity = summaryBalance.totalEquity ?? null;
        const bCash = summaryBalance.cash ?? null;
        const bDebt = val(latestBalance, 'totalDebt') ?? (((val(latestBalance, 'longTermDebtAndCapitalLeaseObligations', 'longTermDebt') || 0) + (val(latestBalance, 'currentDebtAndCapitalLeaseObligation', 'currentDebt') || 0)) || null);

        const iSales = summaryIncome.sales ?? null;
        const iProfit = summaryIncome.profit ?? null;
        const iGross = val(latestIncome, 'grossProfit', 'grossProfitIncomeStatement') ?? val(latestIncome, 'netInterestIncome');
        const iOpInc = val(latestIncome, 'operatingIncome', 'operatingIncome2');
        const iEbitda = val(latestIncome, 'ebitda', 'normalizedEBITDA');

        const prevIncome = incomeRaw.length >= 2 ? incomeRaw[incomeRaw.length - 2] : null;
        const prevSales = prevIncome ? val(prevIncome, 'operatingRevenue', 'totalRevenue', 'netInterestIncome') : null;
        const prevProfit = prevIncome ? val(prevIncome, 'netIncome', 'netIncomeCommonStockholders') : null;

        // Enterprise Value & EV/EBITDA
        const ev = quote?.marketCap != null ? quote.marketCap + (bDebt ?? 0) - (bCash ?? 0) : null;
        const evEbitda = ev != null && iEbitda ? ev / iEbitda : null;

        // Dividend info dari quoteSummary price/summaryDetail via quote fallback
        const divYield = quote?.trailingAnnualDividendYield ?? quote?.dividendYield ?? null;
        const divRate = quote?.trailingAnnualDividendRate ?? null;

        const summary = {
            source: 'yahoo-timeseries',
            code,
            name: quote?.shortName || quote?.longName || code,
            // Seluruh laporan emiten BEI dilaporkan dalam rupiah; simpan metadata
            // currency agar UI tidak memberi kesan angka sudah dikonversi kurs.
            financialCurrency: quote?.financialCurrency || quote?.currency || 'IDR',
            // Balance sheet
            totalAssets: bAssets,
            totalLiabilities: bLiab,
            totalEquity: bEquity,
            totalDebt: bDebt,
            netDebt: val(latestBalance, 'netDebt') ?? (bDebt != null && bCash != null ? bDebt - bCash : null),
            currentAssets: summaryBalance.currentAssets,
            currentLiabilities: summaryBalance.currentLiabilities,
            cash: bCash,
            workingCapital: val(latestBalance, 'workingCapital'),
            inventory: val(latestBalance, 'inventory'),
            retainedEarnings: val(latestBalance, 'retainedEarnings', 'retainedEarningsCommonStockholders'),
            longTermDebt: val(latestBalance, 'longTermDebtAndCapitalLeaseObligations', 'longTermDebt'),
            // Income
            sales: iSales,
            costOfRevenue: val(latestIncome, 'costOfRevenue'),
            grossProfit: iGross,
            operatingIncome: iOpInc,
            ebitda: iEbitda,
            ebt: summaryIncome.ebt,
            taxProvision: val(latestIncome, 'taxProvision', 'incomeTaxExpenseBenefit'),
            profit: iProfit,
            profitAttrOwner: val(latestIncome, 'netIncomeCommonStockholders', 'netIncome'),
            eps: val(latestIncome, 'basicEPS', 'basicEps', 'dilutedEPS'),
            dilutedEPS: val(latestIncome, 'dilutedEPS', 'dilutedEps'),
            netInterestIncome: val(latestIncome, 'netInterestIncome'),
            revenueGrowth: iSales != null && prevSales ? (iSales - prevSales) / Math.abs(prevSales) : null,
            profitGrowth: iProfit != null && prevProfit ? (iProfit - prevProfit) / Math.abs(prevProfit) : null,
            grossMargin: iSales ? ((iGross ?? 0) / iSales) * 100 : null,
            operatingMargin: iSales ? ((iOpInc ?? 0) / iSales) * 100 : null,
            netMargin: iSales && iProfit != null ? (iProfit / iSales) * 100 : null,
            effectiveTaxRate: summaryIncome.ebt ? ((val(latestIncome, 'taxProvision', 'incomeTaxExpenseBenefit') ?? 0) / summaryIncome.ebt) * 100 : null,
            // Cash flow
            operatingCashflow: summaryCash.operatingCashflow,
            capitalExpenditures: val(latestCash, 'capitalExpenditure', 'capex', 'purchaseOfPropertyPlantEquipment'),
            freeCashFlow: summaryCash.freeCashFlow,
            financingCashflow: summaryCash.financingCashflow,
            dividendsPaid: val(latestCash, 'cashDividendsPaid', 'dividendsPaid'),
            repurchaseOfStock: val(latestCash, 'repurchaseOfCapitalStock'),
            // Rasio keuangan terhitung
            roe: bEquity && iProfit != null ? (iProfit / bEquity) * 100 : null,
            roa: bAssets && iProfit != null ? (iProfit / bAssets) * 100 : null,
            der: bEquity ? (bLiab ?? 0) / bEquity : null,
            debtRatio: bAssets ? (bLiab ?? 0) / bAssets : null,
            currentRatio: summaryBalance.currentLiabilities ? (summaryBalance.currentAssets ?? 0) / summaryBalance.currentLiabilities : null,
            enterpriseValue: ev,
            evEbitda,
            // Market
            marketCap: quote?.marketCap || null,
            pe: quote?.trailingPE || null,
            per: quote?.trailingPE || null,
            pbv: quote?.priceToBook || null,
            bookValue: quote?.bookValue || null,
            sharesOutstanding: quote?.sharesOutstanding || null,
            dividendYield: divYield != null ? divYield * (divYield < 1 ? 100 : 1) : null,
            dividendPerShare: divRate,
            fsDate: normDate(latestIncome) || '',
            periodType,
            // Statement history untuk tab Laba Rugi/Neraca/Arus Kas
            incomeStatementHistory,
            balanceSheetHistory,
            cashflowStatementHistory,
        };

        return Response.json({ success: true, data: summary });
    } catch (error: any) {
        return Response.json({ success: true, data: null, error: error.message });
    }
}
