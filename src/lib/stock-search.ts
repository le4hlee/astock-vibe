import koreanStocks from "@/data/korean-stocks.json";
import { YAHOO_HEADERS } from "@/lib/stocks-shared";

export type StockSearchResult = {
  ticker: string;
  symbol: string;
  name: string;
  market: "US" | "KR";
  exchange: string;
};

type KoreanStock = {
  ticker: string;
  nameKo: string;
  nameEn: string;
  suffix?: "KS" | "KQ";
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
  "NYS",
  "OTC",
]);

const KR_EXCHANGES = new Set(["KSC", "KOE", "KQO", "KRX", "KRX1"]);

const KOREAN_ALIASES: Record<string, string[]> = {
  삼성전자: ["samsung electronics", "005930"],
  삼성: ["samsung electronics", "005930"],
  애플: ["apple", "AAPL"],
  구글: ["alphabet", "google", "GOOGL"],
  알파벳: ["alphabet", "GOOGL"],
  아마존: ["amazon", "AMZN"],
  테슬라: ["tesla", "TSLA"],
  엔비디아: ["nvidia", "NVDA"],
  네이버: ["naver", "035420"],
  카카오: ["kakao", "035720"],
  현대차: ["hyundai motor", "005380"],
  기아: ["kia", "000270"],
  엔씨: ["ncsoft", "036570"],
  엔씨소프트: ["ncsoft", "036570"],
  하이브: ["hybe", "352820"],
  크래프톤: ["krafton", "259960"],
  버크shire: ["berkshire", "BRK-B"],
};

const LOCAL_KOREAN_STOCKS = koreanStocks as KoreanStock[];

const MAX_RESULTS = 20;
const MAX_LOCAL_RESULTS = 12;

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

function looksLikeUsTicker(query: string): boolean {
  return /^[A-Z]{1,5}([.-][A-Z])?$/i.test(query.trim());
}

function looksLikeKrTicker(query: string): boolean {
  return /^\d{6}$/.test(query.trim());
}

function tickerSearchVariants(query: string): string[] {
  const trimmed = query.trim().toUpperCase();
  const variants = new Set<string>([trimmed]);

  if (trimmed.includes(".")) {
    variants.add(trimmed.replace(/\./g, "-"));
  }
  if (trimmed.includes("-")) {
    variants.add(trimmed.replace(/-/g, "."));
  }

  return [...variants];
}

function detectMarket(
  quote: YahooSearchQuote,
  marketFilter?: "US" | "KR",
): "US" | "KR" | null {
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

  if (marketFilter === "US" && /^[A-Z]{1,5}([.-][A-Z])?$/i.test(symbol)) {
    return "US";
  }

  if (marketFilter === "KR" && /^\d{6}(\.(KS|KQ))?$/i.test(symbol)) {
    return "KR";
  }

  return null;
}

function scoreKoreanMatch(stock: KoreanStock, query: string): number {
  const q = normalize(query);
  const ko = stock.nameKo.toLowerCase();
  const en = stock.nameEn.toLowerCase();
  const ticker = stock.ticker.toLowerCase();
  const qDigits = q.replace(/\D/g, "");

  if (qDigits.length === 6 && ticker === qDigits) {
    return 100;
  }
  if (ko === q || en === q) {
    return 95;
  }
  if (ko.startsWith(q) || en.startsWith(q)) {
    return 80;
  }
  if (ko.includes(q) || en.includes(q)) {
    return 65;
  }
  if (q.includes(ko) && ko.length >= 2) {
    return 60;
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => en.includes(token) || ko.includes(token))) {
    return 55;
  }

  return 0;
}

function expandSearchQueries(query: string, market?: "US" | "KR"): string[] {
  const trimmed = query.trim();
  const queries = new Set<string>([trimmed, ...tickerSearchVariants(trimmed)]);

  const aliasKey = Object.keys(KOREAN_ALIASES).find(
    (key) => trimmed.includes(key) || key.includes(trimmed),
  );

  if (aliasKey) {
    for (const alias of KOREAN_ALIASES[aliasKey] ?? []) {
      queries.add(alias);
    }
  }

  if (market === "US" && looksLikeUsTicker(trimmed)) {
    return [...queries];
  }

  if (hasHangul(trimmed) || market === "KR" || looksLikeKrTicker(trimmed)) {
    const q = normalize(trimmed);
    const local = LOCAL_KOREAN_STOCKS.filter((stock) => scoreKoreanMatch(stock, q) > 0)
      .sort((a, b) => scoreKoreanMatch(b, q) - scoreKoreanMatch(a, q))
      .slice(0, 3);

    for (const stock of local) {
      queries.add(stock.nameEn);
      queries.add(stock.ticker);
    }
  }

  if (market === "US" && trimmed.includes("berkshire")) {
    queries.add("BRK-B");
    queries.add("BRK-A");
  }

  return [...queries];
}

function searchKoreanLocal(query: string): StockSearchResult[] {
  const q = normalize(query);

  return LOCAL_KOREAN_STOCKS.map((stock) => ({
    stock,
    score: scoreKoreanMatch(stock, q),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LOCAL_RESULTS)
    .map(({ stock }) => {
      const suffix = stock.suffix ?? "KS";
      return {
        ticker: stock.ticker,
        symbol: `${stock.ticker}.${suffix}`,
        name: `${stock.nameKo} (${stock.nameEn})`,
        market: "KR" as const,
        exchange: suffix === "KQ" ? "KOSDAQ" : "KOSPI",
      };
    });
}

async function searchYahoo(
  query: string,
  marketFilter?: "US" | "KR",
): Promise<StockSearchResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&enableFuzzyQuery=true`;
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
        const market = detectMarket(quote, marketFilter);
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

  const yahooQueries = expandSearchQueries(trimmed, market).slice(0, 6);
  const yahooResults = await Promise.all(
    yahooQueries.map((q) => searchYahoo(q, market)),
  );

  for (const batch of yahooResults) {
    results.push(...batch);
  }

  const filtered = market
    ? results.filter((item) => item.market === market)
    : results;

  return dedupeResults(filtered).slice(0, MAX_RESULTS);
}
