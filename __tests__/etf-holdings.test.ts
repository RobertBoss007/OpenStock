import { describe, expect, it } from 'vitest';
import { parseHoldingsCsv } from '../lib/etf-holdings';

describe('issuer holdings import', () => {
    it('handles metadata, quoted commas and original percentage weights', () => {
        expect(parseHoldingsCsv('Fund,Example\nTicker,Name,Weight (%)\nA,"Company, Inc.",2.25\nB,Other,8.50%\nTotal,Total,100')).toEqual([
            { symbol: 'B', name: 'Other', weight: 8.5 }, { symbol: 'A', name: 'Company, Inc.', weight: 2.25 },
        ]);
    });
    it('sorts before limiting to 50 without renormalizing', () => {
        const rows = Array.from({ length: 60 }, (_, index) => `H${index},${(index + 1) / 100}`);
        const holdings = parseHoldingsCsv(`Name,Weight\n${rows.join('\n')}`);
        expect(holdings).toHaveLength(50);
        expect(holdings[0].weight).toBe(0.6);
        expect(holdings[49].weight).toBe(0.11);
    });
    it('supports semicolon-delimited European percentage files', () => {
        expect(parseHoldingsCsv('Name;Weight (%)\nCompany;7,25')[0].weight).toBe(7.25);
    });
    it('rejects invalid or ambiguous input', () => {
        expect(() => parseHoldingsCsv('Name,Price\nA,10')).toThrow('CSV needs');
        expect(() => parseHoldingsCsv('Name,Weight\nA,90\nB,80')).toThrow('exceed');
        expect(() => parseHoldingsCsv('Name,Weight\nA,-1')).toThrow('long-only');
        expect(() => parseHoldingsCsv('Name,Weight\n"A,2')).toThrow('unclosed');
    });
});
