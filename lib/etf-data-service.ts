import { execFile } from 'node:child_process';
import path from 'node:path';
import { ETFS } from '@/lib/etfs';
import { yahooEtfSymbol } from '@/lib/etf-symbols';

const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, { until: number; value: unknown }>();

export function etfData(mode: string, tv: string, date = '', period = '1y'): Promise<unknown> {
    const fund = mode === 'overview' ? ETFS[0] : ETFS.find((entry) => entry.tv === tv);
    if (!fund) return Promise.reject(new Error('Unknown ETF listing.'));
    if (!['sec', 'yahoo', 'issuer', 'prices', 'archive', 'overview', 'profile'].includes(mode)) return Promise.reject(new Error('Invalid data source.'));
    if (mode === 'sec' && fund.listing !== 'US') return Promise.reject(new Error('SEC N-PORT covers US registered funds. This international listing needs an issuer source.'));
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Promise.reject(new Error('Use YYYY-MM-DD for the reporting cutoff.'));
    if (!['1y', '5y', 'max'].includes(period)) return Promise.reject(new Error('Invalid history range.'));
    const symbol = ['prices', 'yahoo', 'profile'].includes(mode) ? yahooEtfSymbol(fund) : fund.symbol;
    const key = JSON.stringify([mode, mode === 'overview' ? 'ALL' : tv, date, period]);
    const hit = cache.get(key);
    if (hit && hit.until > Date.now()) return Promise.resolve(hit.value);
    const existing = pending.get(key);
    if (existing) return existing;
    if (pending.size >= 3) return Promise.reject(new Error('Three research requests are already running. Try again shortly.'));
    const request = new Promise((resolve, reject) => {
        const python = process.env.OPENSTOCK_PYTHON || path.resolve(process.cwd(), '..', '.venv', 'Scripts', 'python.exe');
        const args = [path.join(process.cwd(), 'scripts', 'etf_data.py'), mode, symbol, '--period', period];
        if (mode === 'overview') args.push('--symbols', JSON.stringify(ETFS.map(yahooEtfSymbol)));
        if (date) args.push('--date', date);
        execFile(python, args, { timeout: 180_000, maxBuffer: 12 * 1024 * 1024, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }, (error, stdout) => {
            try {
                const value = JSON.parse(stdout.trim()) as { error?: string };
                if (error || value.error) { reject(new Error(value.error || 'Research connector failed.')); return; }
                if (cache.size >= 150) cache.delete(cache.keys().next().value!);
                cache.set(key, { value, until: Date.now() + (mode === 'archive' ? 10_000 : 6 * 60 * 60 * 1000) });
                resolve(value);
            } catch { reject(new Error(error?.killed ? 'The data request timed out. Try again; SEC requests can be slow.' : 'Could not read the local Python connector response.')); }
        });
    }).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
}
