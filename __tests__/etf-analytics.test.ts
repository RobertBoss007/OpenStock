import { describe, expect, it } from 'vitest';
import { assetExposure, compareHoldings, comparisonDates, priorQuarterEnd, etfProfilePath, type HoldingsSnapshot } from '../lib/etf-analytics';
const base: HoldingsSnapshot = { symbol: 'VOO', provider: 'sec', source: 'https://www.sec.gov/', date: '2025-12-31', seriesId: 'S123', holdings: [] };
describe('ETF portfolio comparison', () => {
    it('accepts screenshot dates in either order and chooses a prior reporting quarter', () => {
        expect(comparisonDates('2026-11-18', '2026-05-01')).toEqual({ earlier: '2026-05-01', later: '2026-11-18', swapped: true });
        expect(comparisonDates('2026-05-01', '2026-11-18').swapped).toBe(false);
        expect(priorQuarterEnd('2026-06-30')).toBe('2026-03-31');
        expect(priorQuarterEnd('2026-01-31')).toBe('2025-12-31');
        expect(() => comparisonDates('2026-02-30', '2026-05-01')).toThrow('valid');
        expect(() => comparisonDates('2026-05-01', '2026-05-01')).toThrow('different');
    });
    it('aggregates duplicate security lots and detects exits and new positions', () => {
        const before = { ...base, holdings: [{ name: 'A', symbol: 'A', cusip: '123', weight: 2 }, { name: 'A', symbol: 'A', cusip: '123', weight: 1 }, { name: 'B', symbol: 'B', weight: 4 }] };
        const after = { ...base, date: '2026-03-31', holdings: [{ name: 'Renamed A', symbol: 'AA', cusip: '123', weight: 5 }, { name: 'C', symbol: 'C', weight: 1 }] };
        const changes = compareHoldings(before, after);
        expect(changes.find((row) => row.symbol === 'AA')).toMatchObject({ before: 3, after: 5, delta: 2, status: 'Held' });
        expect(changes.find((row) => row.symbol === 'B')).toMatchObject({ delta: -4, status: 'Exited' });
        expect(changes.find((row) => row.symbol === 'C')).toMatchObject({ before: 0, delta: 1, status: 'New' });
    });
    it('refuses mixed sources, different funds and identical report dates', () => {
        expect(() => compareHoldings(base, { ...base, provider: 'yahoo' })).toThrow('same fund');
        expect(() => compareHoldings(base, { ...base, seriesId: 'other' })).toThrow('same fund');
        expect(() => compareHoldings(base, base)).toThrow('different reporting dates');
    });
    it('preserves original category percentages without renormalizing', () => {
        expect(assetExposure({ ...base, holdings: [{ name: 'Stock', symbol: '', assetCategory: 'EC', weight: 98 }, { name: 'Cash', symbol: '', assetCategory: 'STIV', weight: 1 }] })).toEqual([{ name: 'EC', weight: 98 }, { name: 'STIV', weight: 1 }]);
        expect(etfProfilePath('LSE:IWDA')).toBe('/etfs/LSE%3AIWDA');
    });
});
