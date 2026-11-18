export type Holding = { name: string; symbol: string; weight: number };

// Read quoted CSV fields, including escaped quotes and embedded line breaks.
export function parseHoldingsCsv(text: string): Holding[] {
    const rows: string[][] = [];
    let row: string[] = [], field = '', quoted = false;
    const delimiter = (text.split(/\r?\n/).find((line) => /weight|% of|percent/i.test(line)) ?? '').includes(';') ? ';' : ',';
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (char === '"') {
            if (quoted && text[index + 1] === '"') { field += '"'; index++; }
            else quoted = !quoted;
        } else if (!quoted && char === delimiter) { row.push(field.trim()); field = ''; }
        else if (!quoted && (char === '\n' || char === '\r')) {
            if (char === '\r' && text[index + 1] === '\n') index++;
            row.push(field.trim()); rows.push(row); row = []; field = '';
        } else field += char;
    }
    if (quoted) throw new Error('CSV contains an unclosed quoted field.');
    row.push(field.trim()); rows.push(row);
    const normalize = (value: string) => value.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9%]/g, '');
    const nameHeaders = ['name', 'holdingname', 'securityname', 'securitydescription', 'description', 'holdings'];
    const weightHeaders = ['weight', 'weight%', '%weight', 'weighting', 'portfolio%', '%ofnetassets', '%offund', '%ofassets', 'percentofnetassets', 'portfolioweight'];
    const headerIndex = rows.findIndex((cells) => cells.some((cell) => nameHeaders.includes(normalize(cell))) && cells.some((cell) => weightHeaders.includes(normalize(cell))));
    if (headerIndex < 0) throw new Error('CSV needs a Name / Security Description column and a Weight (%) / % of Net Assets column. Weights must be percentage points, e.g. 7.25.');
    const headers = rows[headerIndex].map(normalize);
    const nameIndex = headers.findIndex((header) => nameHeaders.includes(header));
    const weightIndex = headers.findIndex((header) => weightHeaders.includes(header));
    const symbolIndex = headers.findIndex((header) => ['ticker', 'symbol', 'holdingticker'].includes(header));
    const holdings: Holding[] = [];
    for (const cells of rows.slice(headerIndex + 1)) {
        const name = cells[nameIndex];
        const rawWeight = cells[weightIndex]?.trim();
        if (!name || !rawWeight || /^(total|totals)$/i.test(name)) continue;
        const numeric = (delimiter === ';' ? rawWeight.replace(',', '.') : rawWeight.replace(/,/g, '')).replace(/%/g, '').trim();
        if (!/^[+-]?\d+(\.\d+)?$/.test(numeric)) continue; // Issuer footnotes follow the data table.
        const weight = Number(numeric);
        if (weight < 0 || weight > 100) throw new Error('This importer supports long-only holdings with weights from 0 to 100%.');
        holdings.push({ name, symbol: symbolIndex >= 0 ? cells[symbolIndex] ?? '' : '', weight });
    }
    if (!holdings.length) throw new Error('No holdings with numeric percentage weights found.');
    if (holdings.reduce((sum, holding) => sum + holding.weight, 0) > 101) throw new Error('Weights exceed 101%. Check the percentage format and remove subtotals.');
    return holdings.sort((a, b) => b.weight - a.weight).slice(0, 50);
}
