export interface PortionInput {
    allocationPct: number;
    entryPrice: number;
}

export interface PositionInput {
    modal: number;
    stopLossPct: number;
    riskPerTradePct: number;
    portions: PortionInput[];
}

export interface PortionDetail {
    portionNum: number;
    allocationPct: number;
    entryPrice: number;
    stopLossPrice: number;
    lots: number;
    shares: number;
    investment: number;
    riskAmount: number;
    riskPctOfModal: number;
}

export interface PositionResult {
    totalLots: number;
    totalShares: number;
    totalInvestment: number;
    totalRiskAmount: number;
    totalRiskPct: number;
    avgEntryPrice: number;
    riskRewardRatio: number | null;
    portions: PortionDetail[];
    warnings: string[];
}

const LOT_SIZE = 100;

function roundDownToLot(shares: number): number {
    return Math.floor(shares / LOT_SIZE) * LOT_SIZE;
}

export function calculatePosition(input: PositionInput): PositionResult {
    const { modal, stopLossPct, riskPerTradePct, portions } = input;
    const warnings: string[] = [];

    if (modal <= 0) warnings.push("Modal harus lebih dari 0");
    if (stopLossPct <= 0 || stopLossPct >= 100) warnings.push("Stop Loss harus antara 0-100%");
    if (riskPerTradePct <= 0 || riskPerTradePct > 100) warnings.push("Risk per trade harus antara 0-100%");

    const totalAllocation = portions.reduce((s, p) => s + p.allocationPct, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
        warnings.push(`Total alokasi ${totalAllocation.toFixed(1)}% — seharusnya 100%`);
    }

    const riskBudget = modal * (riskPerTradePct / 100);

    const detail: PortionDetail[] = portions.map((p, i) => {
        const stopLossPrice = p.entryPrice * (1 - stopLossPct / 100);
        const riskPerShare = p.entryPrice - stopLossPrice;

        let shares = 0;
        if (riskPerShare > 0) {
            const allocBudget = modal * (p.allocationPct / 100);
            const maxByBudget = Math.floor(allocBudget / p.entryPrice);
            const maxByRisk = riskBudget > 0 ? Math.floor(riskBudget / riskPerShare) : maxByBudget;
            shares = roundDownToLot(Math.min(maxByBudget, maxByRisk));
        }

        const lots = Math.floor(shares / LOT_SIZE);
        const investment = shares * p.entryPrice;
        const riskAmount = shares * riskPerShare;
        const riskPctOfModal = modal > 0 ? (riskAmount / modal) * 100 : 0;

        return {
            portionNum: i + 1,
            allocationPct: p.allocationPct,
            entryPrice: p.entryPrice,
            stopLossPrice,
            lots,
            shares,
            investment,
            riskAmount,
            riskPctOfModal,
        };
    });

    const totalLots = detail.reduce((s, d) => s + d.lots, 0);
    const totalShares = detail.reduce((s, d) => s + d.shares, 0);
    const totalInvestment = detail.reduce((s, d) => s + d.investment, 0);
    const totalRiskAmount = detail.reduce((s, d) => s + d.riskAmount, 0);
    const totalRiskPct = modal > 0 ? (totalRiskAmount / modal) * 100 : 0;

    let avgEntryPrice = 0;
    if (totalShares > 0) {
        avgEntryPrice = detail.reduce((s, d) => s + d.entryPrice * d.shares, 0) / totalShares;
    }

    let riskRewardRatio: number | null = null;
    if (totalRiskAmount > 0) {
        const avgReturnPct = 10;
        const expectedGain = totalInvestment * (avgReturnPct / 100);
        riskRewardRatio = expectedGain / totalRiskAmount;
    }

    if (totalInvestment > modal) {
        warnings.push("Total investasi melebihi modal!");
    }
    if (totalRiskPct > 5) {
        warnings.push(`Total risiko ${totalRiskPct.toFixed(1)}% — melebihi 5% modal (agresif)`);
    }
    if (totalLots === 0 && modal > 0) {
        warnings.push("Tidak ada lot yang bisa dibeli — periksa harga entry dan SL");
    }

    return {
        totalLots,
        totalShares,
        totalInvestment,
        totalRiskAmount,
        totalRiskPct,
        avgEntryPrice,
        riskRewardRatio,
        portions: detail,
        warnings,
    };
}

export function formatRupiah(n: number): string {
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export function defaultPortions(count: number): PortionInput[] {
    if (count <= 0) return [];
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    return Array.from({ length: count }, (_, i) => ({
        allocationPct: i === 0 ? base + remainder : base,
        entryPrice: 0,
    }));
}
