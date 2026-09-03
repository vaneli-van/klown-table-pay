import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import {
  ownerPaymentsSummary,
  ownerRecentPayments,
  cedis,
  cedisShort,
  methodLabel,
  relTime,
  titleCase,
  type PaymentsSummary,
  type RecentPayment,
} from "@/lib/owner-api";

const TITLE = "Payments";

export const Route = createFileRoute("/owner/")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Your restaurant's Klown payments, tips and recent transactions." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <PaymentsBody />
    </OwnerLayout>
  ),
});

const METHOD_COLORS = ["var(--gold)", "#373633", "#b8b1a6", "#628262"];

function PaymentsBody() {
  const { restaurantId, name } = useOwner();

  const { data: summary, isLoading: sumLoading } = useQuery<PaymentsSummary>({
    queryKey: ["owner_payments_summary", restaurantId],
    enabled: !!restaurantId,
    queryFn: () => ownerPaymentsSummary(14),
  });
  const { data: recent = [], isLoading: recentLoading } = useQuery<RecentPayment[]>({
    queryKey: ["owner_recent_payments", restaurantId],
    enabled: !!restaurantId,
    queryFn: () => ownerRecentPayments(12),
  });

  const daily = summary?.daily ?? [];
  const maxDay = Math.max(1, ...daily.map((d) => d.pesewas));
  const n = Math.max(1, daily.length - 1);
  const points = daily.map((d, i) => `${(i / n) * 100},${40 - (d.pesewas / maxDay) * 36 - 2}`).join(" ");
  const area = daily.length ? `0,40 ${points} 100,40` : "";
  const methods = summary?.by_method ?? [];
  const methodTotal = Math.max(1, methods.reduce((s, m) => s + m.pesewas, 0));

  const METRICS = [
    { label: `Volume · ${summary?.days ?? 14}d`, value: summary ? cedisShort(summary.volume_pesewas) : "…", note: "captured + settled", cls: "green" },
    { label: "Tips", value: summary ? cedisShort(summary.tips_pesewas) : "…", note: "included in volume", cls: "gold" },
    { label: "Transactions", value: summary ? String(summary.txn_count) : "…", note: "last 14 days", cls: "green" },
    { label: "Average bill", value: summary ? cedis(summary.avg_bill_pesewas) : "…", note: "per payment", cls: "gold" },
  ];

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Payments</h2>
          <p>Live captured payments for {name} from your Klown Pay backend. Last 14 days.</p>
        </div>
      </section>

      <div className="metrics-grid own-metrics-4">
        {METRICS.map((m) => (
          <div className="metric-card" key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <small className={m.cls}>{m.note}</small>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">Payments</span><h2>Daily volume</h2></div>
          </div>
          <div className="admin-chart">
            <div className="chart-grid">
              <span>{cedisShort(maxDay)}</span>
              <span>{cedisShort(maxDay / 2)}</span>
              <span>GH₵0</span>
            </div>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
              {daily.length > 0 && <polygon points={area} fill="rgba(200,165,107,0.16)" />}
              {daily.length > 0 && <polyline points={points} fill="none" stroke="var(--gold)" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />}
            </svg>
            <div className="chart-labels">
              <span>{daily[0]?.day ?? ""}</span>
              <span>{daily[daily.length - 1]?.day ?? ""}</span>
            </div>
          </div>
          {sumLoading && <div className="detail-note"><span>Loading payments…</span></div>}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">Payment methods</span><h2>How diners pay</h2></div>
          </div>
          {methods.length === 0 ? (
            <div className="empty-state"><h3>No payments yet</h3><p>Method split shows once diners start paying.</p></div>
          ) : (
            <div className="legend own-method-legend">
              {methods.map((m, i) => {
                const pct = Math.round((m.pesewas / methodTotal) * 100);
                return (
                  <div className="own-method-row" key={m.method}>
                    <span><i style={{ background: METHOD_COLORS[i % METHOD_COLORS.length] }} />{methodLabel(m.method)}<b>{pct}%</b></span>
                    <div className="own-bar"><i style={{ width: `${pct}%`, background: METHOD_COLORS[i % METHOD_COLORS.length] }} /></div>
                    <small>{cedis(m.pesewas)} · {m.count} txns</small>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-heading">
          <div><span className="panel-kicker">Activity</span><h2>Recent payments</h2></div>
        </div>
        <div className="admin-table">
          <div className="table-row own-pay-row table-head">
            <span>When</span><span>Table</span><span>Method</span><span>Status</span><span>Amount</span>
          </div>
          {recentLoading ? (
            <div className="empty-state"><h3>Loading…</h3></div>
          ) : recent.length === 0 ? (
            <div className="empty-state"><h3>No payments yet</h3><p>Payments appear here as diners pay their bills.</p></div>
          ) : (
            recent.map((p, i) => (
              <div className="table-row own-pay-row" key={(p.provider_ref ?? "") + i}>
                <span><b>{relTime(p.created_at)}</b><small>{p.provider_ref ? "#" + p.provider_ref.slice(-6) : "—"}</small></span>
                <span>{p.table_label ? "Table " + p.table_label : "—"}</span>
                <span>{methodLabel(p.method)}</span>
                <span>
                  <span className={p.status === "captured" || p.status === "settled" ? "status-badge status-success" : p.status === "failed" ? "status-badge status-danger" : "status-badge"}>
                    {titleCase(p.status)}
                  </span>
                </span>
                <span><b>{cedis(p.total_pesewas)}</b>{p.tip_pesewas ? <small>{cedis(p.tip_pesewas)} tip</small> : null}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
