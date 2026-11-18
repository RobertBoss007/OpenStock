# ETF data and profiles

In the ETF directory, the ticker selects the inline chart and the question mark opens `/etfs/<exchange:ticker>` in an app tab. The global search palette includes the local ETF registry and recognizes exchange-qualified names such as `AMEX:VOO` or `VOO AMEX`.

Only the TradingView chart is displayed. Its indicator choices and interval are saved per browser by the app. **Save for** chooses global defaults or an exchange-qualified ticker override. Switching a ticker back to global removes its override. Other ticker overrides remain independent. The free embed does not expose arbitrary indicator input changes, drawings, or internal layout settings for the app to capture. Configure supported choices using **Indicators** above a chart. No CSV upload is provided.

## Data sources

- SEC via EdgarTools is the primary source for US-registered ETF holdings. Requests are scoped to the exact fund series and checked against the ticker. The top 50 are shown; the complete parsed portfolio is retained and downloadable as JSON. Reports have separate reporting and filing dates.
- Yahoo via yfinance supplies daily price history, fund characteristics and equity-sector allocations. The top-ten holdings feed is a separate current-data fallback and never substitutes for historical SEC portfolios. Reporting dates unavailable from Yahoo remain explicitly unknown.
- The official BlackRock IVV CSV is available as an additional latest-holdings source. Other direct issuer adapters have not been verified.
- European and Asian listings do not automatically acquire SEC coverage through a similarly named US ETF.

1D uses the previous available daily close. 7D and 1M use the close on or before the calendar cutoff. YTD uses the last close on or before prior year-end. Changes are price returns in listing currency and exclude dividends. The latest daily bar can be incomplete. Responses are cached for six hours.

Holdings comparisons require two different reporting periods from the same SEC fund series. Positions match by ISIN, CUSIP or ticker, then security description; duplicate lots aggregate. Changes are percentage points of NAV, not returns or evidence of purchases/sales. Market movements, fund flows and security identifier changes can affect the comparison.

Comparison inputs accept either date order, automatically sort earlier to later, and show errors beside the comparison controls. Dates initially use the latest loaded reporting date and its preceding quarter end. Two cutoffs resolving to the same report produce a specific explanation instead of a misleading comparison.

## Local setup

Python lives in the parent workspace `.venv`; dependencies are pinned in `scripts/requirements-etf.txt`. Override its executable with `OPENSTOCK_PYTHON` if needed. The approved SEC contact identity is in ignored `.env.local` under `EDGAR_IDENTITY`; do not commit it.

Full source snapshots are stored outside the repository at `../.openstock-runtime/research`. Keep this directory for later Python or notebook analysis. Holdings histories are periodic public disclosures, not a daily historical reconstruction. No data is invented for missing dates.

The Node API `/api/etfs/data` requires an authenticated app session, uses a fixed ETF registry, and invokes the local Python connector without a shell. Three concurrent research requests are allowed; repeated requests share an in-flight result.

Run calculations tests with `../.venv/Scripts/python.exe scripts/test_etf_data.py`; run application tests with `npm test` and type checks with `npx tsc --noEmit`.
