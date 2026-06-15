import type { Currency, Holding, Market } from "@prisma/client";
import {
  convertQuotePrice,
  fetchQuote,
  fetchUsdKrwRate,
  normalizeTicker,
  type QuoteResult,
} from "./stocks";

export type HoldingWithQuote = {
  id: string;
  ticker: string;
  name: string | null;
  market: Market;
  currency: Currency;
  boughtInKrw: boolean;
  shares: number;
  avgPrice: number;
  currentPrice: number | null;
  currentPriceDisplay: number | null;
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
  market: Market,
  displayCurrency: Currency,
  usdKrwRate: number | null,
): MarketSummary {
  const relevant = items.filter((item) => item.market === market);

  const cost = relevant.reduce((sum, item) => {
    return (
      sum +
      convertAmount(item.costBasis, item.currency, displayCurrency, usdKrwRate)
    );
  }, 0);

  const value = relevant.reduce((sum, item) => {
    const itemValue = item.currentValue ?? item.costBasis;
    return (
      sum +
      convertAmount(itemValue, item.currency, displayCurrency, usdKrwRate)
    );
  }, 0);

  const profit = value - cost;

  return {
    cost,
    value,
    profit,
    profitPercent: cost > 0 ? (profit / cost) * 100 : 0,
    currency: displayCurrency,
  };
}

function buildHoldingQuote(
  holding: Holding,
  quote: QuoteResult | null,
  usdKrwRate: number | null,
): HoldingWithQuote {
  const costBasis = holding.shares * holding.avgPrice;

  if (!quote) {
    return {
      id: holding.id,
      ticker: holding.ticker,
      name: holding.name,
      market: holding.market,
      currency: holding.currency,
      boughtInKrw: holding.boughtInKrw,
      shares: holding.shares,
      avgPrice: holding.avgPrice,
      currentPrice: null,
      currentPriceDisplay: null,
      costBasis,
      currentValue: null,
      profit: null,
      profitPercent: null,
      quoteName: null,
    };
  }

  const priceInHoldingCurrency = convertQuotePrice(
    quote.price,
    quote.currency,
    holding.currency,
    usdKrwRate,
  );

  const currentValue =
    priceInHoldingCurrency !== null
      ? holding.shares * priceInHoldingCurrency
      : null;
  const profit = currentValue !== null ? currentValue - costBasis : null;
  const profitPercent =
    profit !== null && costBasis > 0 ? (profit / costBasis) * 100 : null;

  const quoteCurrency = quote.currency === "KRW" ? "KRW" : "USD";
  const showDualPrice =
    holding.boughtInKrw &&
    quoteCurrency === "USD" &&
    holding.currency === "KRW";

  return {
    id: holding.id,
    ticker: holding.ticker,
    name: holding.name,
    market: holding.market,
    currency: holding.currency,
    boughtInKrw: holding.boughtInKrw,
    shares: holding.shares,
    avgPrice: holding.avgPrice,
    currentPrice: showDualPrice ? quote.price : priceInHoldingCurrency,
    currentPriceDisplay: priceInHoldingCurrency,
    costBasis,
    currentValue,
    profit,
    profitPercent,
    quoteName: quote.name ?? null,
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
      return buildHoldingQuote(holding, quote, usdKrwRate);
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
    usSummary: summarizeMarket(
      holdingsWithQuotes,
      "US",
      displayCurrency,
      usdKrwRate,
    ),
    krSummary: summarizeMarket(
      holdingsWithQuotes,
      "KR",
      displayCurrency,
      usdKrwRate,
    ),
    holdings: holdingsWithQuotes,
    lastUpdated: new Date().toISOString(),
  };
}
