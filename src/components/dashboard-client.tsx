"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { PortfolioSummary } from "@/lib/portfolio";
import { formatMoney, formatPercent } from "@/lib/stocks";
import { Field, inputClass } from "@/components/auth-shell";
import { useLanguage } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import {
  StockSearchInput,
  type StockSearchInputHandle,
} from "@/components/stock-search-input";
import { PortfolioAnalysisPanel } from "@/components/portfolio-analysis-panel";
import type { PortfolioAnalysis } from "@/lib/portfolio-analysis";

type DisplayCurrency = "USD" | "KRW";
type DashboardTab = "holdings" | "analysis";

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
  const searchInputRef = useRef<StockSearchInputHandle>(null);
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<DashboardTab>("holdings");
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

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
        setError(t("dashboard.loadError"));
      } finally {
        setRefreshing(false);
      }
    },
    [t],
  );

  const loadAnalysis = useCallback(async (currency = displayCurrency) => {
    setAnalysisLoading(true);
    try {
      const response = await fetch(
        `/api/portfolio/analysis?currency=${currency}&_=${Date.now()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        setAnalysis(null);
        return;
      }

      const data = (await response.json()) as PortfolioAnalysis;
      setAnalysis(data);
    } catch {
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, [displayCurrency]);

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
    if (activeTab === "analysis") {
      await loadAnalysis(currency);
    }
  }

  async function handleSaveHolding(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const resolvedTicker =
      searchInputRef.current?.resolveTicker().trim() || form.ticker.trim();

    if (!resolvedTicker) {
      setFormError(t("dashboard.selectCompany"));
      setSaving(false);
      return;
    }

    const payload = {
      ticker: resolvedTicker,
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
      setFormError(data.error ?? t("dashboard.saveError"));
      return;
    }

    resetForm();
    await loadPortfolio(displayCurrency, true);
    if (activeTab === "analysis") {
      await loadAnalysis();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("dashboard.confirmRemove"))) {
      return;
    }

    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    if (editingId === id) {
      resetForm();
    }
    await loadPortfolio(displayCurrency, true);
    if (activeTab === "analysis") {
      await loadAnalysis();
    }
  }

  const profitColor =
    portfolio.totalProfit >= 0 ? "text-profit" : "text-loss";

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t("dashboard.portfolio")}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {userName || t("dashboard.yourHoldings")}
          </h1>
          {userEmail ? (
            <p className="mt-1 text-sm text-muted">{userEmail}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageToggle />
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
            {refreshing ? t("dashboard.refreshing") : t("dashboard.refresh")}
          </button>
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
          >
            {t("nav.settings")}
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
          >
            {t("nav.logOut")}
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
              label={t("dashboard.totalProfit")}
              value={formatPercent(portfolio.totalProfitPercent)}
              sub={t("dashboard.overall", {
                amount: formatMoney(portfolio.totalProfit, displayCurrency),
              })}
              valueClass={profitColor}
            />
            <SummaryCard
              label={t("dashboard.portfolioValue")}
              value={formatMoney(portfolio.totalValue, displayCurrency)}
              sub={t("dashboard.cost", {
                amount: formatMoney(portfolio.totalCost, displayCurrency),
              })}
            />
            <SummaryCard
              label={t("dashboard.lastUpdated")}
              value={new Date(portfolio.lastUpdated).toLocaleTimeString()}
              sub={
                portfolio.usdKrwRate
                  ? t("dashboard.fxRate", {
                      rate: portfolio.usdKrwRate.toLocaleString("ko-KR", {
                        maximumFractionDigits: 2,
                      }),
                    })
                  : t("dashboard.fxUnavailable")
              }
            />
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <MarketCard
              title={t("dashboard.usStocks")}
              summary={portfolio.usSummary}
              emptyLabel={t("dashboard.noUsStocks")}
            />
            <MarketCard
              title={t("dashboard.fxGain")}
              summary={portfolio.fxSummary}
              emptyLabel={t("dashboard.noFxStocks")}
              highlight
            />
            <MarketCard
              title={t("dashboard.krStocks")}
              summary={portfolio.krSummary}
              emptyLabel={t("dashboard.noKrStocks")}
            />
          </section>

          <section className="rounded-2xl border border-card-border bg-card/60 p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <DashboardTabToggle
                  value={activeTab}
                  onChange={(tab) => {
                    setActiveTab(tab);
                    if (tab === "holdings") {
                      resetForm();
                    } else {
                      void loadAnalysis();
                    }
                  }}
                />
                {activeTab === "holdings" ? (
                  <p className="text-sm text-muted">{t("dashboard.holdingsHint")}</p>
                ) : null}
              </div>
              {activeTab === "holdings" ? (
                <button
                  type="button"
                  onClick={() => (showForm && !editingId ? resetForm() : startAdd())}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  {showForm && !editingId ? t("dashboard.cancel") : t("dashboard.addHolding")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void loadAnalysis()}
                  disabled={analysisLoading}
                  className="rounded-xl border border-card-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-60"
                >
                  {analysisLoading ? t("dashboard.refreshing") : t("dashboard.refresh")}
                </button>
              )}
            </div>

            {activeTab === "analysis" ? (
              <PortfolioAnalysisPanel analysis={analysis} loading={analysisLoading} />
            ) : (
              <>
            {showForm ? (
              <form
                onSubmit={handleSaveHolding}
                className="mb-8 grid gap-4 rounded-xl border border-card-border bg-background/40 p-4 md:grid-cols-2"
              >
                <div className="md:col-span-2">
                  <h3 className="font-medium">
                    {editingId ? t("dashboard.editHolding") : t("dashboard.newHolding")}
                  </h3>
                </div>
                <Field label={t("dashboard.company")}>
                  <StockSearchInput
                    ref={searchInputRef}
                    key={`${editingId ?? "new"}-${form.market}`}
                    market={form.market}
                    ticker={form.ticker}
                    name={form.name}
                    onSelect={(selection) =>
                      setForm((current) => ({
                        ...current,
                        ticker: selection.ticker,
                        name: selection.name || current.name,
                      }))
                    }
                  />
                </Field>
                <Field label={t("dashboard.nameOptional")}>
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
                <Field label={t("dashboard.market")}>
                  <select
                    value={form.market}
                    onChange={(event) => {
                      const market = event.target.value as "US" | "KR";
                      setForm((current) => ({
                        ...current,
                        market,
                        ticker: "",
                        name: "",
                        boughtInKrw: market === "KR" ? false : current.boughtInKrw,
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="US">{t("dashboard.marketUs")}</option>
                    <option value="KR">{t("dashboard.marketKr")}</option>
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
                        {t("dashboard.fxGainLabel")}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {t("dashboard.fxGainHint")}
                      </span>
                    </span>
                  </label>
                ) : null}
                <Field label={t("dashboard.costCurrency")}>
                  <input
                    value={currency}
                    readOnly
                    className={`${inputClass} text-muted`}
                  />
                </Field>
                <Field
                  label={
                    form.boughtInKrw && form.market === "US"
                      ? t("dashboard.avgPriceKrw")
                      : form.market === "KR"
                        ? t("dashboard.avgPriceKrw")
                        : t("dashboard.avgPriceUsd")
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
                <Field label={t("dashboard.shares")}>
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
                    {saving
                      ? t("dashboard.saving")
                      : editingId
                        ? t("dashboard.updateHolding")
                        : t("dashboard.saveHolding")}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-card-border px-5 py-2.5 text-sm transition hover:border-accent"
                    >
                      {t("dashboard.cancelEdit")}
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}

            {portfolio.holdings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-card-border p-10 text-center text-muted">
                {t("dashboard.emptyHoldings")}
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
              </>
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
  const { t } = useLanguage();
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
                {t("dashboard.fxGainBadge")}
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
            {t("dashboard.edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted transition hover:border-loss hover:text-loss"
          >
            {t("dashboard.remove")}
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="text-muted">{t("dashboard.shares")}</dt>
          <dd className="mt-1 font-medium">{holding.shares}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("dashboard.avgPrice")}</dt>
          <dd className="mt-1 font-medium">
            {formatMoney(holding.avgPrice, holding.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("dashboard.current")}</dt>
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
          <dt className="text-muted">{t("dashboard.pl")}</dt>
          <dd className={`mt-1 font-medium ${color}`}>
            {holding.profit !== null
              ? formatMoney(holding.profit, holding.currency)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("dashboard.plPercent")}</dt>
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
  emptyLabel,
  highlight = false,
}: {
  title: string;
  summary: PortfolioSummary["usSummary"];
  emptyLabel?: string;
  highlight?: boolean;
}) {
  const { t } = useLanguage();
  const isEmpty = summary.holdingCount === 0;
  const color = summary.profit >= 0 ? "text-profit" : "text-loss";

  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-accent/40 bg-accent-soft/10"
          : "border-card-border bg-card/70"
      }`}
    >
      <p className="text-sm text-muted">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${isEmpty ? "text-muted" : color}`}>
        {isEmpty ? "—" : formatPercent(summary.profitPercent)}
      </p>
      <p className="mt-2 text-sm text-muted">
        {isEmpty
          ? emptyLabel ?? t("dashboard.noHoldings")
          : t("dashboard.marketSummary", {
              value: formatMoney(summary.value, summary.currency),
              cost: formatMoney(summary.cost, summary.currency),
              count: summary.holdingCount,
            })}
      </p>
    </div>
  );
}

function DashboardTabToggle({
  value,
  onChange,
}: {
  value: DashboardTab;
  onChange: (value: DashboardTab) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex rounded-lg border border-card-border p-1">
      {(
        [
          ["holdings", t("dashboard.tabHoldings")],
          ["analysis", t("dashboard.tabAnalysis")],
        ] as const
      ).map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-md px-4 py-1.5 text-sm transition ${
            value === tab
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
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
