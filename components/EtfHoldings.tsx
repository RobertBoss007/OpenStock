'use client';

import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { parseHoldingsCsv, type Holding } from '@/lib/etf-holdings';
import type { Etf } from '@/lib/etfs';

type Snapshot = { holdings: Holding[]; date: string; source: string };

export default function EtfHoldings({ fund }: { fund: Etf }) {
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [date, setDate] = useState('');
    const [source, setSource] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const loadSaved = (open: boolean) => {
        if (!open) return;
        try {
            const saved = JSON.parse(localStorage.getItem(`openstock:holdings:${fund.tv}`) ?? 'null') as Snapshot | null;
            if (saved && Array.isArray(saved.holdings) && saved.holdings.every((holding) => typeof holding.name === 'string' && Number.isFinite(holding.weight)) && typeof saved.date === 'string' && typeof saved.source === 'string') setSnapshot(saved);
        } catch { /* An unavailable browser store does not prevent importing. */ }
    };
    return <Dialog onOpenChange={loadSaved}>
        <DialogTrigger asChild><button className="icon-btn" aria-label={`View ${fund.symbol} holdings`} title="Holdings and portfolio weights"><CircleHelp className="size-4" /></button></DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>{fund.symbol} · Top 50 holdings</DialogTitle><DialogDescription>Holdings are snapshots, not live prices. Your Finnhub plan does not include the holdings feed. Import the issuer’s holdings CSV for this exact fund and share class.</DialogDescription></DialogHeader>
            <div className="grid gap-3 rounded-lg border border-line p-3">
                <label className="grid gap-1 text-sm">Holdings as of (from issuer file)<input className="rounded border border-line bg-card p-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={new Date().toLocaleDateString('en-CA')} /></label>
                <label className="grid gap-1 text-sm">Source / issuer download URL<input className="rounded border border-line bg-card p-2" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Issuer fund page or holdings download" /></label>
                <label className="grid gap-1 text-sm">Import holdings CSV<input type="file" accept=".csv,text/csv" disabled={!date || !source.trim() || busy} onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setError(''); setBusy(true);
                    try {
                        if (file.size > 5_000_000) throw new Error('Choose a CSV smaller than 5 MB.');
                        const next = { holdings: parseHoldingsCsv(await file.text()), date, source: source.trim() };
                        setSnapshot(next);
                        try { localStorage.setItem(`openstock:holdings:${fund.tv}`, JSON.stringify(next)); } catch { setError('Imported for this visit; browser storage is unavailable.'); }
                    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read CSV.'); }
                    finally { setBusy(false); }
                }} /></label>
                <p className="text-xs text-muted-foreground">Enter the source and reporting date first. Required columns: Name and Weight (%). Optional: Ticker. Use percentage points (7.25 means 7.25%). Files stay in this browser. Imports do not refresh automatically.</p>
            </div>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            {snapshot ? <>
                <p className="text-sm">As of {snapshot.date} · Source: {snapshot.source}</p>
                <p className="text-xs text-muted-foreground">Showing {snapshot.holdings.length} largest imported positions, totaling {snapshot.holdings.reduce((sum, holding) => sum + holding.weight, 0).toFixed(2)}% of the fund. Weights are not rescaled to 100%.</p>
                <table className="w-full text-left text-sm"><thead><tr><th className="py-2">Holding</th><th>Ticker</th><th className="text-right">Fund weight</th></tr></thead><tbody>{snapshot.holdings.map((holding, index) => <tr key={`${holding.symbol}-${index}`} className="border-t border-line"><td className="py-2">{holding.name}</td><td>{holding.symbol || '—'}</td><td className="text-right tabular-nums">{holding.weight.toFixed(2)}%</td></tr>)}</tbody></table>
            </> : <p className="text-sm text-muted-foreground">No holdings imported for this listing yet.</p>}
        </DialogContent>
    </Dialog>;
}
