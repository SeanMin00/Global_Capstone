import StockDetailView from "../stock-detail-view";

type Props = {
  params: Promise<{ ticker: string }>;
};

export default async function StockTickerPage({ params }: Props) {
  const { ticker } = await params;

  return <StockDetailView initialTicker={ticker} />;
}
