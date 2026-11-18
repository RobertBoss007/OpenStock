export type ChartPreferences = { studies: string[]; interval: string };
export type ChartScope = 'global' | 'ticker';
export const GLOBAL_STUDIES_KEY = 'openstock:chart-indicators';
export const GLOBAL_INTERVAL_KEY = 'openstock:chart-default-interval';
export const tickerChartKey = (symbol: string) => `openstock:chart:${symbol.toUpperCase()}`;
export const CHART_INTERVALS = ['60', '240', 'D', 'W', 'M'];

export function normalizeChartPreferences(value: unknown, allowedStudies: readonly string[]): ChartPreferences {
    const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return { studies: Array.isArray(raw.studies) ? allowedStudies.filter((id) => (raw.studies as unknown[]).includes(id)) : [],
        interval: typeof raw.interval === 'string' && CHART_INTERVALS.includes(raw.interval) ? raw.interval : 'D' };
}

export function readChartPreferences(storage: Pick<Storage, 'getItem'>, symbol: string, allowedStudies: readonly string[]): { scope: ChartScope; preferences: ChartPreferences } {
    const parse = (raw: string | null): unknown => { try { return JSON.parse(raw || 'null'); } catch { return null; } };
    const ticker = parse(storage.getItem(tickerChartKey(symbol)));
    if (ticker && typeof ticker === 'object' && Array.isArray((ticker as Record<string, unknown>).studies)) return { scope: 'ticker', preferences: normalizeChartPreferences(ticker, allowedStudies) };
    return { scope: 'global', preferences: normalizeChartPreferences({ studies: parse(storage.getItem(GLOBAL_STUDIES_KEY)), interval: storage.getItem(GLOBAL_INTERVAL_KEY) }, allowedStudies) };
}
