"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import type { PortfolioSummary } from "@/lib/portfolio";
import { formatMoney, formatPercent } from "@/lib/stocks";
import { Field, inputClass } from "@/components/auth-shell";

type DisplayCurrency = "USD" | "KRW";

export function DashboardClient({
  userName,
  userEmail,
  initialPortfolio,
}: {
  userName?: string | null;
  userEmail?: string | null;
  initialPortfolio: PortfolioSummary;
}) {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [portfolio, setPortfolio] = useState<PortfolioSummary>(initialPortfolio);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");

  const currency = market === "US" ? "USD" : "KRW";

  const loadPortfolio = useCallback(
    async (currency: DisplayCurrency, silent = false) => {
      if (silent) {
        setRefreshing(true);
      }
      setError("");

      try {
        const response = await fetch(
          `/api/portfolio?currency=${currency}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Failed to load portfolio");
        }

        const data = (await response.json()) as PortfolioSummary;
        setPortfolio(data);
      } catch {
        setError("Could not load portfolio. Please try again.");
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void loadPortfolio(displayCurrency, true);
    }, 60_000);

    return () => clearInterval(interval);
  }, [displayCurrency, loadPortfolio]);

  async function handleCurrencyChange(currency: DisplayCurrency) {
    setDisplayCurrency(currency);
    await loadPortfolio(currency, true);
  }

  async function handleAddHolding(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const response = await fetch("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker,
        name: name || undefined,
        market,
        currency,
        shares: Number(shares),
        avgPrice: Number(avgPrice),
      }),
    });

    const data = (await response.json()) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setFormError(data.error ?? "Unable to add holding.");
      return;
    }

    setTicker("");
    setName("");
    setShares("");
    setAvgPrice("");
    setShowForm(false);
    await loadPortfolio(displayCurrency, true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this holding from your portfolio?")) {
      return;
    }

    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    await loadPortfolio(displayCurrency, true);
  }

  const profitColor =
    portfolio.totalProfit >= 0 ? "text-profit" : "text-loss";

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Portfolio</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {userName || "Your holdings"}
          </h1>
          {userEmail ? (
            <p className="mt-1 text-sm text-muted">{userEmail}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CurrencyToggle
            value={displayCurrency}
            onChange={(currency) => void handleCurrencyChange(currency)}
          />
          <button
            type="button"
            onClick={() => void loadPortfolio(displayCurrency, true)}
            disabled={refreshing}
            className="rounded-lg border border-card-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-loss/40 bg-card/60 p-10 text-center text-loss">
          {error}
        </div>
      ) : (
        <>
          <section className="mb-8 grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
            <SummaryCard
              label="Total profit"
              value={formatPercent(portfolio.totalProfitPercent)}
              sub={`${formatMoney(portfolio.totalProfit, displayCurrency)} overall`}
              valueClass={profitColor}
            />
            <SummaryCard
              label="Portfolio value"
              value={formatMoney(portfolio.totalValue, displayCurrency)}
              sub={`Cost ${formatMoney(portfolio.totalCost, displayCurrency)}`}
            />
            <SummaryCard
              label="Last updated"
              value={new Date(portfolio.lastUpdated).toLocaleTimeString()}
              sub={
                portfolio.usdKrwRate
                  ? `1 USD = ${portfolio.usdKrwRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} KRW`
                  : "FX rate unavailable"
              }
            />
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-2">
            <MarketCard
              title="US stocks (USD)"
              summary={portfolio.usSummary}
            />
            <MarketCard
              title="Korean stocks (KRW)"
              summary={portfolio.krSummary}
            />
          </section>

          <section className="rounded-2xl border border-card-border bg-card/60 p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-medium">Holdings</h2>
                <p className="text-sm text-muted">
                  Add tickers like AAPL for US or 005930 / 005930.KS for Korea.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                {showForm ? "Cancel" : "Add holding"}
              </button>
            </div>

            {showForm ? (
              <form
                onSubmit={handleAddHolding}
                className="mb-8 grid gap-4 rounded-xl border border-card-border bg-background/40 p-4 md:grid-cols-2"
              >
                <Field label="Ticker">
                  <input
                    value={ticker}
                    onChange={(event) => setTicker(event.target.value)}
                    placeholder={market === "US" ? "AAPL" : "005930"}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Name (optional)">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Apple Inc."
                    className={inputClass}
                  />
                </Field>
                <Field label="Market">
                  <select
                    value={market}
                    onChange={(event) =>
                      setMarket(event.target.value as "US" | "KR")
                    }
                    className={inputClass}
                  >
                    <option value="US">United States (USD)</option>
                    <option value="KR">Korea (KRW)</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <input
                    value={currency}
                    readOnly
                    className={`${inputClass} text-muted`}
                  />
                </Field>
                <Field label="Shares">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={shares}
                    onChange={(event) => setShares(event.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Average price">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={avgPrice}
                    onChange={(event) => setAvgPrice(event.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
                <div className="md:col-span-2">
                  {formError ? (
                    <p className="mb-3 text-sm text-loss">{formError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save holding"}
                  </button>
                </div>
              </form>
            ) : null}

            {portfolio.holdings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-card-border p-10 text-center text-muted">
                No holdings yet. Add your first stock to start tracking profit.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-card-border text-muted">
                    <tr>
                      <th className="px-3 py-3 font-medium">Ticker</th>
                      <th className="px-3 py-3 font-medium">Market</th>
                      <th className="px-3 py-3 font-medium">Shares</th>
                      <th className="px-3 py-3 font-medium">Avg price</th>
                      <th className="px-3 py-3 font-medium">Current</th>
                      <th className="px-3 py-3 font-medium">P/L</th>
                      <th className="px-3 py-3 font-medium">P/L %</th>
                      <th className="px-3 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((holding) => {
                      const positive = (holding.profit ?? 0) >= 0;
                      const color = positive ? "text-profit" : "text-loss";

                      return (
                        <tr
                          key={holding.id}
                          className="border-b border-card-border/60 last:border-none"
                        >
                          <td className="px-3 py-4">
                            <div className="font-medium">{holding.ticker}</div>
                            <div className="text-xs text-muted">
                              {holding.name || holding.quoteName || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            {holding.market} · {holding.currency}
                          </td>
                          <td className="px-3 py-4">{holding.shares}</td>
                          <td className="px-3 py-4">
                            {formatMoney(holding.avgPrice, holding.currency)}
                          </td>
                          <td className="px-3 py-4">
                            {holding.currentPrice !== null
                              ? formatMoney(
                                  holding.currentPrice,
                                  holding.currency,
                                )
                              : "—"}
                          </td>
                          <td className={`px-3 py-4 ${color}`}>
                            {holding.profit !== null
                              ? formatMoney(holding.profit, holding.currency)
                              : "—"}
                          </td>
                          <td className={`px-3 py-4 ${color}`}>
                            {holding.profitPercent !== null
                              ? formatPercent(holding.profitPercent)
                              : "—"}
                          </td>
                          <td className="px-3 py-4">
                            <button
                              type="button"
                              onClick={() => void handleDelete(holding.id)}
                              className="text-muted transition hover:text-loss"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  valueClass = "",
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card/70 p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueClass}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-muted">{sub}</p>
    </div>
  );
}

function MarketCard({
  title,
  summary,
}: {
  title: string;
  summary: PortfolioSummary["usSummary"];
}) {
  const color = summary.profit >= 0 ? "text-profit" : "text-loss";

  return (
    <div className="rounded-2xl border border-card-border bg-card/70 p-6">
      <p className="text-sm text-muted">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>
        {formatPercent(summary.profitPercent)}
      </p>
      <p className="mt-2 text-sm text-muted">
        Value {formatMoney(summary.value, summary.currency)} · Cost{" "}
        {formatMoney(summary.cost, summary.currency)}
      </p>
    </div>
  );
}

function CurrencyToggle({
  value,
  onChange,
}: {
  value: DisplayCurrency;
  onChange: (value: DisplayCurrency) => void;
}) {
  return (
    <div className="flex rounded-lg border border-card-border p-1">
      {(["USD", "KRW"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            value === option
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
