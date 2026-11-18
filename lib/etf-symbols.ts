import type { Etf } from '@/lib/etfs';
export function yahooEtfSymbol(fund: Etf) {
    return fund.listing === 'Europe' ? `${fund.symbol}.L` : fund.listing === 'Asia' ? `${fund.symbol.padStart(4, '0')}.HK` : fund.symbol;
}
