import { CryptoPrice } from './cryptoTypes';
import { getCryptoPrice, getHistoricalPrices } from './cryptoApi';

export interface TradingSignal {
    action: 'buy' | 'sell' | 'hold';
    confidence: number; // 0-100
    reasons: string[];
    score: number;
    indicators: {
        trend: 'bullish' | 'bearish' | 'neutral';
        momentum: number;
        volatility: number;
        rsi: number;
        macdSignal: 'buy' | 'sell' | 'neutral';
    };
}

export interface SmartBotConfig {
    riskTolerance: 'low' | 'medium' | 'high';
    minConfidence: number; // Minimum confidence to trade (0-100)
    useMultipleIndicators: boolean;
    adaptivePositionSizing: boolean;
    trendFollowing: boolean;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(prices: number[]): { macd: number; signal: 'buy' | 'sell' | 'neutral' } {
    if (prices.length < 26) return { macd: 0, signal: 'neutral' };

    // Simple EMA calculation
    const ema12 = prices.slice(-12).reduce((a, b) => a + b, 0) / 12;
    const ema26 = prices.slice(-26).reduce((a, b) => a + b, 0) / 26;
    const macd = ema12 - ema26;

    // Signal line (9-day EMA of MACD)
    const signal = macd > 0 ? 'buy' : macd < 0 ? 'sell' : 'neutral';

    return { macd, signal };
}

// Detect trend using moving averages
function detectTrend(prices: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (prices.length < 20) return 'neutral';

    const ma7 = prices.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const ma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentPrice = prices[prices.length - 1];

    if (currentPrice > ma7 && ma7 > ma20) return 'bullish';
    if (currentPrice < ma7 && ma7 < ma20) return 'bearish';
    return 'neutral';
}

// Calculate volatility
function calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * 100;

    return volatility;
}

// Calculate momentum
function calculateMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period) return 0;

    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - period];

    return ((currentPrice - pastPrice) / pastPrice) * 100;
}

// Smart trading signal generator
export function generateSmartSignal(
    crypto: string,
    currentPrice: CryptoPrice,
    config: SmartBotConfig
): TradingSignal {
    const historicalPrices = getHistoricalPrices(crypto, 48);
    const prices = historicalPrices.map(h => h.price);

    // Calculate indicators
    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const trend = detectTrend(prices);
    const volatility = calculateVolatility(prices);
    const momentum = calculateMomentum(prices);

    // Scoring system
    let score = 0;
    const reasons: string[] = [];

    // 1. RSI Analysis (30 points)
    if (rsi < 30) {
        score += 30;
        reasons.push(`RSI oversold (${rsi.toFixed(1)}) - Strong buy signal`);
    } else if (rsi < 40) {
        score += 15;
        reasons.push(`RSI low (${rsi.toFixed(1)}) - Moderate buy signal`);
    } else if (rsi > 70) {
        score -= 30;
        reasons.push(`RSI overbought (${rsi.toFixed(1)}) - Strong sell signal`);
    } else if (rsi > 60) {
        score -= 15;
        reasons.push(`RSI high (${rsi.toFixed(1)}) - Moderate sell signal`);
    }

    // 2. MACD Analysis (20 points)
    if (macd.signal === 'buy') {
        score += 20;
        reasons.push('MACD bullish crossover detected');
    } else if (macd.signal === 'sell') {
        score -= 20;
        reasons.push('MACD bearish crossover detected');
    }

    // 3. Trend Analysis (25 points)
    if (config.trendFollowing) {
        if (trend === 'bullish') {
            score += 25;
            reasons.push('Uptrend confirmed - Trend following');
        } else if (trend === 'bearish') {
            score -= 25;
            reasons.push('Downtrend confirmed - Avoid buying');
        }
    }

    // 4. Momentum Analysis (15 points)
    if (momentum > 5) {
        score += 15;
        reasons.push(`Strong upward momentum (+${momentum.toFixed(1)}%)`);
    } else if (momentum < -5) {
        score -= 15;
        reasons.push(`Strong downward momentum (${momentum.toFixed(1)}%)`);
    }

    // 5. Volatility Adjustment (10 points)
    if (volatility > 10) {
        score -= 10;
        reasons.push(`High volatility (${volatility.toFixed(1)}%) - Increased risk`);
    } else if (volatility < 3) {
        score += 5;
        reasons.push(`Low volatility (${volatility.toFixed(1)}%) - Stable conditions`);
    }

    // Determine action based on score
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = Math.min(Math.abs(score), 100);

    if (score > 30 && confidence >= config.minConfidence) {
        action = 'buy';
    } else if (score < -30 && confidence >= config.minConfidence) {
        action = 'sell';
    } else {
        reasons.push('Conditions not optimal - Holding position');
    }

    return {
        action,
        confidence,
        reasons,
        score,
        indicators: {
            trend,
            momentum,
            volatility,
            rsi,
            macdSignal: macd.signal
        }
    };
}

// Calculate optimal position size based on volatility (Kelly Criterion inspired)
export function calculateOptimalPositionSize(
    capital: number,
    volatility: number,
    riskTolerance: 'low' | 'medium' | 'high',
    winRate: number = 0.5
): number {
    // Base position size
    const baseSize = {
        low: 0.1,      // 10% of capital
        medium: 0.2,   // 20% of capital
        high: 0.3      // 30% of capital
    }[riskTolerance];

    // Adjust for volatility (reduce size in high volatility)
    const volatilityAdjustment = Math.max(0.5, 1 - (volatility / 20));

    // Adjust for win rate (increase size if winning)
    const winRateAdjustment = 0.5 + (winRate * 0.5);

    const optimalSize = capital * baseSize * volatilityAdjustment * winRateAdjustment;

    return Math.min(optimalSize, capital * 0.3); // Cap at 30%
}

// Analyze portfolio and suggest rebalancing
export function analyzePortfolio(positions: Array<{ crypto: string; value: number }>, totalCapital: number): {
    needsRebalancing: boolean;
    suggestions: string[];
} {
    const suggestions: string[] = [];
    let needsRebalancing = false;

    if (positions.length === 0) {
        return { needsRebalancing: false, suggestions: ['No positions to analyze'] };
    }

    // Check concentration risk
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    positions.forEach(pos => {
        const percentage = (pos.value / totalValue) * 100;
        if (percentage > 50) {
            needsRebalancing = true;
            suggestions.push(`${pos.crypto} is ${percentage.toFixed(1)}% of portfolio - Consider diversifying`);
        }
    });

    // Check if too many positions
    if (positions.length > 5) {
        suggestions.push('Too many positions - Consider consolidating');
    }

    // Check if underutilized capital
    const utilization = (totalValue / totalCapital) * 100;
    if (utilization < 30) {
        suggestions.push(`Only ${utilization.toFixed(1)}% capital deployed - Consider increasing exposure`);
    } else if (utilization > 80) {
        suggestions.push(`${utilization.toFixed(1)}% capital deployed - High exposure, be cautious`);
    }

    return { needsRebalancing, suggestions };
}
