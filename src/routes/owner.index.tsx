import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import {
  ownerPaymentsSummary,
  ownerRecentPayments,
  ownerPayouts,
  ownerIntegrations,
  ownerTickets,
  cedis,
  cedisShort,
  methodLabel,
  relTime,
  shortDate,
  titleCase,
  type PaymentsSummary,
  type RecentPayment,
  type Payouts,
  type Integrations,
  type Ticket,
} from "@/lib/owner-api";

const TITLE = "Overview";

export const Route = createFileRoute("/owner/")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "A live snapshot of your restaurant on Klown: payments, payouts, integrations and support." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <OverviewBody />
    </OwnerLayout>
  ),
});

const METHOD_COLORS = ["var(--gold)", "#373633", "#b8b1a6", "#628262"];
const linkStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--gold)", textDecoration: "none", whiteSpace: "nowrap" };

function OverviewBody() {
  const { restaurantId, name, city } = useOwner();

  const { data: summary, isLoading: sumLoading } = useQuery<PaymentsSummary>({
    queryKey: ["owner_payments_summary", restaurantId],
    enabled: !!restaurantId,
    queryFn: () => ownerPaymentsSummary(14),
  });
  const { data: recent = [], isLoading: recentLoading } = useQuery<RecentPayment[]>({
    queryKey: ["owner_recent_payments_overview", restaurantId],
    enabled: !!restaurantId,
    queryFn: () => ownerRecentPayments(6),
  });
  const { data: payouts } = useQuery<Payouts>({
    queryKey: ["owner_payouts", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerPayouts,
  });
  const { data: integrations } = useQuery<Integrations>({
    queryKey: ["owner_integrations", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerIntegrations,
  });
  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ["owner_tickets", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerTickets,
  });

  // --- daily volume chart geometry (mirrors the Payments page) ---
  const daily = summary?.daily ?? [];
  const maxDay = Math.max(1, ...daily.map((d) => d.pesewas));
  const n = Math.max(1, daily.length - 1);
  const points = daily.map((d, i) => `${(i / n) * 100},${40 - (d.pesewas / maxDay) * 36 - 2}`).join(" ");
  const area = daily.length ? `0,40 ${points} 100,40` : "";

  const methods = summary?.by_method ?? [];
  const methodTotal = Math.max(1, methods.reduce((s, m) => s + m.pesewas, 0));

  // --- payouts ---
  const settings = payouts?.settings ?? null;
  const scheduled = (payouts?.payouts ?? [])
    .filter((p) => p.status !== "paid" && p.scheduled_for)
    .sort((a, b) => new Date(a.scheduled_for as string).getTime() - new Date(b.scheduled_for as string).getTime())[0];
  const defaultAccount = (payouts?.accounts ?? []).find((a) => a.is_default) ?? (payouts?.accounts ?? [])[0];

  // --- integrations ---
  const pos = integrations?.pos ?? [];
  const connectors = integrations?.connectors ?? [];

  const openTickets = tickets.filter((t) => (t.status ?? "").toLowerCase() !== "closed" && (t.status ?? "").toLowerCase() !== "resolved");

  const METRICS = [
    { label: `Volume · ${summary?.days ?? 14}d`, value: summary ? cedisShort(summary.volume_pesewas) : "…", note: "captured + settled", cls: "green" },
    { label: "Transactions", value: summary ? String(summary.txn_count) : "…", note: `last ${summary?.days ?? 14} days`, cls: "green" },
    { label: "Average bill", value: summary ? cedis(summary.avg_bill_pesewas) : "…", note: "per payment", cls: "gold" },
    { label: "Tips", value: summary ? cedisShort(summary.tips_pesewas) : "…", note: "included in volume", cls: "gold" },
  ];

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Overview</h2>
          <p>A live snapshot of {name}{city ? `, ${city}` : ""} on Klown — payments, payouts, integrations and support, all in one place.</p>
        </div>
        <div className="ops-top-actions">
          <Link to="/owner/payments" className="outline-button">Payments</Link>
          <Link to="/owner/payouts" className="gold-button">Payouts</Link>
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
            <Link to="/owner/payments" style={linkStyle}>View all →</Link>
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

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">Payouts</span><h2>Money on the way</h2></div>
            <Link to="/owner/payouts" style={linkStyle}>View payouts →</Link>
          </div>
          <div className="metrics-grid own-metrics-2" style={{ marginTop: 4 }}>
            <div className="metric-card"><span>Available</span><strong>{settings ? cedis(settings.available_pesewas) : "…"}</strong><small className="green">ready to pay out</small></div>
            <div className="metric-card"><span>Pending</span><strong>{settings ? cedis(settings.pending_pesewas) : "…"}</strong><small className="gold">clearing</small></div>
          </div>
          <div className="detail-list" style={{ marginTop: 14 }}>
            <div className="detail-row"><span>Next payout</span><b>{scheduled ? `${cedis(scheduled.amount_pesewas)} · ${shortDate(scheduled.scheduled_for)}` : "None scheduled"}</b></div>
            <div className="detail-row"><span>Schedule</span><b>{settings ? titleCase(settings.schedule) : "—"}</b></div>
            <div className="detail-row"><span>Default account</span><b>{defaultAccount ? `${titleCase(defaultAccount.provider)} ${defaultAccount.masked ?? ""}`.trim() : "Not set"}</b></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">Integrations</span><h2>POS &amp; devices</h2></div>
            <Link to="/owner/integrations" style={linkStyle}>Manage →</Link>
          </div>
          {pos.length === 0 && connectors.length === 0 ? (
            <div className="empty-state"><h3>No integration yet</h3><p>Connect your POS to sync live bills.</p></div>
          ) : (
            <div className="detail-list" style={{ marginTop: 4 }}>
              {pos.map((p, i) => (
                <div className="detail-row" key={"pos" + i}>
                  <span>{titleCase(p.provider)}{p.branch ? ` · ${p.branch}` : ""}</span>
                  <b>
                    <span className={"status-badge " + ((p.health ?? "").toLowerCase() === "healthy" ? "status-success" : (p.health ? "status-danger" : ""))}>{titleCase(p.health ?? p.status)}</span>
                    <small style={{ marginLeft: 8, color: "var(--muted)" }}>synced {relTime(p.last_sync_at)}</small>
                  </b>
                </div>
              ))}
              {connectors.map((c, i) => (
                <div className="detail-row" key={"conn" + i}>
                  <span>{c.name || titleCase(c.provider)}</span>
                  <b><span className={"status-badge " + (c.active ? "status-success" : "")}>{c.active ? "Active" : "Idle"}</span>
                    <small style={{ marginLeft: 8, color: "var(--muted)" }}>{c.last_seen_at ? "seen " + relTime(c.last_seen_at) : ""}</small></b>
                </div>
              ))}
            </div>
          )}
          <div className="detail-note" style={{ marginTop: 14 }}>
            <span>{openTickets.length > 0 ? `${openTickets.length} open support ticket${openTickets.length === 1 ? "" : "s"}.` : "No open support tickets."} </span>
            <Link to="/owner/support" style={linkStyle}>Support →</Link>
          </div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-heading">
          <div><span className="panel-kicker">Activity</span><h2>Recent payments</h2></div>
          <Link to="/owner/payments" style={linkStyle}>View all →</Link>
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
