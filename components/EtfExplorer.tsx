'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleHelp } from 'lucide-react';
import { ETFS } from '@/lib/etfs';
import StockChart from '@/components/stocks/StockChart';
import WatchlistButton from '@/components/WatchlistButton';
import { etfProfilePath, type Overview } from '@/lib/etf-analytics';
import { yahooEtfSymbol } from '@/lib/etf-symbols';

export default function EtfExplorer({ watched }: { watched: string[] }) {
    const [query, setQuery] = useState(''), [listing, setListing] = useState('All'), [asset, setAsset] = useState('All'), [issuer, setIssuer] = useState('All');
    const [selected, setSelected] = useState(ETFS[0]);
    const [overview, setOverview] = useState<Overview | null>(null), [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/etfs/data?provider=overview', { signal: controller.signal }).then(async (response) => {
            const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
        }).then(setOverview).catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
        return () => controller.abort();
    }, []);
    const funds = ETFS.filter((fund) => (listing === 'All' || fund.listing === listing) && (asset === 'All' || fund.asset === asset) &&
        (issuer === 'All' || fund.issuer === issuer) && `${fund.symbol} ${fund.name} ${fund.exposure}`.toLowerCase().includes(query.toLowerCase().trim()));
    return <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm">Search funds<input className="rounded-lg border border-line bg-card px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker, fund or exposure" /></label>
            {([{ label: 'Listing location', value: listing, change: setListing, values: ['All', 'US', 'Europe', 'Asia'] }, { label: 'Asset class', value: asset, change: setAsset, values: ['All', 'Equity', 'Bonds'] }, { label: 'Issuer', value: issuer, change: setIssuer, values: ['All', ...new Set(ETFS.map((fund) => fund.issuer))] }]).map((filter) =>
                <label key={filter.label} className="grid gap-1 text-sm">{filter.label}<select className="rounded-lg border border-line bg-card px-3 py-2" value={filter.value} onChange={(event) => filter.change(event.target.value)}>{filter.values.map((value) => <option key={value}>{value}</option>)}</select></label>)}
        </div>
        <p className="text-sm text-muted-foreground">{funds.length} funds. Select a fund name or ? to open its profile in an app tab. Use Chart for a quick preview.</p>
        <section className="rounded-xl border border-line bg-card p-4" aria-label="Selected ETF chart"><h2 className="mb-3 font-semibold">{selected.symbol} · {selected.name}</h2>
            {selected.listing === 'US' ? <StockChart key={selected.tv} tvSymbol={selected.tv} scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" /> : <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selected.tv)}`} className="btn btn-ghost" target="_blank" rel="noreferrer">Open exchange chart on TradingView</a>}
        </section>
        {error && <p role="alert" className="text-sm text-red-400">Performance data: {error}</p>}
        <p className="text-xs text-muted-foreground">{overview ? `${overview.note} Retrieved ${new Date(overview.fetchedAt).toLocaleString()}. Cached up to 6 hours.` : error ? 'Performance unavailable.' : 'Loading daily performance for the ETF directory…'}</p>
        <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-left text-sm">
            <thead className="bg-card"><tr>{['Fund', 'Issuer / exposure', 'Listing', '1D', '7D', '1M', 'YTD', 'Watch'].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
            <tbody>{funds.map((fund) => { const performance = overview?.funds[yahooEtfSymbol(fund)]; return <tr key={fund.tv} className="border-t border-line hover:bg-card">
                <td className="p-3"><div className="flex items-start gap-2"><Link className="hover:underline" href={etfProfilePath(fund.tv)}><strong>{fund.symbol}</strong><span className="block text-muted-foreground">{fund.name}</span></Link><Link className="icon-btn" href={etfProfilePath(fund.tv)} aria-label={`Open ${fund.symbol} ETF profile`}><CircleHelp className="size-4" /></Link></div><button className="mt-1 text-xs underline" onClick={() => setSelected(fund)}>Chart</button></td>
                <td className="p-3">{fund.issuer}<span className="block text-muted-foreground">{fund.exposure} · {fund.asset}</span></td><td className="p-3">{fund.listing}</td>
                {(['day', 'week', 'month', 'ytd'] as const).map((period) => <td key={period} className={`p-3 tabular-nums ${(performance?.[period] ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} title={performance?.error || `Latest bar: ${performance?.date || 'unavailable'}`}>{performance?.[period] == null ? '—' : `${performance[period]! >= 0 ? '+' : ''}${performance[period]!.toFixed(2)}%`}</td>)}
                <td className="p-3">{fund.watchSymbol ? <WatchlistButton symbol={fund.watchSymbol} company={fund.name} isInWatchlist={watched.includes(fund.watchSymbol)} variant="icon" /> : '—'}</td>
            </tr>; })}</tbody>
        </table>{funds.length === 0 && <p className="p-6">No matching funds.</p>}</div>
    </div>;
}
