import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerAnalytics, cedis, cedisShort, methodLabel, type OwnerAnalytics } from "@/lib/owner-api";

const TITLE = "Analytics";

export const Route = createFileRoute("/owner/analytics")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Your Klown diner funnel: visits, drop-off, revenue and behaviour by restaurant." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <AnalyticsBody />
    </OwnerLayout>
  ),
});

const SCREEN_LABEL: Record<string, string> = {
  welcome: "Welcome", menu: "Menu", category: "Menu category", dish: "Dish detail",
  bill: "Bill", "bill-ready": "Bill (ready)", pay: "Pay", "full-check": "Full bill",
  recommendation: "Recommendation", split: "Split bill", "split-items": "Split by item",
  "split-lobby": "Split lobby", "split-share": "Split share", tip: "Tip", review: "Review",
  method: "Payment method", momo: "Mobile money", authorise: "Authorise", processing: "Processing",
  success: "Success", "receipt-choice": "Receipt", feedback: "Feedback",
};
const scr = (s: string) => SCREEN_LABEL[s] || s;

function fmtDur(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

const BAR = "var(--gold)";

function AnalyticsBody() {
  const { restaurantId, name } = useOwner();
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery<OwnerAnalytics>({
    queryKey: ["owner_analytics", restaurantId, days],
    enabled: !!restaurantId,
    queryFn: () => ownerAnalytics(days),
  });

  const f = data?.funnel;
  const hasBrowsing = (f?.visits ?? 0) > 0;
  const denom = Math.max(1, f?.visits ?? 0, f?.payments_started ?? 0);
  const steps = f
    ? [
        { label: "Visits (scanned)", value: f.visits },
        { label: "Viewed menu", value: f.viewed_menu },
        { label: "Viewed bill", value: f.viewed_bill },
        { label: "Reached checkout", value: f.reached_checkout },
        { label: "Payment started", value: f.payments_started },
        { label: "Payment completed", value: f.payments_succeeded },
      ]
    : [];

  const conv =
    f && f.visits > 0
      ? Math.round((f.payments_succeeded / f.visits) * 100)
      : f && f.payments_started > 0
        ? Math.round((f.payments_succeeded / f.payments_started) * 100)
        : 0;

  const daily = data?.daily ?? [];
  const maxRev = Math.max(1, ...daily.map((d) => d.revenue_pesewas));
  const n = Math.max(1, daily.length - 1);
  const pts = daily.map((d, i) => `${(i / n) * 100},${40 - (d.revenue_pesewas / maxRev) * 36 - 2}`).join(" ");
  const area = daily.length ? `0,40 ${pts} 100,40` : "";

  const byHour = data?.by_hour ?? [];
  const maxHour = Math.max(1, ...byHour.map((h) => h.visits));
  const byTable = data?.by_table ?? [];
  const tos = data?.time_on_screen ?? [];
  const maxTos = Math.max(1, ...tos.map((t) => t.avg_seconds));
  const methods = data?.method_split ?? [];
  const methodTotal = Math.max(1, methods.reduce((s, m) => s + m.revenue_pesewas, 0));

  const METRICS = [
    { label: `Revenue · ${days}d`, value: data ? cedisShort(f!.revenue_pesewas) : "…", note: "completed payments", cls: "green" },
    { label: "Payments completed", value: data ? String(f!.payments_succeeded) : "…", note: `${data ? f!.payments_started : "…"} started`, cls: "gold" },
    { label: "Conversion", value: data ? `${conv}%` : "…", note: hasBrowsing ? "of visits" : "of payments started", cls: "green" },
    { label: "Avg time to pay", value: data ? fmtDur(data.avg_time_to_pay_seconds) : "…", note: "scan to paid", cls: "gold" },
    { label: "Repeat visitors", value: data ? `${data.repeat.pct}%` : "…", note: `${data ? data.repeat.returning_visitors : "…"} of ${data ? data.repeat.total_visitors : "…"}`, cls: "green" },
    { label: "Avg tip", value: data ? `${data.tip.avg_pct}%` : "…", note: data ? `${cedis(data.tip.total_tips_pesewas)} total` : "", cls: "gold" },
  ];

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Analytics</h2>
          <p>Diner funnel and behaviour for {name}. Last {days} days.</p>
        </div>
        <div className="ops-top-actions">
          {[7, 30, 90].map((d) => (
            <button key={d} className={d === days ? "gold-button" : "outline-button"} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </section>

      {!isLoading && !hasBrowsing && (
        <div className="detail-note" style={{ marginBottom: 16 }}>
          <span>Browsing steps (visits, menu, bill) start filling once the tracking update is live on the diner app. Payment figures below are already accurate.</span>
        </div>
      )}

      <div className="metrics-grid own-metrics-3">
        {METRICS.map((m) => (
          <div className="metric-card" key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <small className={m.cls}>{m.note}</small>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div><span className="panel-kicker">Funnel</span><h2>Where diners drop off</h2></div>
        </div>
        {steps.length === 0 ? (
          <div className="empty-state"><h3>No data yet</h3></div>
        ) : (
          <div className="legend own-method-legend">
            {steps.map((st, i) => {
              const pctVisits = denom > 0 ? Math.round((st.value / denom) * 100) : 0;
              const prev = i > 0 ? steps[i - 1].value : null;
              const drop = prev && prev > 0 ? Math.round((1 - st.value / prev) * 100) : null;
              return (
                <div className="own-method-row" key={st.label}>
                  <span>{st.label}<b>{st.value}</b></span>
                  <div className="own-bar"><i style={{ width: `${pctVisits}%`, background: BAR }} /></div>
                  <small>{drop != null ? `${drop}% drop from previous` : "top of funnel"}</small>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Trend</span><h2>Daily revenue</h2></div></div>
          <div className="admin-chart">
            <div className="chart-grid"><span>{cedisShort(maxRev)}</span><span>{cedisShort(maxRev / 2)}</span><span>GH₵0</span></div>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
              {daily.length > 0 && <polygon points={area} fill="rgba(200,165,107,0.16)" />}
              {daily.length > 0 && <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />}
            </svg>
            <div className="chart-labels"><span>{daily[0]?.day ?? ""}</span><span>{daily[daily.length - 1]?.day ?? ""}</span></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Timing</span><h2>Busiest hours</h2></div></div>
          {byHour.every((h) => h.visits === 0 && h.payments === 0) ? (
            <div className="empty-state"><h3>No activity yet</h3><p>Hourly pattern appears as diners use Klown.</p></div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, padding: "8px 0" }}>
              {byHour.map((h) => (
                <div key={h.hour} title={`${h.hour}:00 — ${h.visits} visits, ${h.payments} payments`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ height: `${(h.visits / maxHour) * 100}%`, minHeight: h.visits ? 2 : 0, background: BAR, borderRadius: "2px 2px 0 0" }} />
                </div>
              ))}
            </div>
          )}
          <div className="chart-labels"><span>00:00</span><span>12:00</span><span>23:00</span></div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel table-panel">
          <div className="panel-heading"><div><span className="panel-kicker">Tables</span><h2>By table</h2></div></div>
          <div className="admin-table">
            <div className="table-row table-head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1.2fr" }}>
              <span>Table</span><span>Visits</span><span>Payments</span><span>Revenue</span>
            </div>
            {byTable.length === 0 ? (
              <div className="empty-state"><h3>No table activity yet</h3></div>
            ) : (
              byTable.slice(0, 20).map((t) => (
                <div className="table-row" key={t.table_label} style={{ gridTemplateColumns: "1fr 1fr 1fr 1.2fr" }}>
                  <span><b>Table {t.table_label}</b></span>
                  <span>{t.visits}</span>
                  <span>{t.payments}</span>
                  <span><b>{cedis(t.revenue_pesewas)}</b></span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Behaviour</span><h2>Time on each screen</h2></div></div>
          {tos.length === 0 ? (
            <div className="empty-state"><h3>Collecting data</h3><p>Screen timings appear once the tracking update is live.</p></div>
          ) : (
            <div className="legend own-method-legend">
              {tos.slice(0, 8).map((t) => (
                <div className="own-method-row" key={t.screen}>
                  <span>{scr(t.screen)}<b>{fmtDur(t.avg_seconds)}</b></span>
                  <div className="own-bar"><i style={{ width: `${(t.avg_seconds / maxTos) * 100}%`, background: BAR }} /></div>
                  <small>{t.views} views</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Payment methods</span><h2>How diners pay</h2></div></div>
          {methods.length === 0 ? (
            <div className="empty-state"><h3>No payments yet</h3></div>
          ) : (
            <div className="legend own-method-legend">
              {methods.map((m) => {
                const pct = Math.round((m.revenue_pesewas / methodTotal) * 100);
                return (
                  <div className="own-method-row" key={m.method}>
                    <span>{methodLabel(m.method)}<b>{pct}%</b></span>
                    <div className="own-bar"><i style={{ width: `${pct}%`, background: BAR }} /></div>
                    <small>{cedis(m.revenue_pesewas)} · {m.count} txns</small>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Split bill</span><h2>Group payments</h2></div></div>
          <div className="metrics-grid own-metrics-2" style={{ marginTop: 4 }}>
            <div className="metric-card">
              <span>Split-bill usage</span>
              <strong>{data ? `${data.split_usage.pct}%` : "…"}</strong>
              <small className="gold">{data ? `${data.split_usage.sessions_split} of ${data.split_usage.sessions_total} sessions` : ""}</small>
            </div>
            <div className="metric-card">
              <span>Repeat visitors</span>
              <strong>{data ? `${data.repeat.pct}%` : "…"}</strong>
              <small className="green">{data ? `${data.repeat.returning_visitors} returning` : ""}</small>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <div className="detail-note"><span>Loading analytics…</span></div>}
    </>
  );
}
