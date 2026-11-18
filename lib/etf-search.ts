import { ETFS } from '@/lib/etfs';
export function searchEtfs(query: string) {
    const terms = query.toLowerCase().trim().split(/[\s:]+/).filter(Boolean);
    if (!terms.length) return [];
    return ETFS.filter((fund) => {
        const text = `${fund.symbol} ${fund.tv} ${fund.name} ${fund.issuer} ETF ${fund.exposure}`.toLowerCase();
        return terms.every((term) => text.includes(term));
    }).map((fund) => ({ symbol: fund.watchSymbol || fund.tv, name: fund.name, exchange: fund.tv.split(':')[0], type: 'ETF', isInWatchlist: false, etfTv: fund.tv }));
}
