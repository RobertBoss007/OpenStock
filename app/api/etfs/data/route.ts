import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/better-auth/auth';
import { etfData } from '@/lib/etf-data-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    if (!(await getSession())?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const query = request.nextUrl.searchParams;
    try {
        const data = await etfData(query.get('provider') || 'sec', query.get('fund') || '', query.get('date') || '', query.get('period') || '1y');
        return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'ETF data unavailable.' }, { status: 502 });
    }
}
