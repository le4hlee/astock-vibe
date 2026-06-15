"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { inputClass } from "@/components/auth-shell";
import { useLanguage } from "@/components/language-provider";

export type StockSearchSelection = {
  ticker: string;
  name: string;
  market: "US" | "KR";
};

export type StockSearchInputHandle = {
  resolveTicker: () => string;
};

type SearchResult = StockSearchSelection & {
  symbol: string;
  exchange: string;
};

export const StockSearchInput = forwardRef<
  StockSearchInputHandle,
  {
    market: "US" | "KR";
    ticker: string;
    name: string;
    onSelect: (selection: StockSearchSelection) => void;
  }
>(function StockSearchInput({ market, ticker, name, onSelect }, ref) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function resolveTickerFromQuery(): string {
    return query.split("·")[0]?.trim().toUpperCase() ?? "";
  }

  useImperativeHandle(ref, () => ({
    resolveTicker: () => resolveTickerFromQuery() || ticker,
  }));

  useEffect(() => {
    if (ticker && name) {
      setQuery(`${ticker} · ${name}`);
    } else if (ticker) {
      setQuery(ticker);
    }
  }, [ticker, name]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(trimmed)}&market=${market}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          setResults([]);
          return;
        }

        const data = (await response.json()) as SearchResult[];
        setResults(data);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, market, open]);

  function handleSelect(result: SearchResult) {
    onSelect({
      ticker: result.ticker,
      name: result.name,
      market: result.market,
    });
    setQuery(`${result.ticker} · ${result.name}`);
    setOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (!value.trim()) {
      onSelect({ ticker: "", name: "", market });
    }
  }

  function handleBlur() {
    const manualTicker = resolveTickerFromQuery();
    if (manualTicker) {
      onSelect({
        ticker: manualTicker,
        name,
        market,
      });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={
          market === "US"
            ? t("search.usPlaceholder")
            : t("search.krPlaceholder")
        }
        required
        autoComplete="off"
        className={inputClass}
      />
      {open && (loading || results.length > 0 || query.trim().length > 0) ? (
        <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-card-border bg-card shadow-lg">
          {loading ? (
            <li className="px-4 py-3 text-sm text-muted">{t("search.searching")}</li>
          ) : results.length > 0 ? (
            results.map((result, index) => (
              <li key={`${result.market}-${result.symbol}`}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(result)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-accent-soft/30 ${
                    index === activeIndex ? "bg-accent-soft/20" : ""
                  }`}
                >
                  <div className="font-medium">{result.name}</div>
                  <div className="text-xs text-muted">
                    {result.ticker} · {result.exchange} · {result.market}
                  </div>
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-muted">{t("search.noMatches")}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
});
