'use client';
import { useEffect, useState } from 'react';
import type { Etf } from '@/lib/etfs';
import { type Overview } from '@/lib/etf-analytics';
import { yahooEtfSymbol } from '@/lib/etf-symbols';
import EtfHoldings from '@/components/EtfHoldings';
import StockChart from '@/components/stocks/StockChart';
import WatchlistButton from '@/components/WatchlistButton';

type Characteristics = { currency?: string; fundFamily?: string; totalAssets?: number; expenseRatioPercent?: number | null; yieldPercent?: number | null; inception?: string; description?: string; sectors: { name: string; weight: number }[]; assets: { name: string; weight: number }[]; note: string; fetchedAt: string; source: string };
export default function EtfProfile({ fund, watched }: { fund: Etf; watched: boolean }) {
    const [profile, setProfile] = useState<Characteristics | null>(null), [overview, setOverview] = useState<Overview | null>(null), [errors, setErrors] = useState<string[]>([]);
    useEffect(() => {
        const controller = new AbortController();
        const load = async (provider: string) => {
            const response = await fetch(`/api/etfs/data?provider=${provider}&fund=${encodeURIComponent(fund.tv)}`, { signal: controller.signal });
            const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
        };
        load('profile').then(setProfile).catch((cause) => { if (!controller.signal.aborted) setErrors((values) => [...values, `Characteristics: ${cause.message}`]); });
        load('overview').then(setOverview).catch((cause) => { if (!controller.signal.aborted) setErrors((values) => [...values, `Performance: ${cause.message}`]); });
        return () => controller.abort();
    }, [fund.tv]);
    const performance = overview?.funds[yahooEtfSymbol(fund)];
    return <div className="grid gap-4">
        <header className="page-head"><div><h1 className="page-title">{fund.symbol}</h1><p className="page-sub">{fund.name} · {fund.issuer} · {fund.tv}</p></div>{fund.watchSymbol && <WatchlistButton symbol={fund.watchSymbol} company={fund.name} isInWatchlist={watched} />}</header>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{(['day', 'week', 'month', 'ytd'] as const).map((key, index) => <div key={key} className="rounded-xl border border-line bg-card p-4"><p className="text-xs text-muted-foreground">{['1 day', '7 days', '1 month', 'YTD'][index]}</p><p className={`mt-1 text-xl tabular-nums ${(performance?.[key] || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{performance?.[key] == null ? '—' : `${performance[key]! >= 0 ? '+' : ''}${performance[key]!.toFixed(2)}%`}</p></div>)}</div>
        <p className="text-xs text-muted-foreground">Daily price returns, excluding dividends, in listing currency. Latest bar {performance?.date || 'loading'}. {overview?.note}</p>
        {errors.map((error, index) => <p role="alert" key={index} className="text-sm text-red-400">{error}</p>)}
        {fund.listing === 'US' ? <StockChart tvSymbol={fund.tv} scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" /> : <a className="btn btn-ghost" href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(fund.tv)}`} target="_blank" rel="noreferrer">Open chart on TradingView</a>}
        <section className="rounded-xl border border-line bg-card p-4"><h2 className="text-lg font-semibold">Fund characteristics</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Exposure', fund.exposure], ['Asset class', fund.asset], ['Listing', fund.listing], ['Currency', profile?.currency], ['Fund family', profile?.fundFamily], ['Net assets (listing currency)', profile?.totalAssets == null ? null : new Intl.NumberFormat('en', { notation: 'compact' }).format(profile.totalAssets)], ['Expense ratio', profile?.expenseRatioPercent == null ? null : `${profile.expenseRatioPercent.toFixed(3)}%`], ['Indicated yield (Yahoo)', profile?.yieldPercent == null ? null : `${profile.yieldPercent.toFixed(2)}%`], ['Inception', profile?.inception]].map(([name, value]) => <div key={name}><dt className="text-xs text-muted-foreground">{name}</dt><dd className="mt-1 text-sm">{value || '—'}</dd></div>)}</dl>
            {profile && <><p className="mt-4 text-sm text-muted-foreground">{profile.description}</p><p className="mt-2 text-xs text-muted-foreground">{profile.note} Retrieved {new Date(profile.fetchedAt).toLocaleString()} · <a href={profile.source} target="_blank" rel="noreferrer" className="underline">Yahoo source</a></p></>}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">{([{ title: 'Equity sector exposure', entries: profile?.sectors }, { title: 'Asset allocation', entries: profile?.assets }]).map(({ title, entries }) => <section key={title} className="rounded-xl border border-line bg-card p-4"><h2 className="mb-3 font-semibold">{title}</h2>{entries?.length ? entries.filter((entry) => entry.weight !== 0).sort((a, b) => b.weight - a.weight).map((entry) => <div key={entry.name} className="mb-3"><div className="flex justify-between text-sm"><span>{entry.name.replace(/_/g, ' ')}</span><span>{entry.weight.toFixed(2)}%</span></div><div className="mt-1 h-1.5 rounded bg-white/5"><div className="h-full rounded bg-amber-400" style={{ width: `${Math.max(0, Math.min(100, entry.weight))}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">{profile ? 'Not available for this listing.' : 'Loading exposure data…'}</p>}</section>)}</div>
        <EtfHoldings fund={fund} />
    </div>;
}
