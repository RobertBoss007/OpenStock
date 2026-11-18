'use client';
import { useEffect, useState } from 'react';
import type { Etf } from '@/lib/etfs';
import { ASSET_CATEGORY_LABELS, assetExposure, compareHoldings, comparisonDates, priorQuarterEnd, type HoldingsSnapshot } from '@/lib/etf-analytics';

export default function EtfHoldings({ fund }: { fund: Etf }) {
    const [snapshot, setSnapshot] = useState<HoldingsSnapshot | null>(null);
    const [provider, setProvider] = useState(fund.listing === 'US' ? 'sec' : 'yahoo');
    const [cutoff, setCutoff] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('');
    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [comparisonError, setComparisonError] = useState(''), [comparisonNote, setComparisonNote] = useState('');
    const [comparison, setComparison] = useState<{ before: HoldingsSnapshot; after: HoldingsSnapshot; rows: ReturnType<typeof compareHoldings> } | null>(null);
    const [filter, setFilter] = useState('All');
    const request = async (source: string, date = '', signal?: AbortSignal): Promise<HoldingsSnapshot> => {
        const query = new URLSearchParams({ provider: source, fund: fund.tv });
        if (date) query.set('date', date);
        const response = await fetch(`/api/etfs/data?${query}`, { signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
    };
    useEffect(() => {
        const controller = new AbortController();
        setBusy(true); setError('');
        request(fund.listing === 'US' ? 'sec' : 'yahoo', '', controller.signal).then((data) => {
            setSnapshot(data);
            if (data.provider === 'sec' && data.date) { setFrom((value) => value || priorQuarterEnd(data.date!)); setTo((value) => value || data.date!); }
        })
            .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
            .finally(() => { if (!controller.signal.aborted) setBusy(false); });
        return () => controller.abort();
        // Source selection is submitted explicitly; only changing fund starts a new load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fund.tv]);
    const load = async () => {
        setBusy(true); setError('');
        try { setSnapshot(await request(provider, provider === 'sec' ? cutoff : '')); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Holdings unavailable.'); }
        finally { setBusy(false); }
    };
    const compare = async () => {
        setComparisonError(''); setComparisonNote(''); setComparison(null);
        try {
            const { earlier, later, swapped } = comparisonDates(from, to);
            setBusy(true);
            if (swapped) { setFrom(earlier); setTo(later); setComparisonNote('Dates were reordered from earlier to later.'); }
            const before = await request('sec', earlier), after = await request('sec', later);
            if (before.date === after.date) throw new Error(`Both cutoffs resolve to the ${before.date} SEC report. Choose dates spanning different available reports (typically quarter ends).`);
            setComparison({ before, after, rows: compareHoldings(before, after) });
        } catch (cause) { setComparisonError(cause instanceof Error ? cause.message : 'Comparison unavailable.'); }
        finally { setBusy(false); }
    };
    const download = () => {
        if (!snapshot) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = `${fund.symbol}-${snapshot.provider}-${snapshot.date || 'undated'}-holdings.json`; link.click(); URL.revokeObjectURL(url);
    };
    const changes = comparison?.rows.filter((row) => filter === 'All' || row.status === filter) || [];
    return <section className="grid gap-4" aria-label="ETF holdings and historical comparison">
        <div className="rounded-xl border border-line bg-card p-4">
            <h2 className="mb-3 text-lg font-semibold">Holdings</h2>
            <div className="flex flex-wrap items-end gap-3 text-sm">
                <label className="grid gap-1">Source<select className="rounded border border-line bg-card p-2" value={provider} disabled={busy} onChange={(event) => setProvider(event.target.value)}><option value="sec" disabled={fund.listing !== 'US'}>SEC · full reported portfolio</option><option value="yahoo">Yahoo · current top 10</option><option value="issuer" disabled={fund.symbol !== 'IVV'}>BlackRock · IVV latest</option></select></label>
                <label className="grid gap-1">Reporting cutoff (blank = latest)<input type="date" className="rounded border border-line bg-card p-2" value={cutoff} disabled={provider !== 'sec' || busy} onChange={(event) => setCutoff(event.target.value)} /></label>
                <button className="btn btn-ghost" disabled={busy} onClick={() => void load()}>{busy ? 'Fetching portfolio…' : 'Fetch holdings'}</button>
                {snapshot && <button className="btn btn-ghost" onClick={download}>Download full JSON</button>}
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
            {snapshot && <>
                <p className="mt-3 text-sm">Displayed: {snapshot.provider} · Reported {snapshot.date || 'date unavailable'}{snapshot.filedAt ? ` · Filed ${snapshot.filedAt}` : ''} · {snapshot.holdings.length} positions</p>
                <p className="mt-1 text-xs text-muted-foreground">{snapshot.coverage}. {snapshot.note}</p>
                <a href={snapshot.source} target="_blank" rel="noreferrer" className="mt-1 block text-xs underline">Source document</a>
                {snapshot.provider === 'sec' && <div className="mt-4"><h3 className="font-semibold">Asset categories</h3><div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-4">{assetExposure(snapshot).map((item) => <div key={item.name} className="rounded-xl border border-line bg-white/[0.025] px-4 py-3"><p className="text-xs text-muted-foreground">{ASSET_CATEGORY_LABELS[item.name] || item.name}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{(Math.abs(item.weight) < 0.005 ? 0 : item.weight).toFixed(2)}%</p><p className="text-[11px] text-faint">{item.name} · % fund NAV</p></div>)}</div></div>}
                <div className="mt-3 max-h-[360px] overflow-auto"><table className="w-full text-left text-[13px]"><thead className="sticky top-0 bg-card"><tr><th className="px-2 py-1.5">Top 50 positions</th><th className="px-2 py-1.5">Ticker</th><th className="px-2 py-1.5 text-right">% fund NAV</th></tr></thead><tbody>{snapshot.holdings.slice(0, 50).map((holding, index) => <tr key={index} className="border-t border-line"><td className="px-2 py-1.5">{holding.name}</td><td className="px-2 py-1.5">{holding.symbol || '—'}</td><td className="px-2 py-1.5 text-right tabular-nums">{holding.weight.toFixed(3)}%</td></tr>)}</tbody></table></div>
            </>}
            {!snapshot && !busy && <p className="mt-3 text-sm text-muted-foreground">No portfolio loaded. Select a source and fetch holdings.</p>}
        </div>
        <div className="rounded-xl border border-line bg-card p-4"><h2 className="text-lg font-semibold">Compare holdings between two dates</h2>
            <p className="mt-1 text-xs text-muted-foreground">SEC reports at or before each cutoff. Changes are percentage points of NAV, not investment returns or proof of trades. Prices and fund flows can change weights.</p>
            {fund.listing === 'US' ? <>
                <div className="my-3 flex flex-wrap items-end gap-3 text-sm"><label className="grid gap-1">Date A<input className="rounded border border-line bg-card p-2" type="date" value={from} disabled={busy} onChange={(event) => setFrom(event.target.value)} /></label><label className="grid gap-1">Date B<input className="rounded border border-line bg-card p-2" type="date" value={to} disabled={busy} onChange={(event) => setTo(event.target.value)} /></label><button className="btn btn-ghost" disabled={busy} onClick={() => void compare()}>{busy ? 'Loading…' : 'Compare'}</button></div>
                <p className="text-xs text-muted-foreground">Dates can be entered in either order. Each resolves to the latest available report on or before that date.</p>
                {comparisonNote && <p role="status" className="my-2 text-sm text-amber-300">{comparisonNote}</p>}
                {comparisonError && <p role="alert" className="my-2 text-sm text-red-400">{comparisonError}</p>}
                {comparison && <>
                    <p className="text-sm">Actual reports: {comparison.before.date} (filed {comparison.before.filedAt}) → {comparison.after.date} (filed {comparison.after.filedAt})</p>
                    <label className="my-3 block text-sm">Show <select className="rounded border border-line bg-card p-1" value={filter} onChange={(event) => setFilter(event.target.value)}>{['All', 'New', 'Exited', 'Held'].map((value) => <option key={value}>{value}</option>)}</select></label>
                    <p className="text-xs text-muted-foreground">{changes.length} matching positions; largest 100 weight changes shown.</p>
                    <div className="max-h-[500px] overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['Position', 'Status', 'Before', 'After', 'Change (pp)'].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{changes.slice(0, 100).map((row) => <tr key={row.id} className="border-t border-line"><td className="p-2">{row.name} {row.symbol}</td><td>{row.status}</td><td>{row.before.toFixed(3)}%</td><td>{row.after.toFixed(3)}%</td><td className={row.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{row.delta >= 0 ? '+' : ''}{row.delta.toFixed(3)}</td></tr>)}</tbody></table></div>
                </>}
            </> : <p className="mt-3 text-sm text-muted-foreground">Historical SEC holdings are unavailable for this non-US listing. Current Yahoo top-ten data cannot supply a historical comparison.</p>}
        </div>
    </section>;
}
