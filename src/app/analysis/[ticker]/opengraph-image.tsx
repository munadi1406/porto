import { ImageResponse } from 'next/og';

// OG image statis branded per ticker — Next.js otomatis render ke PNG
// saat link di-share di WhatsApp/Twitter/Discord.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Porto — Analisis Saham IDX';

export default async function OGImage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker } = await params;
    const code = ticker.replace('.JK', '').toUpperCase();

    return new ImageResponse(
        (
            <div
                style={{
                    width: 1200,
                    height: 630,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 48,
                    background: 'linear-gradient(135deg, #0d1726 0%, #1a2744 50%, #0d1726 100%)',
                    color: 'white',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative gradient circles */}
                <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,170,104,0.15), transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: -60, left: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)' }} />

                {/* Top: Porto brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #0eaa68, #14b8a6)',
                        fontSize: 28,
                        fontWeight: 900,
                        color: '#0d1726',
                    }}>
                        P
                    </div>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Porto</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase' }}>IDX Investment Terminal</div>
                    </div>
                </div>

                {/* Center: Ticker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -3, lineHeight: 1 }}>{code}</div>
                    <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                        Analisis Saham · Bursa Efek Indonesia
                    </div>
                </div>

                {/* Bottom: accent bar + URL */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        height: 4,
                        width: 180,
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, #0eaa68, #6366f1)',
                    }} />
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                        porto.app/analysis/{code}
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
