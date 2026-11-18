import { notFound } from 'next/navigation';
import { ETFS } from '@/lib/etfs';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import EtfProfile from '@/components/EtfProfile';

export default async function EtfPage({ params }: { params: Promise<{ listing: string }> }) {
    const { listing } = await params;
    let identifier: string;
    try { identifier = decodeURIComponent(listing); } catch { notFound(); }
    const fund = ETFS.find((entry) => entry.tv === identifier);
    if (!fund) notFound();
    const watchlist: { symbol: string }[] = await getUserWatchlist();
    return <EtfProfile fund={fund} watched={watchlist.some((entry) => entry.symbol === fund.watchSymbol)} />;
}
