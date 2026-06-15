"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import type { PortfolioSummary } from "@/lib/portfolio";
import { formatMoney, formatPercent } from "@/lib/stocks";
import { Field, inputClass } from "@/components/auth-shell";

type DisplayCurrency = "USD" | "KRW";

type HoldingFormState = {
  ticker: string;
  name: string;
  market: "US" | "KR";
  shares: string;
  avgPrice: string;
  boughtInKrw: boolean;
};

const emptyForm: HoldingFormState = {
  ticker: "",
  name: "",
  market: "US",
  shares: "",
  avgPrice: "",
  boughtInKrw: false,
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HoldingFormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const currency =
    form.market === "KR" ? "KRW" : form.boughtInKrw ? "KRW" : "USD";

  const loadPortfolio = useCallback(
    async (currency: DisplayCurrency, silent = false) => {
      if (silent) {
        setRefreshing(true);
      }
      setError("");

      try {
        const response = await fetch(
          `/api/portfolio?currency=${currency}&_=${Date.now()}`,
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

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setFormError("");
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setFormError("");
  }

  function startEdit(holding: PortfolioSummary["holdings"][number]) {
    setEditingId(holding.id);
    setForm({
      ticker: holding.ticker,
      name: holding.name ?? "",
      market: holding.market,
      shares: String(holding.shares),
      avgPrice: String(holding.avgPrice),
      boughtInKrw: holding.boughtInKrw,
    });
    setShowForm(true);
    setFormError("");
  }

  async function handleCurrencyChange(currency: DisplayCurrency) {
    setDisplayCurrency(currency);
    await loadPortfolio(currency, true);
  }

  async function handleSaveHolding(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      ticker: form.ticker,
      name: form.name || undefined,
      market: form.market,
      shares: Number(form.shares),
      avgPrice: Number(form.avgPrice),
      boughtInKrw: form.market === "US" ? form.boughtInKrw : false,
    };

    const response = await fetch(
      editingId ? `/api/holdings/${editingId}` : "/api/holdings",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = (await response.json()) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setFormError(data.error ?? "Unable to save holding.");
      return;
    }

    resetForm();
    await loadPortfolio(displayCurrency, true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this holding from your portfolio?")) {
      return;
    }

    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    if (editingId === id) {
      resetForm();
    }
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
            <MarketCard title="US stocks" summary={portfolio.usSummary} />
            <MarketCard title="Korean stocks" summary={portfolio.krSummary} />
          </section>

          <section className="rounded-2xl border border-card-border bg-card/60 p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-medium">Holdings</h2>
                <p className="text-sm text-muted">
                  Add tickers like AAPL (US) or 005930 (Korea). Use{" "}
                  <strong className="text-foreground">Edit</strong> on any row to
                  update. US stocks bought in Korea: enable{" "}
                  <strong className="text-foreground">환차수익 (FX gain)</strong>{" "}
                  when adding or editing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (showForm && !editingId ? resetForm() : startAdd())}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                {showForm && !editingId ? "Cancel" : "Add holding"}
              </button>
            </div>

            {showForm ? (
              <form
                onSubmit={handleSaveHolding}
                className="mb-8 grid gap-4 rounded-xl border border-card-border bg-background/40 p-4 md:grid-cols-2"
              >
                <div className="md:col-span-2">
                  <h3 className="font-medium">
                    {editingId ? "Edit holding" : "New holding"}
                  </h3>
                </div>
                <Field label="Ticker">
                  <input
                    value={form.ticker}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        ticker: event.target.value,
                      }))
                    }
                    placeholder={form.market === "US" ? "AAPL" : "005930"}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Name (optional)">
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Apple Inc."
                    className={inputClass}
                  />
                </Field>
                <Field label="Market">
                  <select
                    value={form.market}
                    onChange={(event) => {
                      const market = event.target.value as "US" | "KR";
                      setForm((current) => ({
                        ...current,
                        market,
                        boughtInKrw: market === "KR" ? false : current.boughtInKrw,
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="US">United States</option>
                    <option value="KR">Korea</option>
                  </select>
                </Field>
                {form.market === "US" ? (
                  <label className="flex items-start gap-3 rounded-xl border-2 border-accent/40 bg-accent-soft/20 p-4 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.boughtInKrw}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          boughtInKrw: event.target.checked,
                        }))
                      }
                      className="mt-1 h-5 w-5 accent-accent"
                    />
                    <span>
                      <span className="block font-semibold text-foreground">
                        환차수익 (FX gain / 환차손익)
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        US stock bought in Korea through a domestic broker. Enter
                        average price in KRW — P/L includes exchange rate changes.
                      </span>
                    </span>
                  </label>
                ) : null}
                <Field label="Cost currency">
                  <input
                    value={currency}
                    readOnly
                    className={`${inputClass} text-muted`}
                  />
                </Field>
                <Field
                  label={
                    form.boughtInKrw && form.market === "US"
                      ? "Average price (KRW per share)"
                      : form.market === "KR"
                        ? "Average price (KRW per share)"
                        : "Average price (USD per share)"
                  }
                >
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.avgPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        avgPrice: event.target.value,
                      }))
                    }
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Shares">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.shares}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shares: event.target.value,
                      }))
                    }
                    required
                    className={inputClass}
                  />
                </Field>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  {formError ? (
                    <p className="w-full text-sm text-loss">{formError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : editingId ? "Update holding" : "Save holding"}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-card-border px-5 py-2.5 text-sm transition hover:border-accent"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}

            {portfolio.holdings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-card-border p-10 text-center text-muted">
                No holdings yet. Add your first stock to start tracking profit.
              </div>
            ) : (
              <div className="grid gap-4">
                {portfolio.holdings.map((holding) => (
                  <HoldingCard
                    key={holding.id}
                    holding={holding}
                    isEditing={editingId === holding.id}
                    onEdit={() => startEdit(holding)}
                    onDelete={() => void handleDelete(holding.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function HoldingCard({
  holding,
  isEditing,
  onEdit,
  onDelete,
}: {
  holding: PortfolioSummary["holdings"][number];
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const positive = (holding.profit ?? 0) >= 0;
  const color = positive ? "text-profit" : "text-loss";

  return (
    <article
      className={`rounded-xl border p-4 ${
        isEditing
          ? "border-accent bg-accent-soft/20"
          : "border-card-border bg-background/30"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{holding.ticker}</h3>
            {holding.boughtInKrw ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                환차수익
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            {holding.name || holding.quoteName || "—"} · {holding.market} ·{" "}
            {holding.currency}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent hover:text-white"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted transition hover:border-loss hover:text-loss"
          >
            Remove
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="text-muted">Shares</dt>
          <dd className="mt-1 font-medium">{holding.shares}</dd>
        </div>
        <div>
          <dt className="text-muted">Avg price</dt>
          <dd className="mt-1 font-medium">
            {formatMoney(holding.avgPrice, holding.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Current</dt>
          <dd className="mt-1 font-medium">
            {holding.boughtInKrw &&
            holding.currentPrice !== null &&
            holding.currentPriceDisplay !== null ? (
              <>
                <div>{formatMoney(holding.currentPrice, "USD")}</div>
                <div className="text-xs text-muted">
                  ≈ {formatMoney(holding.currentPriceDisplay, "KRW")}
                </div>
              </>
            ) : holding.currentPriceDisplay !== null ? (
              formatMoney(holding.currentPriceDisplay, holding.currency)
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted">P/L</dt>
          <dd className={`mt-1 font-medium ${color}`}>
            {holding.profit !== null
              ? formatMoney(holding.profit, holding.currency)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">P/L %</dt>
          <dd className={`mt-1 font-medium ${color}`}>
            {holding.profitPercent !== null
              ? formatPercent(holding.profitPercent)
              : "—"}
          </dd>
        </div>
      </dl>
    </article>
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
