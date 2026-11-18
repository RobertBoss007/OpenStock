"""Local ETF research connector. JSON on stdout; diagnostic logs on stderr.

Run with the workspace .venv Python. SEC contact identity comes from EDGAR_IDENTITY.
Snapshots preserve original weights and source dates. Prices retain adjusted close,
dividends and splits separately from unadjusted OHLC.
"""
import argparse
import contextlib
import csv
import datetime as dt
import hashlib
import io
import json
import logging
import math
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2] / '.openstock-runtime' / 'research'
ROOT.mkdir(parents=True, exist_ok=True)
os.environ.setdefault('EDGAR_LOCAL_DATA_DIR', str(ROOT / 'edgar'))
logging.basicConfig(stream=sys.stderr, level=logging.WARNING)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def clean(value):
    if value is None or (isinstance(value, float) and not math.isfinite(value)):
        return None
    return str(value)


def save_snapshot(result):
    folder = ROOT / result['symbol'] / result['provider']
    folder.mkdir(parents=True, exist_ok=True)
    content = json.dumps(result, allow_nan=False)
    digest = hashlib.sha256(content.encode()).hexdigest()[:12]
    stamp = result.get('date') or result['fetchedAt'][:10]
    # Immutable retrievals keep corrections and prior reporting periods available.
    path = folder / f'{stamp}-{digest}.json'
    path.write_text(content, encoding='utf-8')
    return result


def sec_holdings(symbol, cutoff=None):
    from edgar import Fund, set_identity
    identity = os.environ.get('EDGAR_IDENTITY')
    if not identity:
        raise ValueError('EDGAR_IDENTITY is missing. Set the approved SEC contact identity in .env.local.')
    set_identity(identity)
    fund = Fund(symbol)
    # A registrant can contain many unrelated funds: never use company-level latest.
    filings = fund.get_filings(series_only=True, form='NPORT-P', amendments=True)
    if not filings or not len(filings):
        raise ValueError('No public N-PORT filings were found for this ETF series.')
    for filing in list(filings)[:100]:
        report = filing.obj()
        if not report or not report.matches_ticker(symbol):
            continue
        date = str(report.reporting_period)[:10]
        if cutoff and date > cutoff:
            continue
        positions = []
        for _, item in report.investment_data().iterrows():
            weight = float(item['pct_value'])
            if not math.isfinite(weight):
                continue
            positions.append({'name': str(item['name']), 'symbol': clean(item.get('ticker')) or '',
                              'title': clean(item.get('title')), 'maturityDate': clean(item.get('maturity_date')),
                              'weight': weight, 'valueUsd': clean(item.get('value_usd')),
                              'shares': clean(item.get('balance')), 'units': clean(item.get('units')),
                              'cusip': clean(item.get('cusip')), 'isin': clean(item.get('isin')),
                              'assetCategory': clean(item.get('asset_category')),
                              'derivative': bool(item.get('is_derivative', False))})
        positions.sort(key=lambda item: item['weight'], reverse=True)
        if not positions:
            raise ValueError('The matching filing contains no usable holdings.')
        return save_snapshot({'symbol': symbol, 'provider': 'sec', 'date': date,
            'filedAt': str(filing.filing_date), 'fetchedAt': now(), 'source': filing.homepage_url,
            'accession': filing.accession_no, 'seriesId': report.series_id, 'fundName': report.general_info.series_name,
            'coverage': 'Full reported portfolio', 'holdings': positions,
            'note': 'Weights are reported percentages of fund NAV, not rescaled. Reporting date differs from publication date; historical analysis must account for filing lag.'})
    raise ValueError('No matching public report at or before that reporting date was found in the available filings.')


def yahoo_holdings(symbol):
    import yfinance as yf
    table = yf.Ticker(symbol).funds_data.top_holdings
    if table is None or table.empty:
        raise ValueError('Yahoo returned no top holdings for this listing.')
    holdings = [{'symbol': str(ticker), 'name': str(row['Name']), 'weight': float(row['Holding Percent']) * 100}
                for ticker, row in table.iterrows() if math.isfinite(float(row['Holding Percent']))]
    return save_snapshot({'symbol': symbol, 'provider': 'yahoo', 'date': None, 'fetchedAt': now(),
        'source': f'https://finance.yahoo.com/quote/{symbol}/holdings/',
        'coverage': 'Top 10 only', 'holdings': sorted(holdings, key=lambda item: item['weight'], reverse=True),
        'note': 'Yahoo does not supply a reporting date in this response. Retrieval time is not the holdings date. Current top-ten data cannot substitute for historical holdings.'})


def issuer_holdings(symbol):
    import requests
    # Only verified official endpoints belong here. No approximate fund substitutions.
    sources = {'IVV': 'https://www.blackrock.com/us/individual/products/239726/ishares-core-s-p-500-etf/latest-holdings.csv'}
    if symbol not in sources:
        raise ValueError('A direct issuer download is not configured for this fund. Use SEC, Yahoo top ten, or import an issuer CSV.')
    response = requests.get(sources[symbol], timeout=25)
    response.raise_for_status()
    rows = list(csv.reader(io.StringIO(response.text.lstrip('\ufeff'))))
    report_date = next((row[1] for row in rows if len(row) > 1 and row[0] == 'Fund Holdings as of'), None)
    if not report_date:
        raise ValueError('Issuer response has no verified holdings reporting date.')
    date = dt.datetime.strptime(report_date, '%b %d, %Y').date().isoformat()
    header = next(index for index, row in enumerate(rows) if 'Ticker' in row and 'Name' in row and 'Market Weight' in row)
    columns = rows[header]
    positions = []
    for row in rows[header + 1:]:
        if len(row) != len(columns):
            continue
        values = dict(zip(columns, row))
        try:
            weight = float(values['Market Weight'].replace(',', ''))
            if math.isfinite(weight):
                positions.append({'symbol': values['Ticker'], 'name': values['Name'], 'weight': weight,
                                  'shares': values.get('Shares'), 'assetCategory': values.get('Asset Class')})
        except ValueError:
            continue
    if not positions:
        raise ValueError('Issuer download contains no usable holdings.')
    return save_snapshot({'symbol': symbol, 'provider': 'issuer', 'date': date, 'fetchedAt': now(),
        'source': sources[symbol], 'coverage': 'Full issuer download',
        'holdings': sorted(positions, key=lambda item: item['weight'], reverse=True),
        'note': 'Latest official issuer snapshot. Older snapshots become available here after they are fetched and archived.'})


def prices(symbol, period):
    import yfinance as yf
    table = yf.Ticker(symbol).history(period=period, interval='1d', auto_adjust=False, actions=True, raise_errors=True)
    bars = []
    for timestamp, row in table.iterrows():
        values = [float(row[column]) for column in ['Open', 'High', 'Low', 'Close']]
        if not all(math.isfinite(value) and value > 0 for value in values):
            continue
        adjusted = float(row.get('Adj Close', row['Close']))
        bars.append({'time': timestamp.date().isoformat(), 'open': values[0], 'high': values[1], 'low': values[2], 'close': values[3],
                     'adjustedClose': adjusted if math.isfinite(adjusted) else None,
                     'volume': int(row['Volume']), 'dividends': float(row.get('Dividends', 0)), 'splits': float(row.get('Stock Splits', 0))})
    if not bars:
        raise ValueError('Yahoo returned no historical prices for this listing.')
    return save_snapshot({'symbol': symbol, 'provider': 'prices', 'date': bars[-1]['time'], 'fetchedAt': now(),
        'source': f'https://finance.yahoo.com/quote/{symbol}/history/', 'period': period, 'bars': bars,
        'note': 'Daily Yahoo OHLC and volume. Adjusted close, dividends and splits are separate fields. Recent bars can be incomplete.'})


def archive(symbol):
    entries = []
    for path in (ROOT / symbol).glob('*/*.json'):
        try:
            record = json.loads(path.read_text(encoding='utf-8'))
            if record.get('holdings'):
                entries.append({key: record.get(key) for key in ['symbol', 'provider', 'date', 'fetchedAt', 'source', 'filedAt']})
        except (ValueError, OSError):
            continue
    return {'entries': sorted(entries, key=lambda row: row.get('date') or '', reverse=True)}


def performance_from_prices(table):
    from dateutil.relativedelta import relativedelta
    closes = table['Close'].dropna()
    if len(closes) < 2:
        raise ValueError('Not enough daily prices to calculate changes.')
    last_date = closes.index[-1].date()
    latest = float(closes.iloc[-1])
    def change(target):
        eligible = closes[[stamp.date() <= target for stamp in closes.index]]
        if eligible.empty or float(eligible.iloc[-1]) <= 0:
            return None
        return (latest / float(eligible.iloc[-1]) - 1) * 100
    return {'price': latest, 'date': last_date.isoformat(),
            'day': (latest / float(closes.iloc[-2]) - 1) * 100,
            'week': change(last_date - dt.timedelta(days=7)),
            'month': change(last_date - relativedelta(months=1)),
            'ytd': change(dt.date(last_date.year, 1, 1) - dt.timedelta(days=1))}


def overview(symbols):
    import yfinance as yf
    table = yf.download(symbols, period='2y', interval='1d', auto_adjust=False, group_by='ticker', threads=3, progress=False)
    results = {}
    for symbol in symbols:
        try:
            results[symbol] = performance_from_prices(table[symbol])
        except (KeyError, ValueError, IndexError):
            results[symbol] = {'error': 'Daily prices unavailable.'}
    return {'funds': results, 'fetchedAt': now(), 'source': 'Yahoo Finance daily prices',
            'note': 'Price returns in listing currency, excluding dividends. 7D and 1M use the last close on or before the calendar cutoff; YTD uses prior year-end. Latest daily bar may be partial.'}


def profile(symbol):
    import yfinance as yf
    ticker = yf.Ticker(symbol)
    info = ticker.info
    warnings = []
    try:
        sectors = ticker.funds_data.sector_weightings
        assets = ticker.funds_data.asset_classes
    except Exception:
        sectors, assets = {}, {}
        warnings.append('Exposure data unavailable from Yahoo for this listing.')
    def percent_map(values):
        return [{'name': key, 'weight': float(value) * 100} for key, value in values.items()
                if value is not None and math.isfinite(float(value))]
    return {'symbol': symbol, 'provider': 'yahoo', 'fetchedAt': now(), 'date': None,
            'source': f'https://finance.yahoo.com/quote/{symbol}/profile/',
            'currency': info.get('currency'), 'fundFamily': info.get('fundFamily'), 'totalAssets': info.get('totalAssets'),
            'expenseRatioPercent': info.get('netExpenseRatio'),
            'yieldPercent': float(info['yield']) * 100 if info.get('yield') is not None else None,
            'inception': dt.datetime.fromtimestamp(info['fundInceptionDate'], dt.timezone.utc).date().isoformat() if info.get('fundInceptionDate') else None,
            'description': info.get('longBusinessSummary'), 'sectors': percent_map(sectors), 'assets': percent_map(assets), 'warnings': warnings,
            'note': 'Yahoo fund characteristics and equity-sector allocation. Provider does not expose an as-of date here. Sector percentages describe the reported equity allocation, not necessarily total fund NAV. Blank fields mean unavailable.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['sec', 'yahoo', 'issuer', 'prices', 'archive', 'overview', 'profile'])
    parser.add_argument('symbol')
    parser.add_argument('--date')
    parser.add_argument('--symbols')
    parser.add_argument('--period', default='1y', choices=['1y', '5y', 'max'])
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Z0-9.^=-]{1,24}', args.symbol):
        raise ValueError('Invalid symbol.')
    if args.date:
        dt.date.fromisoformat(args.date)
    if args.mode == 'overview':
        symbols = json.loads(args.symbols or '[]')
        if not symbols or len(symbols) > 60 or not all(isinstance(symbol, str) and re.fullmatch(r'[A-Z0-9.^=-]{1,24}', symbol) for symbol in symbols):
            raise ValueError('Invalid overview symbols.')
        return overview(symbols)
    if args.mode == 'profile':
        return profile(args.symbol)
    if args.mode == 'sec':
        return sec_holdings(args.symbol, args.date)
    if args.mode == 'yahoo':
        if args.date:
            raise ValueError('Yahoo top-ten holdings do not support historical date requests.')
        return yahoo_holdings(args.symbol)
    if args.mode == 'issuer':
        if args.date:
            raise ValueError('Use SEC for historical holdings; this issuer endpoint publishes only the latest snapshot.')
        return issuer_holdings(args.symbol)
    if args.mode == 'archive':
        return archive(args.symbol)
    return prices(args.symbol, args.period)


if __name__ == '__main__':
    try:
        with contextlib.redirect_stdout(sys.stderr):
            result = main()
        print(json.dumps(result, allow_nan=False))
    except Exception as error:
        print(json.dumps({'error': str(error)}))
        sys.exit(1)
