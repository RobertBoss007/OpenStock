'use client';

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import TradingViewWidget from "@/components/TradingViewWidget";
import Panel from "@/components/Panel";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CANDLE_CHART_WIDGET_CONFIG } from "@/lib/constants";
import { GLOBAL_INTERVAL_KEY, GLOBAL_STUDIES_KEY, readChartPreferences, tickerChartKey, type ChartPreferences, type ChartScope } from '@/lib/chart-preferences';

// The free embed can't save indicators added inside it, so the ones picked here are kept per browser and
// passed in as `studies` on every chart. Each id was checked on a live advanced-chart embed.
const INDICATORS = [
    { id: 'STD;SMA', labelKey: 'sma' },
    { id: 'STD;EMA', labelKey: 'ema' },
    { id: 'STD;Bollinger_Bands', labelKey: 'bollingerBands' },
    { id: 'STD;VWAP', labelKey: 'vwap' },
    { id: 'STD;RSI', labelKey: 'rsi' },
    { id: 'STD;MACD', labelKey: 'macd' },
    { id: 'STD;Stochastic', labelKey: 'stochastic' },
    { id: 'STD;Average_True_Range', labelKey: 'atr' },
] as const;
const CHART_HEIGHT = 560;
const STUDY_IDS = INDICATORS.map((indicator) => indicator.id);

export default function StockChart({ tvSymbol, scriptUrl }: { tvSymbol: string; scriptUrl: string }) {
    const t = useTranslations('StockChart');
    const tw = useTranslations('TradingViewWidget');
    const locale = useLocale();
    // null until the browser's saved list is read, so the chart mounts once with the right indicators
    const [studies, setStudies] = useState<string[] | null>(null);
    const [interval, setInterval] = useState('D');
    const [scope, setScope] = useState<ChartScope>('global');
    const [storageWarning, setStorageWarning] = useState('');
    useEffect(() => {
        const load = () => {
            try {
                const saved = readChartPreferences(localStorage, tvSymbol, STUDY_IDS);
                setStudies(saved.preferences.studies); setInterval(saved.preferences.interval); setScope(saved.scope);
            } catch { setStudies([]); setInterval('D'); setScope('global'); setStorageWarning('Browser storage is unavailable. Changes cannot survive reloads.'); }
        };
        load();
        window.addEventListener('storage', load);
        window.addEventListener('openstock:chart-preferences', load);
        return () => { window.removeEventListener('storage', load); window.removeEventListener('openstock:chart-preferences', load); };
    }, [tvSymbol]);

    const persist = (preferences: ChartPreferences, target = scope) => {
        setStudies(preferences.studies); setInterval(preferences.interval); setScope(target);
        try {
            if (target === 'ticker') localStorage.setItem(tickerChartKey(tvSymbol), JSON.stringify(preferences));
            else { localStorage.setItem(GLOBAL_STUDIES_KEY, JSON.stringify(preferences.studies)); localStorage.setItem(GLOBAL_INTERVAL_KEY, preferences.interval); }
            setStorageWarning(''); window.dispatchEvent(new Event('openstock:chart-preferences'));
        } catch { setStorageWarning('Settings apply for this visit; this browser could not save them.'); }
    };

    const toggle = (id: string) => {
        const current = studies ?? [];
        const next = INDICATORS.map((i) => i.id).filter((i) => (i === id ? !current.includes(id) : current.includes(i)));
        persist({ studies: next, interval });
    };

    const menu = (
        <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs">Save for <select className="rounded border border-line bg-card p-1" value={scope} disabled={!studies} onChange={(event) => {
            if (event.target.value === 'ticker') persist({ studies: studies || [], interval }, 'ticker');
            else {
                try { localStorage.removeItem(tickerChartKey(tvSymbol)); const saved = readChartPreferences(localStorage, tvSymbol, STUDY_IDS); persist(saved.preferences, 'global'); }
                catch { setStorageWarning('Could not restore global defaults from browser storage.'); }
            }
        }}><option value="global">Global defaults</option><option value="ticker">{tvSymbol} only</option></select></label>
        <label className="text-xs">Interval <select className="rounded border border-line bg-card p-1" value={interval} disabled={!studies} onChange={(event) => persist({ studies: studies || [], interval: event.target.value })}>{[['60', '1 hour'], ['240', '4 hours'], ['D', 'Daily'], ['W', 'Weekly'], ['M', 'Monthly']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <DropdownMenu>
            <DropdownMenuTrigger className="btn btn-ghost h-8 px-2.5 text-[13px]" disabled={!studies}>
                <SlidersHorizontal /> Indicators{studies?.length ? <span className="num text-faint">{studies.length}</span> : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[12px] font-normal text-faint">{t('keptNote')}</DropdownMenuLabel>
                {INDICATORS.map(({ id, labelKey }) => (
                    <DropdownMenuCheckboxItem key={id} checked={studies?.includes(id) ?? false} onCheckedChange={() => toggle(id)} onSelect={(e) => e.preventDefault()}>
                        {t(`indicators.${labelKey}`)}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
        </div>
    );

    return (
        <Panel title={t('title')} sub={t('sub')} action={menu}>
            <p className="mb-2 px-1 text-xs text-muted-foreground">{scope === 'ticker' ? `Indicator choices and interval saved for ${tvSymbol}.` : 'Using shared indicator choices and interval.'} Saved in this browser. Choosing Global defaults removes this ticker’s override.</p>
            <details className="mb-2 px-1 text-xs text-muted-foreground"><summary className="cursor-pointer">What can be saved?</summary><p className="mt-1">The app saves the indicator selections and interval above. The free TradingView embed does not expose custom indicator periods, colors, lines, shapes or drawings for saving. Changes inside its toolbar last only while that chart remains mounted.</p></details>
            {storageWarning && <p role="alert" className="mb-2 text-xs text-amber-300">{storageWarning}</p>}
            {studies ? (
                <TradingViewWidget scriptUrl={scriptUrl} config={{ ...CANDLE_CHART_WIDGET_CONFIG(tvSymbol, locale), studies, interval }} height={CHART_HEIGHT} allowExpand
                    labels={{ fullScreen: tw('fullScreen'), exitFullScreen: tw('exitFullScreen'), exitFullScreenHint: tw('exitFullScreenHint') }} />
            ) : (
                <div className="tv-frame" style={{ height: CHART_HEIGHT }} />
            )}
        </Panel>
    );
}
