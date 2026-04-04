'use client';

import { useState } from 'react';
import { StockBot, POPULAR_IDX_STOCKS } from '@/lib/stockBotTypes';

interface CreateStockBotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateBot: (bot: StockBot) => void;
}

export default function CreateStockBotModal({ isOpen, onClose, onCreateBot }: CreateStockBotModalProps) {
    const [name, setName] = useState('');
    const [strategy, setStrategy] = useState<'scalping' | 'swing' | 'dca' | 'breakout'>('scalping');
    const [initialCapital, setInitialCapital] = useState(10000000); // 10 juta default
    const [targetStock, setTargetStock] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [buyThreshold, setBuyThreshold] = useState(2);
    const [sellThreshold, setSellThreshold] = useState(2);
    const [maxPositionSize, setMaxPositionSize] = useState(30);
    const [stopLoss, setStopLoss] = useState(5);
    const [takeProfit, setTakeProfit] = useState(5);
    const [scalpingInterval, setScalpingInterval] = useState(5);
    const [minProfitPercent, setMinProfitPercent] = useState(0.5);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate stock symbol
        if (!targetStock.trim()) {
            alert('Mohon masukkan kode saham (contoh: BBCA.JK)');
            return;
        }

        const bot: StockBot = {
            id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name || `Bot ${strategy.toUpperCase()}`,
            strategy,
            initialCapital,
            currentCapital: initialCapital,
            isActive: false,
            createdAt: Date.now(),
            settings: {
                targetStock: targetStock.toUpperCase(),
                autoSelectMode: false,
                buyThreshold,
                sellThreshold,
                maxPositionSize,
                stopLoss,
                takeProfit,
                scalpingInterval,
                minProfitPercent,
            },
        };

        onCreateBot(bot);
        handleClose();
    };

    const handleClose = () => {
        setName('');
        setStrategy('scalping');
        setInitialCapital(10000000);
        setTargetStock('');
        setShowSuggestions(false);
        setBuyThreshold(2);
        setSellThreshold(2);
        setMaxPositionSize(30);
        setStopLoss(5);
        setTakeProfit(5);
        setScalpingInterval(5);
        setMinProfitPercent(0.5);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-white">🤖 Buat Bot Saham Baru</h2>
                    <p className="text-blue-100 mt-1">Konfigurasi bot trading otomatis untuk saham Indonesia</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nama Bot (opsional)
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Bot BCA Scalper"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Strategi Trading
                            </label>
                            <select
                                value={strategy}
                                onChange={(e) => setStrategy(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="scalping">Scalping - Trading cepat, profit kecil</option>
                                <option value="swing">Swing - Hold beberapa hari</option>
                                <option value="dca">DCA - Beli berkala</option>
                                <option value="breakout">Breakout - Momentum trading</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Modal Awal (Rp)
                            </label>
                            <input
                                type="number"
                                value={initialCapital}
                                onChange={(e) => setInitialCapital(Number(e.target.value))}
                                min="1000000"
                                step="1000000"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Minimum: Rp 1.000.000 (1 juta)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Target Saham
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={targetStock}
                                    onChange={(e) => {
                                        setTargetStock(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="Contoh: BBCA.JK, TLKM.JK, GOTO.JK"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {showSuggestions && targetStock.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {POPULAR_IDX_STOCKS
                                            .filter(stock =>
                                                stock.symbol.toLowerCase().includes(targetStock.toLowerCase()) ||
                                                stock.name.toLowerCase().includes(targetStock.toLowerCase())
                                            )
                                            .map(stock => (
                                                <button
                                                    key={stock.symbol}
                                                    type="button"
                                                    onClick={() => {
                                                        setTargetStock(stock.symbol);
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors"
                                                >
                                                    <div className="text-sm font-medium text-white">
                                                        {stock.symbol.replace('.JK', '')}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {stock.name}
                                                    </div>
                                                </button>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Masukkan kode saham IDX (contoh: BBCA.JK). Klik untuk lihat saran.
                            </p>
                        </div>
                    </div>

                    {/* Trading Parameters */}
                    <div className="border-t border-slate-700 pt-6 space-y-4">
                        <h3 className="text-lg font-semibold text-white mb-4">⚙️ Parameter Trading</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Buy Threshold (%)
                                </label>
                                <input
                                    type="number"
                                    value={buyThreshold}
                                    onChange={(e) => setBuyThreshold(Number(e.target.value))}
                                    min="0.1"
                                    step="0.1"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Beli saat turun ≥ X%</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Sell Threshold (%)
                                </label>
                                <input
                                    type="number"
                                    value={sellThreshold}
                                    onChange={(e) => setSellThreshold(Number(e.target.value))}
                                    min="0.1"
                                    step="0.1"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Jual saat naik ≥ X%</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Max Position (%)
                                </label>
                                <input
                                    type="number"
                                    value={maxPositionSize}
                                    onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                                    min="10"
                                    max="100"
                                    step="5"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Max modal per trade</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Stop Loss (%)
                                </label>
                                <input
                                    type="number"
                                    value={stopLoss}
                                    onChange={(e) => setStopLoss(Number(e.target.value))}
                                    min="1"
                                    step="0.5"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Cut loss saat rugi X%</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Take Profit (%)
                                </label>
                                <input
                                    type="number"
                                    value={takeProfit}
                                    onChange={(e) => setTakeProfit(Number(e.target.value))}
                                    min="1"
                                    step="0.5"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Ambil untung saat X%</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Interval (detik)
                                </label>
                                <input
                                    type="number"
                                    value={scalpingInterval}
                                    onChange={(e) => setScalpingInterval(Number(e.target.value))}
                                    min="3"
                                    step="1"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Cek harga tiap X detik</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Min Profit untuk Scalping (%)
                            </label>
                            <input
                                type="number"
                                value={minProfitPercent}
                                onChange={(e) => setMinProfitPercent(Number(e.target.value))}
                                min="0.1"
                                step="0.1"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-400 mt-1">Profit minimum untuk scalping</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
                        >
                            🚀 Buat Bot
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
