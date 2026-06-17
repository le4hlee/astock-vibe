import { YAHOO_HEADERS } from "@/lib/stocks-shared";
import { normalizeTicker } from "@/lib/stocks";

type QuoteSummaryResponse = {
  quoteSummary?: {
    result?: Array<{
      assetProfile?: { sector?: string; industry?: string };
      summaryProfile?: { sector?: string; industry?: string };
    }>;
  };
};

export type StockProfile = {
  sector: string;
  industry: string | null;
};

export async function fetchStockProfile(
  ticker: string,
  market: "US" | "KR",
): Promise<StockProfile> {
  const symbol = normalizeTicker(ticker, market);

  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,summaryProfile`;
    const response = await fetch(url, {
      headers: YAHOO_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackProfile(market);
    }

    const data = (await response.json()) as QuoteSummaryResponse;
    const profile = data.quoteSummary?.result?.[0];
    const sector =
      profile?.assetProfile?.sector ??
      profile?.summaryProfile?.sector ??
      profile?.assetProfile?.industry ??
      profile?.summaryProfile?.industry;

    const industry =
      profile?.assetProfile?.industry ?? profile?.summaryProfile?.industry ?? null;

    if (!sector) {
      return fallbackProfile(market);
    }

    return {
      sector,
      industry: industry && industry !== sector ? industry : null,
    };
  } catch {
    return fallbackProfile(market);
  }
}

function fallbackProfile(market: "US" | "KR"): StockProfile {
  return {
    sector: market === "KR" ? "Korean equities" : "US equities",
    industry: null,
  };
}
