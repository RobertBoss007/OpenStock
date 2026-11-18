import { describe, expect, it } from 'vitest';
import { searchEtfs } from '../lib/etf-search';
describe('ETF palette results', () => {
    it('finds VOO by ticker and exchange-qualified searches', () => {
        for (const query of ['voo', 'AMEX:VOO', 'VOO amex']) expect(searchEtfs(query)).toContainEqual(expect.objectContaining({ etfTv: 'AMEX:VOO', type: 'ETF', exchange: 'AMEX' }));
    });
    it('preserves listing identity and searches issuer names', () => {
        expect(searchEtfs('LSE IWDA')[0].etfTv).toBe('LSE:IWDA');
        expect(searchEtfs('Vanguard').every((result) => result.name.includes('Vanguard'))).toBe(true);
        expect(searchEtfs('')).toEqual([]);
    });
});
