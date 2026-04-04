"use client";

import { useState } from "react";
import { CryptoBot, BotSettings } from "@/lib/cryptoTypes";
import { X } from "lucide-react";

interface CreateBotModalProps {
    onClose: () => void;
    onCreate: (bot: CryptoBot) => void;
}

const CRYPTO_OPTIONS = [
    // Major Cryptocurrencies
    { value: 'BTC', label: 'Bitcoin (BTC)', category: 'Major' },
    { value: 'ETH', label: 'Ethereum (ETH)', category: 'Major' },
    { value: 'BNB', label: 'Binance Coin (BNB)', category: 'Major' },

    // Altcoins
    { value: 'SOL', label: 'Solana (SOL)', category: 'Altcoin' },
    { value: 'ADA', label: 'Cardano (ADA)', category: 'Altcoin' },
    { value: 'XRP', label: 'Ripple (XRP)', category: 'Altcoin' },
    { value: 'MATIC', label: 'Polygon (MATIC)', category: 'Altcoin' },
    { value: 'DOT', label: 'Polkadot (DOT)', category: 'Altcoin' },
    { value: 'AVAX', label: 'Avalanche (AVAX)', category: 'Altcoin' },
    { value: 'LINK', label: 'Chainlink (LINK)', category: 'Altcoin' },
    { value: 'UNI', label: 'Uniswap (UNI)', category: 'Altcoin' },

    // Memecoins
    { value: 'DOGE', label: 'Dogecoin (DOGE)', category: 'Memecoin' },
    { value: 'SHIB', label: 'Shiba Inu (SHIB)', category: 'Memecoin' },
    { value: 'PEPE', label: 'Pepe (PEPE)', category: 'Memecoin' },
    { value: 'FLOKI', label: 'Floki (FLOKI)', category: 'Memecoin' },
    { value: 'BONK', label: 'Bonk (BONK)', category: 'Memecoin' },
];

const STRATEGY_OPTIONS = [
    { value: 'scalping', label: 'Scalping', description: 'Trading cepat untuk profit kecil tapi sering' },
    { value: 'swing', label: 'Swing Trading', description: 'Hold beberapa jam/hari untuk profit lebih besar' },
    { value: 'dca', label: 'DCA (Dollar Cost Averaging)', description: 'Beli secara berkala dengan jumlah tetap' },
    { value: 'grid', label: 'Grid Trading', description: 'Beli dan jual di level harga yang berbeda' },
];

export function CreateBotModal({ onClose, onCreate }: CreateBotModalProps) {
    const [name, setName] = useState('');
    const [strategy, setStrategy] = useState<'scalping' | 'swing' | 'dca' | 'grid'>('scalping');
    const [initialCapital, setInitialCapital] = useState(10000000);
    const [targetCrypto, setTargetCrypto] = useState('BTC');
    const [autoSelectMode, setAutoSelectMode] = useState(false);
    const [allowedCryptos, setAllowedCryptos] = useState<string[]>(['BTC', 'ETH', 'BNB', 'SOL', 'ADA']);
    const [buyThreshold, setBuyThreshold] = useState(2);
    const [sellThreshold, setSellThreshold] = useState(3);
    const [maxPositionSize, setMaxPositionSize] = useState(20);
    const [stopLoss, setStopLoss] = useState(5);
    const [takeProfit, setTakeProfit] = useState(10);
    const [scalpingInterval, setScalpingInterval] = useState(5);
    const [minProfitPercent, setMinProfitPercent] = useState(0.5);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const settings: BotSettings = {
            targetCrypto,
            autoSelectMode,
            allowedCryptos: autoSelectMode ? allowedCryptos : undefined,
            buyThreshold,
            sellThreshold,
            maxPositionSize,
            stopLoss,
            takeProfit,
            scalpingInterval,
            minProfitPercent,
        };

        const bot: CryptoBot = {
            id: Date.now().toString(),
            name: name || `${strategy.toUpperCase()} Bot${autoSelectMode ? ' - Auto Select' : ` - ${targetCrypto}`}`,
            strategy,
            initialCapital,
            currentCapital: initialCapital,
            isActive: false,
            createdAt: Date.now(),
            settings,
        };

        onCreate(bot);
    }

    function toggleCrypto(crypto: string) {
        if (allowedCryptos.includes(crypto)) {
            setAllowedCryptos(allowedCryptos.filter(c => c !== crypto));
        } else {
            setAllowedCryptos([...allowedCryptos, crypto]);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#23272f] rounded-2xl border border-gray-200 dark:border-[#2d3139] max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-200 dark:border-[#2d3139] flex items-center justify-between sticky top-0 bg-white dark:bg-[#23272f] z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Buat Bot Trading Baru</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    {/* Bot Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nama Bot (Opsional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: BTC Scalper Pro"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    {/* Strategy */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Strategi Trading
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {STRATEGY_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setStrategy(option.value as any)}
                                    className={`p-3 rounded-lg border-2 text-left transition-all ${strategy === option.value
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{option.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Initial Capital */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Modal Awal (IDR)
                        </label>
                        <input
                            type="number"
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(Number(e.target.value))}
                            min={1000000}
                            step={1000000}
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum 1 juta IDR</p>
                    </div>

                    {/* Auto-Select Mode */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="autoSelectMode"
                                checked={autoSelectMode}
                                onChange={(e) => setAutoSelectMode(e.target.checked)}
                                className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="flex-1">
                                <label htmlFor="autoSelectMode" className="block text-sm font-semibold text-gray-900 dark:text-white cursor-pointer">
                                    🤖 Mode Auto-Select (RECOMMENDED)
                                </label>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Bot akan otomatis memilih cryptocurrency terbaik untuk trading berdasarkan analisis pasar real-time
                                </p>
                            </div>
                        </div>

                        {/* Allowed Cryptos Selection */}
                        {autoSelectMode && (
                            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Pilih Cryptocurrency yang Diizinkan:
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {CRYPTO_OPTIONS.map(option => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${allowedCryptos.includes(option.value)
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={allowedCryptos.includes(option.value)}
                                                onChange={() => toggleCrypto(option.value)}
                                                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                            />
                                            <span className="text-xs font-medium text-gray-900 dark:text-white">{option.value}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    ✅ Dipilih: {allowedCryptos.length} crypto | Bot akan scan dan pilih yang paling profitable
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Target Crypto - Only show when auto-select is disabled */}
                    {!autoSelectMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Cryptocurrency Target
                            </label>
                            <select
                                value={targetCrypto}
                                onChange={(e) => setTargetCrypto(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                {CRYPTO_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Bot hanya akan trading cryptocurrency ini</p>
                        </div>
                    )}

                    {/* Trading Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Buy Threshold (%)
                            </label>
                            <input
                                type="number"
                                value={buyThreshold}
                                onChange={(e) => setBuyThreshold(Number(e.target.value))}
                                min={0.1}
                                step={0.1}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Beli saat turun X%</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sell Threshold (%)
                            </label>
                            <input
                                type="number"
                                value={sellThreshold}
                                onChange={(e) => setSellThreshold(Number(e.target.value))}
                                min={0.1}
                                step={0.1}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Jual saat naik X%</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Max Position (%)
                            </label>
                            <input
                                type="number"
                                value={maxPositionSize}
                                onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                                min={1}
                                max={100}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Max % modal per trade</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Stop Loss (%)
                            </label>
                            <input
                                type="number"
                                value={stopLoss}
                                onChange={(e) => setStopLoss(Number(e.target.value))}
                                min={0.1}
                                step={0.1}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Cut loss saat rugi X%</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Take Profit (%)
                            </label>
                            <input
                                type="number"
                                value={takeProfit}
                                onChange={(e) => setTakeProfit(Number(e.target.value))}
                                min={0.1}
                                step={0.1}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Jual saat profit X%</p>
                        </div>
                    </div>

                    {/* Scalping Specific */}
                    {strategy === 'scalping' && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Interval (detik)
                                </label>
                                <input
                                    type="number"
                                    value={scalpingInterval}
                                    onChange={(e) => setScalpingInterval(Number(e.target.value))}
                                    min={1}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Min Profit (%)
                                </label>
                                <input
                                    type="number"
                                    value={minProfitPercent}
                                    onChange={(e) => setMinProfitPercent(Number(e.target.value))}
                                    min={0.1}
                                    step={0.1}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1d23] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Buat Bot
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
