import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerSettlement, cedis, cedisShort, shortDate, titleCase, type Settlement } from "@/lib/owner-api";

const TITLE = "Settlement";

export const Route = createFileRoute("/owner/payouts")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Where your Klown payments settle, and the payments that have been paid to your account." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <SettlementBody />
    </OwnerLayout>
  ),
});

function methodLabel(m: string | null) {
  const k = (m || "").toLowerCase();
  if (k === "momo" || k === "mobile_money") return "Mobile Money";
  if (k === "card") return "Card";
  return m ? titleCase(m) : "—";
}

function SettlementBody() {
  const { restaurantId } = useOwner();
  const { data, isLoading } = useQuery<Settlement>({
    queryKey: ["owner_settlement", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerSettlement,
  });

  const connected = !!data?.connected;
  const recent = data?.recent ?? [];
  const feePct = data ? (data.fee_bps / 100).toFixed(2).replace(/\.?0+$/, "") : "0.5";

  const METRICS = [
    { label: "Paid to you, 30 days", value: data ? cedisShort(data.settled_30d_pesewas) : "…", note: data ? `${data.payments_30d} payment${data.payments_30d === 1 ? "" : "s"}` : "", cls: "green" },
    { label: "Paid to you, all time", value: data ? cedisShort(data.settled_all_pesewas) : "…", note: "through Klown", cls: "gold" },
    { label: "Last payment", value: data?.last_payment_at ? shortDate(data.last_payment_at) : data ? "None yet" : "…", note: "most recent", cls: "gold" },
    { label: "Klown fee", value: `${feePct}%`, note: "per payment, paid by the diner", cls: "gold" },
  ];

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Settlement</h2>
          <p>
            {connected
              ? "Every card and Mobile Money payment settles straight to your bank account through Paystack. Klown never holds your money."
              : "Your bank account is not connected yet, so Klown collects payments on your behalf and transfers them to you manually."}
          </p>
        </div>
        <Link to="/owner/bank" className="gold-button">Settlement account</Link>
      </section>

      <div className="metrics-grid own-metrics-4">
        {METRICS.map((m) => (
          <div className="metric-card" key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small className={m.cls}>{m.note}</small></div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Destination</span><h2>Where payments land</h2></div><Link to="/owner/bank" className="panel-link">Details ›</Link></div>
          {connected ? (
            <div className="location-card">
              <b style={{ fontWeight: 400 }}>{data?.bank_name || "Bank account"}{data?.masked ? ` · ${data.masked}` : ""}</b>
              <span>{data?.account_name || "—"}</span>
              <small><span className="status-badge status-success">Connected</span></small>
            </div>
          ) : (
            <div className="empty-state"><h3>Not connected</h3><p>Send us your bank details from the Settlement account page and we will connect direct settlement.</p></div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">How it works</span><h2>What you receive</h2></div></div>
          <div className="detail-list">
            <div className="detail-row"><span>You receive</span><b>The full bill plus tip</b></div>
            <div className="detail-row"><span>Processing fees</span><b>Added at the diner&apos;s payment prompt</b></div>
            <div className="detail-row"><span>Klown fee</span><b>{feePct}%, also covered by the diner</b></div>
            <div className="detail-row"><span>Settles</span><b>{connected ? "On Paystack's settlement schedule" : "By manual transfer from Klown"}</b></div>
          </div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-heading"><div><span className="panel-kicker">Recent</span><h2>Payments paid to you</h2></div><Link to="/owner/payments" className="panel-link">All payments ›</Link></div>
        <div className="admin-table">
          <div className="table-row own-payout-row table-head"><span>Date</span><span>Table</span><span>Method</span><span>Bill + tip</span><span>Paid to you</span></div>
          {isLoading ? (
            <div className="empty-state"><h3>Loading…</h3></div>
          ) : recent.length === 0 ? (
            <div className="empty-state"><h3>No payments yet</h3><p>Payments appear here as soon as a diner pays through Klown.</p></div>
          ) : (
            recent.map((p) => (
              <div className="table-row own-payout-row" key={p.id}>
                <span>{shortDate(p.created_at)}</span>
                <span>{p.table_label ? `Table ${p.table_label}` : "—"}</span>
                <span>{methodLabel(p.method)}</span>
                <span>{cedis(p.amount_pesewas)}{p.tip_pesewas ? ` + ${cedis(p.tip_pesewas)}` : ""}</span>
                <span><b>{cedis(p.total_pesewas)}</b></span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
