import EtfExplorer from '@/components/EtfExplorer';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';

export default async function EtfsPage() {
    const watchlist: { symbol: string }[] = await getUserWatchlist();
    return <>
        <header className="page-head"><div><h1 className="page-title">ETFs</h1><p className="page-sub">Explore equity and bond funds across US, European and Asian listings.</p></div></header>
        <EtfExplorer watched={watchlist.map((fund) => fund.symbol)} />
    </>;
}
