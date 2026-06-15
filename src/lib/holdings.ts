import type { Currency, Market } from "@prisma/client";

export type HoldingInput = {
  ticker?: string;
  name?: string;
  market?: Market;
  shares?: number;
  avgPrice?: number;
  boughtInKrw?: boolean;
};

export function resolveHoldingCurrency(
  market: Market,
  boughtInKrw: boolean,
): Currency {
  if (market === "KR") {
    return "KRW";
  }
  return boughtInKrw ? "KRW" : "USD";
}

export function validateHoldingInput(input: HoldingInput): string | null {
  const { ticker, market, shares, avgPrice } = input;

  if (!ticker?.trim() || !market || shares === undefined || avgPrice === undefined) {
    return "Ticker, market, shares, and average price are required.";
  }

  if (shares <= 0 || avgPrice <= 0) {
    return "Shares and average price must be greater than zero.";
  }

  if (market === "KR" && input.boughtInKrw) {
    return "환차수익 option only applies to US stocks.";
  }

  return null;
}

export function normalizeHoldingData(input: HoldingInput) {
  const market = input.market!;
  const boughtInKrw = market === "US" && Boolean(input.boughtInKrw);

  return {
    ticker: input.ticker!.trim().toUpperCase(),
    name: input.name?.trim() || null,
    market,
    boughtInKrw,
    currency: resolveHoldingCurrency(market, boughtInKrw),
    shares: input.shares!,
    avgPrice: input.avgPrice!,
  };
}
