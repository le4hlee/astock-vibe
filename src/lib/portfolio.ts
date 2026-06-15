import type { Currency, Holding, Market } from "@prisma/client";
import { fetchQuote, fetchUsdKrwRate, normalizeTicker } from "./stocks";

export type HoldingWithQuote = {
  id: string;
  ticker: string;
  name: string | null;
  market: Market;
  currency: Currency;
  shares: number;
  avgPrice: number;
  currentPrice: number | null;
  costBasis: number;
  currentValue: number | null;
  profit: number | null;
  profitPercent: number | null;
  quoteName: string | null;
};

export type PortfolioSummary = {
  displayCurrency: Currency;
  usdKrwRate: number | null;
  totalCost: number;
  totalValue: number;
  totalProfit: number;
  totalProfitPercent: number;
  usSummary: MarketSummary;
  krSummary: MarketSummary;
  holdings: HoldingWithQuote[];
  lastUpdated: string;
};

type MarketSummary = {
  cost: number;
  value: number;
  profit: number;
  profitPercent: number;
  currency: Currency;
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

function summarizeMarket(
  items: HoldingWithQuote[],
  currency: Currency,
): MarketSummary {
  const relevant = items.filter((item) => item.currency === currency);
  const cost = relevant.reduce((sum, item) => sum + item.costBasis, 0);
  const value = relevant.reduce(
    (sum, item) => sum + (item.currentValue ?? item.costBasis),
    0,
  );
  const profit = value - cost;

  return {
    cost,
    value,
    profit,
    profitPercent: cost > 0 ? (profit / cost) * 100 : 0,
    currency,
  };
}

export async function buildPortfolioSummary(
  holdings: Holding[],
  displayCurrency: Currency = "USD",
): Promise<PortfolioSummary> {
  const usdKrwRate = await fetchUsdKrwRate();

  const holdingsWithQuotes = await Promise.all(
    holdings.map(async (holding) => {
      const symbol = normalizeTicker(holding.ticker, holding.market);
      const quote = await fetchQuote(symbol);
      const currentPrice = quote?.price ?? null;
      const costBasis = holding.shares * holding.avgPrice;
      const currentValue =
        currentPrice !== null ? holding.shares * currentPrice : null;
      const profit =
        currentValue !== null ? currentValue - costBasis : null;
      const profitPercent =
        profit !== null && costBasis > 0 ? (profit / costBasis) * 100 : null;

      return {
        id: holding.id,
        ticker: holding.ticker,
        name: holding.name,
        market: holding.market,
        currency: holding.currency,
        shares: holding.shares,
        avgPrice: holding.avgPrice,
        currentPrice,
        costBasis,
        currentValue,
        profit,
        profitPercent,
        quoteName: quote?.name ?? null,
      } satisfies HoldingWithQuote;
    }),
  );

  const totalCost = holdingsWithQuotes.reduce((sum, item) => {
    return (
      sum +
      convertAmount(item.costBasis, item.currency, displayCurrency, usdKrwRate)
    );
  }, 0);

  const totalValue = holdingsWithQuotes.reduce((sum, item) => {
    const value = item.currentValue ?? item.costBasis;
    return (
      sum + convertAmount(value, item.currency, displayCurrency, usdKrwRate)
    );
  }, 0);

  const totalProfit = totalValue - totalCost;

  return {
    displayCurrency,
    usdKrwRate,
    totalCost,
    totalValue,
    totalProfit,
    totalProfitPercent: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
    usSummary: summarizeMarket(holdingsWithQuotes, "USD"),
    krSummary: summarizeMarket(holdingsWithQuotes, "KRW"),
    holdings: holdingsWithQuotes,
    lastUpdated: new Date().toISOString(),
  };
}
