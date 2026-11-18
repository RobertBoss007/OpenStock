export type Holding = { name: string; symbol: string; weight: number; isin?: string | null; cusip?: string | null; title?: string | null; maturityDate?: string | null; assetCategory?: string | null; derivative?: boolean };
export type HoldingsSnapshot = { symbol: string; holdings: Holding[]; date: string | null; source: string; provider: string; fetchedAt?: string; filedAt?: string; coverage?: string; note?: string; seriesId?: string };
export type Performance = { price?: number; date?: string; day?: number | null; week?: number | null; month?: number | null; ytd?: number | null; error?: string };
export type Overview = { funds: Record<string, Performance>; fetchedAt: string; note: string };
export function etfProfilePath(tv: string) { return `/etfs/${encodeURIComponent(tv)}`; }
const present = (value?: string | null) => value && !['nan', '<NA>', 'None', '-'].includes(value) ? value : '';
function securityKey(holding: Holding) {
    const identifier = present(holding.isin) || present(holding.cusip) || present(holding.symbol) || `${holding.name}|${holding.title || ''}|${holding.maturityDate || ''}`;
    return `${identifier}|${holding.derivative ? 'derivative' : 'security'}`;
}
export function compareHoldings(before: HoldingsSnapshot, after: HoldingsSnapshot) {
    if (before.provider !== 'sec' || after.provider !== 'sec' || before.symbol !== after.symbol || before.seriesId !== after.seriesId) throw new Error('Compare SEC snapshots of the same fund series.');
    if (!before.date || !after.date || before.date >= after.date) throw new Error('Requests must resolve to different reporting dates in chronological order.');
    const aggregate = (snapshot: HoldingsSnapshot) => {
        const map = new Map<string, Holding>();
        for (const holding of snapshot.holdings) {
            const key = securityKey(holding), previous = map.get(key);
            map.set(key, { ...holding, weight: (previous?.weight || 0) + holding.weight });
        }
        return map;
    };
    const left = aggregate(before), right = aggregate(after);
    return [...new Set([...left.keys(), ...right.keys()])].map((id) => {
        const old = left.get(id), current = right.get(id);
        return { id, name: (current || old)!.name, symbol: (current || old)!.symbol, before: old?.weight || 0, after: current?.weight || 0,
            delta: (current?.weight || 0) - (old?.weight || 0), status: !old ? 'New' : !current ? 'Exited' : 'Held' };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
export function assetExposure(snapshot: HoldingsSnapshot) {
    const totals = new Map<string, number>();
    for (const holding of snapshot.holdings) { const category = holding.assetCategory || 'Unclassified'; totals.set(category, (totals.get(category) || 0) + holding.weight); }
    return [...totals].map(([name, weight]) => ({ name, weight })).sort((a, b) => b.weight - a.weight);
}
