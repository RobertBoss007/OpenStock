'use client';

import { useState } from 'react';
import { ETFS } from '@/lib/etfs';
import TradingViewWidget from '@/components/TradingViewWidget';
import WatchlistButton from '@/components/WatchlistButton';

export default function EtfExplorer({ watched }: { watched: string[] }) {
    const [query, setQuery] = useState('');
    const [listing, setListing] = useState('All');
    const [asset, setAsset] = useState('All');
    const [issuer, setIssuer] = useState('All');
    const [selected, setSelected] = useState(ETFS[0]);
    const funds = ETFS.filter((fund) =>
        (listing === 'All' || fund.listing === listing) &&
        (asset === 'All' || fund.asset === asset) &&
        (issuer === 'All' || fund.issuer === issuer) &&
        `${fund.symbol} ${fund.name} ${fund.exposure}`.toLowerCase().includes(query.toLowerCase().trim()));
    const chartUrl = (symbol: string) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;

    return <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">Search funds
                <input className="rounded-lg border border-line bg-card px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker, fund or exposure" />
            </label>
            <label className="flex flex-col gap-1 text-sm">Listing location
                <select className="rounded-lg border border-line bg-card px-3 py-2" value={listing} onChange={(event) => setListing(event.target.value)}>
                    {['All', 'US', 'Europe', 'Asia'].map((value) => <option key={value}>{value}</option>)}
                </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">Asset class
                <select className="rounded-lg border border-line bg-card px-3 py-2" value={asset} onChange={(event) => setAsset(event.target.value)}>
                    {['All', 'Equity', 'Bonds'].map((value) => <option key={value}>{value}</option>)}
                </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">Issuer
                <select className="rounded-lg border border-line bg-card px-3 py-2" value={issuer} onChange={(event) => setIssuer(event.target.value)}>
                    {['All', ...new Set(ETFS.map((fund) => fund.issuer))].map((value) => <option key={value}>{value}</option>)}
                </select>
            </label>
        </div>
        <p className="text-sm text-muted-foreground">{funds.length} of {ETFS.length} funds. Listing location and investment exposure are separate. Quotes follow the provider’s refresh schedule; some exchanges restrict embeds.</p>
        <section className="rounded-xl border border-line bg-card p-4" aria-label="Selected ETF chart">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-semibold">{selected.symbol} · {selected.name}</h2><p className="text-sm text-muted-foreground">{selected.exposure} · {selected.tv}</p></div>
                <a className="btn btn-ghost" href={chartUrl(selected.tv)} target="_blank" rel="noreferrer">Open on TradingView</a>
            </div>
            {selected.listing === 'US' ? <TradingViewWidget key={selected.tv} scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" height={500} allowExpand config={{ symbol: selected.tv, interval: 'D', timezone: 'Etc/UTC', theme: 'dark', style: '1', locale: 'en', allow_symbol_change: false, calendar: false, hide_side_toolbar: false }} />
                : <p className="py-8 text-sm text-muted-foreground">This listing uses an external chart because embedded candle charts may be restricted. Use “Open on TradingView” above. Finnhub free-tier watchlist quotes are unavailable for this listing.</p>}
        </section>
        <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
                <thead className="bg-card"><tr>{['Fund', 'Issuer', 'Exposure', 'Listing', 'Asset', 'Watch'].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
                <tbody>{funds.map((fund) => <tr key={fund.tv} className="border-t border-line hover:bg-card">
                    <td className="p-3"><button className="text-left hover:underline" onClick={() => setSelected(fund)} aria-pressed={selected.tv === fund.tv}><span className="font-semibold">{fund.symbol}</span><span className="block text-muted-foreground">{fund.name}</span></button></td>
                    <td className="p-3">{fund.issuer}</td><td className="p-3">{fund.exposure}</td><td className="p-3">{fund.listing}</td><td className="p-3">{fund.asset}</td>
                    <td className="p-3">{fund.watchSymbol ? <WatchlistButton symbol={fund.watchSymbol} company={fund.name} isInWatchlist={watched.includes(fund.watchSymbol)} variant="icon" /> : <span className="text-muted-foreground">Chart only</span>}</td>
                </tr>)}</tbody>
            </table>
            {funds.length === 0 && <p className="p-6 text-sm text-muted-foreground">No matching funds. Try broader filters.</p>}
        </div>
    </div>;
}
