export type QuoteResult = {
  symbol: string;
  price: number;
  currency: string;
  name?: string;
};

type YahooChartMeta = {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  symbol?: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
    }>;
    error?: { description?: string };
  };
};

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; AStocks/1.0; +https://github.com/astocks)",
};

export function normalizeTicker(ticker: string, market: "US" | "KR"): string {
  const trimmed = ticker.trim().toUpperCase();

  if (market === "US") {
    return trimmed.replace(/\.(US|NASDAQ|NYSE)$/i, "");
  }

  if (/\.(KS|KQ)$/.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 6) {
    return `${digits}.KS`;
  }

  return trimmed;
}

function extractPrice(meta: YahooChartMeta): number | null {
  if (meta.regularMarketPrice && meta.regularMarketPrice > 0) {
    return meta.regularMarketPrice;
  }

  if (meta.chartPreviousClose && meta.chartPreviousClose > 0) {
    return meta.chartPreviousClose;
  }

  return null;
}

export async function fetchQuote(symbol: string): Promise<QuoteResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: YAHOO_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as YahooChartResponse;
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta ? extractPrice(meta) : null;

    if (!meta || price === null) {
      return null;
    }

    return {
      symbol: meta.symbol ?? symbol,
      price,
      currency: meta.currency ?? "USD",
      name: meta.longName ?? meta.shortName,
    };
  } catch {
    return null;
  }
}

export async function fetchUsdKrwRate(): Promise<number | null> {
  const quote = await fetchQuote("KRW=X");
  return quote?.price ?? null;
}

export function convertQuotePrice(
  price: number,
  from: string,
  to: "USD" | "KRW",
  usdKrwRate: number | null,
): number | null {
  if (from === to) {
    return price;
  }

  if (!usdKrwRate) {
    return null;
  }

  if (from === "USD" && to === "KRW") {
    return price * usdKrwRate;
  }

  if (from === "KRW" && to === "USD") {
    return price / usdKrwRate;
  }

  return price;
}

export function formatMoney(amount: number, currency: "USD" | "KRW"): string {
  if (currency === "KRW") {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
