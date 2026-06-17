"use client";

import type { PortfolioAnalysis } from "@/lib/portfolio-analysis";
import { formatMoney, formatPercent } from "@/lib/stocks";
import { useLanguage } from "@/components/language-provider";

export function PortfolioAnalysisPanel({
  analysis,
  loading,
}: {
  analysis: PortfolioAnalysis | null;
  loading: boolean;
}) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-card-border p-10 text-center text-muted">
        {t("analysis.loading")}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-xl border border-dashed border-card-border p-10 text-center text-muted">
        {t("analysis.unavailable")}
      </div>
    );
  }

  if (analysis.sectors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-card-border p-10 text-center text-muted">
        {t("dashboard.emptyHoldings")}
      </div>
    );
  }

  const currency = analysis.displayCurrency;

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="mb-4 text-lg font-medium">{t("analysis.sectorBreakdown")}</h3>
        <div className="grid gap-3">
          {analysis.sectors.map((sector) => (
            <div
              key={sector.sector}
              className="rounded-xl border border-card-border bg-background/30 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{sector.sector}</p>
                  <p className="text-sm text-muted">
                    {t("analysis.holdingsCount", { count: sector.holdingCount })} ·{" "}
                    {sector.weight.toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatMoney(sector.value, currency)}
                  </p>
                  <p
                    className={`text-sm ${sector.profit >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {formatMoney(sector.profit, currency)} {t("analysis.pl")}
                  </p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card-border">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(sector.weight, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalysisTable
          title={t("analysis.topProfit")}
          rows={analysis.topByProfit}
          currency={currency}
          showProfit
        />
        <AnalysisTable
          title={t("analysis.topProfitPercent")}
          rows={analysis.topByProfitPercent}
          currency={currency}
          showProfitPercent
        />
        <AnalysisTable
          title={t("analysis.worstProfit")}
          rows={analysis.worstByProfit}
          currency={currency}
          showProfit
        />
        <AnalysisTable
          title={t("analysis.largestPositions")}
          rows={analysis.largestByWeight}
          currency={currency}
          showWeight
        />
      </div>
    </div>
  );
}

function AnalysisTable({
  title,
  rows,
  currency,
  showProfit = false,
  showProfitPercent = false,
  showWeight = false,
}: {
  title: string;
  rows: PortfolioAnalysis["topByProfit"];
  currency: "USD" | "KRW";
  showProfit?: boolean;
  showProfitPercent?: boolean;
  showWeight?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <section className="rounded-xl border border-card-border bg-background/30 p-4">
      <h3 className="mb-4 font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t("analysis.noData")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const positive = (row.profit ?? 0) >= 0;
            const color = positive ? "text-profit" : "text-loss";

            return (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 border-b border-card-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {index + 1}. {row.ticker}
                  </p>
                  <p className="truncate text-sm text-muted">{row.name}</p>
                  <p className="text-xs text-muted">{row.sector}</p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  {showProfit && row.profit !== null ? (
                    <p className={`font-medium ${color}`}>
                      {formatMoney(row.profit, currency)}
                    </p>
                  ) : null}
                  {showProfitPercent && row.profitPercent !== null ? (
                    <p className={`font-medium ${color}`}>
                      {formatPercent(row.profitPercent)}
                    </p>
                  ) : null}
                  {showWeight ? (
                    <>
                      <p className="font-medium">{row.weight.toFixed(1)}%</p>
                      <p className="text-xs text-muted">
                        {formatMoney(row.value, currency)}
                      </p>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
