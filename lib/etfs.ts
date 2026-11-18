export type Etf = {
    symbol: string; name: string; issuer: string; exposure: string;
    asset: 'Equity' | 'Bonds'; listing: 'US' | 'Europe' | 'Asia';
    tv: string; watchSymbol?: string;
};

// A starter directory, not an exhaustive exchange inventory. Exchange-qualified
// chart symbols and Finnhub watchlist symbols are deliberately kept separate.
const us = (symbol: string, name: string, issuer: string, exposure: string, asset: Etf['asset'] = 'Equity', exchange = 'AMEX'): Etf =>
    ({ symbol, name, issuer, exposure, asset, listing: 'US', tv: `${exchange}:${symbol}`, watchSymbol: symbol });

export const ETFS: Etf[] = [
    us('VOO', 'Vanguard S&P 500 ETF', 'Vanguard', 'US'),
    us('VTI', 'Vanguard Total Stock Market ETF', 'Vanguard', 'US'),
    us('VT', 'Vanguard Total World Stock ETF', 'Vanguard', 'Global'),
    us('VEA', 'Vanguard FTSE Developed Markets ETF', 'Vanguard', 'Developed ex-US'),
    us('VWO', 'Vanguard FTSE Emerging Markets ETF', 'Vanguard', 'Emerging markets'),
    us('VGK', 'Vanguard FTSE Europe ETF', 'Vanguard', 'Europe'),
    us('VPL', 'Vanguard FTSE Pacific ETF', 'Vanguard', 'Asia-Pacific'),
    us('VIG', 'Vanguard Dividend Appreciation ETF', 'Vanguard', 'US'),
    us('IVV', 'iShares Core S&P 500 ETF', 'BlackRock / iShares', 'US'),
    us('ITOT', 'iShares Core S&P Total US Stock Market ETF', 'BlackRock / iShares', 'US'),
    us('IXUS', 'iShares Core MSCI Total International Stock ETF', 'BlackRock / iShares', 'Global ex-US', 'Equity', 'NASDAQ'),
    us('IEFA', 'iShares Core MSCI EAFE ETF', 'BlackRock / iShares', 'Developed ex-US'),
    us('IEMG', 'iShares Core MSCI Emerging Markets ETF', 'BlackRock / iShares', 'Emerging markets'),
    us('IEUR', 'iShares Core MSCI Europe ETF', 'BlackRock / iShares', 'Europe'),
    us('EWJ', 'iShares MSCI Japan ETF', 'BlackRock / iShares', 'Japan'),
    us('MCHI', 'iShares MSCI China ETF', 'BlackRock / iShares', 'China', 'Equity', 'NASDAQ'),
    us('INDA', 'iShares MSCI India ETF', 'BlackRock / iShares', 'India'),
    us('EWT', 'iShares MSCI Taiwan ETF', 'BlackRock / iShares', 'Taiwan'),
    us('AAXJ', 'iShares MSCI All Country Asia ex Japan ETF', 'BlackRock / iShares', 'Asia ex-Japan', 'Equity', 'NASDAQ'),
    us('SPY', 'SPDR S&P 500 ETF Trust', 'State Street / SPDR', 'US'),
    us('QQQ', 'Invesco QQQ', 'Invesco', 'Nasdaq-100', 'Equity', 'NASDAQ'),
    us('BND', 'Vanguard Total Bond Market ETF', 'Vanguard', 'US aggregate bonds', 'Bonds', 'NASDAQ'),
    us('BNDX', 'Vanguard Total International Bond ETF', 'Vanguard', 'International bonds', 'Bonds', 'NASDAQ'),
    us('VGIT', 'Vanguard Intermediate-Term Treasury ETF', 'Vanguard', 'US Treasuries', 'Bonds', 'NASDAQ'),
    us('AGG', 'iShares Core US Aggregate Bond ETF', 'BlackRock / iShares', 'US aggregate bonds', 'Bonds'),
    us('TLT', 'iShares 20+ Year Treasury Bond ETF', 'BlackRock / iShares', 'US long-term Treasuries', 'Bonds', 'NASDAQ'),
    us('IEF', 'iShares 7-10 Year Treasury Bond ETF', 'BlackRock / iShares', 'US Treasuries', 'Bonds', 'NASDAQ'),
    us('SHY', 'iShares 1-3 Year Treasury Bond ETF', 'BlackRock / iShares', 'US short-term Treasuries', 'Bonds', 'NASDAQ'),
    us('TIP', 'iShares TIPS Bond ETF', 'BlackRock / iShares', 'US inflation-linked bonds', 'Bonds'),
    us('LQD', 'iShares iBoxx Investment Grade Corporate Bond ETF', 'BlackRock / iShares', 'US corporate bonds', 'Bonds'),
    us('HYG', 'iShares iBoxx High Yield Corporate Bond ETF', 'BlackRock / iShares', 'US high-yield bonds', 'Bonds'),
    us('EMB', 'iShares J.P. Morgan USD Emerging Markets Bond ETF', 'BlackRock / iShares', 'Emerging-market bonds', 'Bonds', 'NASDAQ'),
    { symbol: 'VWRA', name: 'Vanguard FTSE All-World UCITS ETF (USD accumulating)', issuer: 'Vanguard', exposure: 'Global', asset: 'Equity', listing: 'Europe', tv: 'LSE:VWRA' },
    { symbol: 'CSPX', name: 'iShares Core S&P 500 UCITS ETF (USD accumulating)', issuer: 'BlackRock / iShares', exposure: 'US', asset: 'Equity', listing: 'Europe', tv: 'LSE:CSPX' },
    { symbol: 'IWDA', name: 'iShares Core MSCI World UCITS ETF (USD accumulating)', issuer: 'BlackRock / iShares', exposure: 'Developed markets', asset: 'Equity', listing: 'Europe', tv: 'LSE:IWDA' },
    { symbol: '2800', name: 'Tracker Fund of Hong Kong', issuer: 'Hang Seng Investment', exposure: 'Hong Kong', asset: 'Equity', listing: 'Asia', tv: 'HKEX:2800' },
];
