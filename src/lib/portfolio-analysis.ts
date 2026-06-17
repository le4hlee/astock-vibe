import type { Currency } from "@prisma/client";
import type { HoldingWithQuote } from "@/lib/portfolio";
import type { StockProfile } from "@/lib/stock-profile";

export type HoldingAnalysisRow = {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  industry: string | null;
  profit: number | null;
  profitPercent: number | null;
  value: number;
  weight: number;
  market: "US" | "KR";
};

export type SectorBreakdown = {
  sector: string;
  value: number;
  weight: number;
  profit: number;
  holdingCount: number;
};

export type PortfolioAnalysis = {
  displayCurrency: Currency;
  totalValue: number;
  sectors: SectorBreakdown[];
  topByProfit: HoldingAnalysisRow[];
  topByProfitPercent: HoldingAnalysisRow[];
  worstByProfit: HoldingAnalysisRow[];
  largestByWeight: HoldingAnalysisRow[];
};

function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  usdKrwRate: number | null,
): number {
  if (from === to) {
    return amount;
  }

  if (!usdKrwRate) {
    return amount;
  }

  if (from === "USD" && to === "KRW") {
    return amount * usdKrwRate;
  }

  if (from === "KRW" && to === "USD") {
    return amount / usdKrwRate;
  }

  return amount;
}

function holdingDisplayName(holding: HoldingWithQuote): string {
  return holding.name ?? holding.quoteName ?? holding.ticker;
}

function buildRow(
  holding: HoldingWithQuote,
  profile: StockProfile,
  displayCurrency: Currency,
  usdKrwRate: number | null,
  totalValue: number,
): HoldingAnalysisRow {
  const rawValue = holding.currentValue ?? holding.costBasis;
  const value = convertAmount(
    rawValue,
    holding.currency,
    displayCurrency,
    usdKrwRate,
  );
  const profit =
    holding.profit !== null
      ? convertAmount(holding.profit, holding.currency, displayCurrency, usdKrwRate)
      : null;

  return {
    id: holding.id,
    ticker: holding.ticker,
    name: holdingDisplayName(holding),
    sector: profile.sector,
    industry: profile.industry,
    profit,
    profitPercent: holding.profitPercent,
    value,
    weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
    market: holding.market,
  };
}

export function buildPortfolioAnalysis(
  holdings: HoldingWithQuote[],
  profiles: Record<string, StockProfile>,
  displayCurrency: Currency,
  usdKrwRate: number | null,
): PortfolioAnalysis {
  const totalValue = holdings.reduce((sum, holding) => {
    const rawValue = holding.currentValue ?? holding.costBasis;
    return (
      sum +
      convertAmount(rawValue, holding.currency, displayCurrency, usdKrwRate)
    );
  }, 0);

  const rows = holdings.map((holding) =>
    buildRow(
      holding,
      profiles[holding.id] ?? { sector: "Other", industry: null },
      displayCurrency,
      usdKrwRate,
      totalValue,
    ),
  );

  const sectorMap = new Map<string, SectorBreakdown>();

  for (const row of rows) {
    const existing = sectorMap.get(row.sector) ?? {
      sector: row.sector,
      value: 0,
      weight: 0,
      profit: 0,
      holdingCount: 0,
    };

    existing.value += row.value;
    existing.weight += row.weight;
    existing.profit += row.profit ?? 0;
    existing.holdingCount += 1;
    sectorMap.set(row.sector, existing);
  }

  const sectors = [...sectorMap.values()].sort((a, b) => b.value - a.value);

  const withProfit = rows.filter((row) => row.profit !== null);
  const withProfitPercent = rows.filter((row) => row.profitPercent !== null);

  const topByProfit = [...withProfit]
    .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
    .slice(0, 5);

  const topByProfitPercent = [...withProfitPercent]
    .sort((a, b) => (b.profitPercent ?? 0) - (a.profitPercent ?? 0))
    .slice(0, 5);

  const worstByProfit = [...withProfit]
    .sort((a, b) => (a.profit ?? 0) - (b.profit ?? 0))
    .slice(0, 5);

  const largestByWeight = [...rows]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  return {
    displayCurrency,
    totalValue,
    sectors,
    topByProfit,
    topByProfitPercent,
    worstByProfit,
    largestByWeight,
  };
}
