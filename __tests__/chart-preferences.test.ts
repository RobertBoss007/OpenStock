import { describe, expect, it } from 'vitest';
import { GLOBAL_INTERVAL_KEY, GLOBAL_STUDIES_KEY, normalizeChartPreferences, readChartPreferences, tickerChartKey } from '../lib/chart-preferences';
describe('per-listing chart preferences', () => {
    const allowed = ['STD;SMA', 'STD;RSI'];
    it('keeps ticker overrides separate and falls back to legacy global settings', () => {
        const data = new Map<string, string>([[GLOBAL_STUDIES_KEY, '["STD;SMA"]'], [GLOBAL_INTERVAL_KEY, 'W'], [tickerChartKey('AMEX:VOO'), JSON.stringify({ studies: ['STD;RSI'], interval: '240' })]]);
        const storage = { getItem: (key: string) => data.get(key) ?? null };
        expect(readChartPreferences(storage, 'AMEX:VOO', allowed)).toEqual({ scope: 'ticker', preferences: { studies: ['STD;RSI'], interval: '240' } });
        expect(readChartPreferences(storage, 'AMEX:IVV', allowed)).toEqual({ scope: 'global', preferences: { studies: ['STD;SMA'], interval: 'W' } });
        data.delete(tickerChartKey('AMEX:VOO'));
        expect(readChartPreferences(storage, 'AMEX:VOO', allowed).scope).toBe('global');
    });
    it('rejects unknown indicator IDs and malformed preferences', () => {
        expect(normalizeChartPreferences({ studies: ['invalid', 'STD;RSI'], interval: 'bad' }, allowed)).toEqual({ studies: ['STD;RSI'], interval: 'D' });
        expect(readChartPreferences({ getItem: () => '{broken' }, 'AMEX:VOO', allowed)).toEqual({ scope: 'global', preferences: { studies: [], interval: 'D' } });
    });
});
