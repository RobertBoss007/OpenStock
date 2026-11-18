# ETF data and profiles

The ETF directory links to `/etfs/<exchange:ticker>` profiles. The app tab bar retains these alongside stock tabs. The question mark opens the same profile. Chart preview remains separate.

Only the TradingView chart is displayed. Its default indicator choices and interval are saved per browser by the app. The free embed does not expose arbitrary indicator input changes, drawings, or internal layout settings for the app to capture. Configure default indicator choices using **Default indicators** above a chart. No CSV upload is provided.

## Data sources

- SEC via EdgarTools is the primary source for US-registered ETF holdings. Requests are scoped to the exact fund series and checked against the ticker. The top 50 are shown; the complete parsed portfolio is retained and downloadable as JSON. Reports have separate reporting and filing dates.
- Yahoo via yfinance supplies daily price history, fund characteristics and equity-sector allocations. The top-ten holdings feed is a separate current-data fallback and never substitutes for historical SEC portfolios. Reporting dates unavailable from Yahoo remain explicitly unknown.
- The official BlackRock IVV CSV is available as an additional latest-holdings source. Other direct issuer adapters have not been verified.
- European and Asian listings do not automatically acquire SEC coverage through a similarly named US ETF.

1D uses the previous available daily close. 7D and 1M use the close on or before the calendar cutoff. YTD uses the last close on or before prior year-end. Changes are price returns in listing currency and exclude dividends. The latest daily bar can be incomplete. Responses are cached for six hours.

Holdings comparisons require two different reporting periods from the same SEC fund series. Positions match by ISIN, CUSIP or ticker, then security description; duplicate lots aggregate. Changes are percentage points of NAV, not returns or evidence of purchases/sales. Market movements, fund flows and security identifier changes can affect the comparison.

## Local setup

Python lives in the parent workspace `.venv`; dependencies are pinned in `scripts/requirements-etf.txt`. Override its executable with `OPENSTOCK_PYTHON` if needed. The approved SEC contact identity is in ignored `.env.local` under `EDGAR_IDENTITY`; do not commit it.

Full source snapshots are stored outside the repository at `../.openstock-runtime/research`. Keep this directory for later Python or notebook analysis. Holdings histories are periodic public disclosures, not a daily historical reconstruction. No data is invented for missing dates.

The Node API `/api/etfs/data` requires an authenticated app session, uses a fixed ETF registry, and invokes the local Python connector without a shell. Three concurrent research requests are allowed; repeated requests share an in-flight result.

Run calculations tests with `../.venv/Scripts/python.exe scripts/test_etf_data.py`; run application tests with `npm test` and type checks with `npx tsc --noEmit`.
