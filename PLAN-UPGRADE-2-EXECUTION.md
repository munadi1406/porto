# Execution Plan — UPGRADE-RECOMMENDATIONS 2.md

> Non-destructive UI refactor only. No API/WS contract change. Bilingual EN/ID retained.

## Status delta (already done in previous push `df07e5f`, `48c342d`, `f4f8925`)

| ID | Status | Note |
|----|--------|------|
| 2.1 Agregat hide | ✅ DONE | `navigation.ts:dead` filtered |
| 2.2 Command palette | ✅ DONE | live market-scan 959 |
| 2.3 Performa title | ✅ DONE | `analytics/page.tsx` bilingual |
| 2.4 navigation.ts | ✅ DONE | central config |
| 2.6 Group reorder 4 groups | ✅ DONE | market/analysis/reference/portfolio |
| 5.1 Empty watchlist/portfolio | ✅ DONE | always-visible CTA |
| 7.3 Mini IHSG collapsed | ✅ DONE | dot+▲▼% |
| 3.1 PageTabs | ⏳ stub created, not wired | `src/components/PageTabs.tsx` exists |
| 3.2 StatCard | ⏳ stub exists, not used globally | `src/components/StatCard.tsx` |
| 4.1/4.2 error/loading | ✅ DONE | 10 routes |
| 9 empty API 501 | ✅ DONE | 12 stubs |
| 2.5 Breadcrumb | ⏳ component exists, not placed | `Breadcrumb.tsx` |
| 3.4 chart tokens | ❌ TODO | hardcode #10b981 remains |
| 4.3 broker progress, 4.4 AiLoading, 4.5 screener ETA, 5.2 tooltip, 6.1 icons, 6.2 contrast, 7.x mobile, 8.x perf, 10.x placement, 11.x new features | ❌ TODO |

## Sprint execution order (dependencies)

### Sprint 1 Closure (S, 1 day)
1. 3.4 chart tokens → `globals.css --chart-*` → `analytics/page.tsx`, `compare`, `fundamentals` (S)
2. 4.3 broker progress text + 6.1 ▲▼ icons (reuse StatCard) (S)
3. 10.x quick placements: 10.1 dedup overview, 10.3 backtest reorder, 10.8 AI badge, 10.9 toolbar split (S each)

### Sprint 2 Consistency (M)
4. Wire PageTabs to 4 pages (screener, backtest, portfolio-dashboard, analysis 8-tab) (M)
5. Replace hero tiles with StatCard (M)
6. 8.3 staleTime 5-15m for stock-screener/sharia/corporate (S)
7. 10.2 analytics vs Performa label + 10.4 PositionCalculator toggle (S)

### Sprint 3 Discoverability & Mobile (M)
8. Breadcrumb placement in analysis/[ticker] (S)
9. 5.2 tooltip ? (M)
10. 7.1 8-tab dropdown + 7.2 table→card (M)

### Sprint 4 Perf & Infra (M)
11. 8.2 throttle publisher 3s→10-30s when closed (S)
12. 8.1 WsProvider unify (M)

### Sprint 5 New Features reuse-high (S-M)
13. 11.B6 Stress Test (analytics tab), 11.B4 Rebalancing Advisor (target tab), 11.B8 Tax 0.1% (/history), 11.B7 Journal note, 11.E15 Watchlist tags, 11.C9 Sector Rotation (sectors tab)

### Sprint 6 Infra-new (M)
14. 11.A1 Telegram alert via existing AlertChecker, 11.A2 corporate reminder, 11.A3 saved screener cron, etc.

### QA per sprint
- Build + vitest 115, WS subscribe 5 consumers, redirect compat, mobile 360/414, screen reader, AI timeout unchanged.

## Immediate next (this turn)
- Chart tokens + broker progress + 10.8 AI badge + 10.1 dedup (all S, no WS change)
