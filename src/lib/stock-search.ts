import koreanStocks from "@/data/korean-stocks.json";
import { YAHOO_HEADERS } from "@/lib/stocks-shared";

export type StockSearchResult = {
  ticker: string;
  symbol: string;
  name: string;
  market: "US" | "KR";
  exchange: string;
};

type YahooSearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
  score?: number;
};

type YahooSearchResponse = {
  quotes?: YahooSearchQuote[];
};

const US_EXCHANGES = new Set([
  "NMS",
  "NYQ",
  "NCM",
  "NGM",
  "ASE",
  "PCX",
  "BTS",
  "SNP",
  "NAS",
]);

const KR_EXCHANGES = new Set(["KSC", "KOE", "KQO"]);

const KOREAN_ALIASES: Record<string, string[]> = {
  삼성전자: ["samsung electronics", "005930"],
  삼성: ["samsung electronics"],
  애플: ["apple"],
  구글: ["alphabet", "google"],
  알파벳: ["alphabet"],
  아마존: ["amazon"],
  테슬라: ["tesla"],
  엔비디아: ["nvidia"],
  네이버: ["naver"],
  카카오: ["kakao"],
  현대차: ["hyundai motor"],
  기아: ["kia"],
};

function hasHangul(text: string): boolean {
  return /[\u3131-\u318E\uAC00-\uD7A3]/.test(text);
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function toStoredTicker(symbol: string, market: "US" | "KR"): string {
  if (market === "KR") {
    return symbol.replace(/\.(KS|KQ)$/i, "");
  }
  return symbol.split(".")[0] ?? symbol;
}

function detectMarket(quote: YahooSearchQuote): "US" | "KR" | null {
  const symbol = quote.symbol ?? "";
  const exchange = quote.exchange ?? "";

  if (/\.(KS|KQ)$/i.test(symbol) || KR_EXCHANGES.has(exchange)) {
    return "KR";
  }

  if (US_EXCHANGES.has(exchange)) {
    return "US";
  }

  if (exchange === "KSC" || quote.exchDisp?.toLowerCase().includes("korea")) {
    return "KR";
  }

  return null;
}

function expandSearchQueries(query: string): string[] {
  const trimmed = query.trim();
  const queries = new Set<string>([trimmed]);

  const aliasKey = Object.keys(KOREAN_ALIASES).find(
    (key) => trimmed.includes(key) || key.includes(trimmed),
  );

  if (aliasKey) {
    for (const alias of KOREAN_ALIASES[aliasKey] ?? []) {
      queries.add(alias);
    }
  }

  if (hasHangul(trimmed)) {
    const q = normalize(trimmed);
    const local = koreanStocks
      .filter((stock) => {
        const ko = stock.nameKo.toLowerCase();
        return ko.includes(q) || q.includes(ko);
      })
      .slice(0, 2);

    for (const stock of local) {
      queries.add(stock.nameEn);
      queries.add(stock.ticker);
    }
  }

  return [...queries];
}

function searchKoreanLocal(query: string): StockSearchResult[] {
  const q = normalize(query);

  return koreanStocks
    .filter((stock) => {
      const ko = stock.nameKo.toLowerCase();
      const en = stock.nameEn.toLowerCase();
      const ticker = stock.ticker.toLowerCase();
      return ko.includes(q) || en.includes(q) || ticker.includes(q) || q.includes(ko);
    })
    .slice(0, 8)
    .map((stock) => ({
      ticker: stock.ticker,
      symbol: `${stock.ticker}.KS`,
      name: `${stock.nameKo} (${stock.nameEn})`,
      market: "KR" as const,
      exchange: "KRX",
    }));
}

async function searchYahoo(query: string): Promise<StockSearchResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true`;
    const response = await fetch(url, {
      headers: YAHOO_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as YahooSearchResponse;
    const quotes = data.quotes ?? [];

    return quotes
      .filter((quote) => quote.quoteType === "EQUITY" && quote.symbol)
      .map((quote) => {
        const market = detectMarket(quote);
        if (!market) {
          return null;
        }

        const symbol = quote.symbol!;
        return {
          ticker: toStoredTicker(symbol, market),
          symbol,
          name: quote.longname ?? quote.shortname ?? symbol,
          market,
          exchange: quote.exchDisp ?? quote.exchange ?? market,
        } satisfies StockSearchResult;
      })
      .filter((item): item is StockSearchResult => item !== null);
  } catch {
    return [];
  }
}

function dedupeResults(results: StockSearchResult[]): StockSearchResult[] {
  const seen = new Set<string>();
  const deduped: StockSearchResult[] = [];

  for (const item of results) {
    const key = `${item.market}:${item.ticker}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export async function searchStocks(
  query: string,
  market?: "US" | "KR",
): Promise<StockSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) {
    return [];
  }

  const results: StockSearchResult[] = [];

  if (!market || market === "KR") {
    results.push(...searchKoreanLocal(trimmed));
  }

  const yahooQueries = expandSearchQueries(trimmed);
  const yahooResults = await Promise.all(
    yahooQueries.map((q) => searchYahoo(q)),
  );

  for (const batch of yahooResults) {
    results.push(...batch);
  }

  const filtered = market
    ? results.filter((item) => item.market === market)
    : results;

  return dedupeResults(filtered).slice(0, 10);
}
