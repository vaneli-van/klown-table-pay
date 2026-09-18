import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerOrders, cedis, cedisShort, methodLabel, titleCase, shortDate, type OwnerOrder } from "@/lib/owner-api";

const TITLE = "Orders";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const Route = createFileRoute("/owner/orders")({
  head: () => ({
    meta: [
      { title: `Klown - ${TITLE}` },
      { name: "description", content: "Every order paid through Klown, with items." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <OrdersBody />
    </OwnerLayout>
  ),
});

function OrdersBody() {
  const { restaurantId } = useOwner();
  const [from, setFrom] = useState<string>(isoDaysAgo(30));
  const [to, setTo] = useState<string>(todayIso());
  const [open, setOpen] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery<OwnerOrder[]>({
    queryKey: ["owner_orders", restaurantId, from, to],
    enabled: !!restaurantId,
    queryFn: () => ownerOrders(from, to, 1000),
  });

  const totalPesewas = useMemo(() => orders.reduce((s, o) => s + (o.total_pesewas || 0), 0), [orders]);
  const feePesewas = useMemo(() => orders.reduce((s, o) => s + (o.klown_fee_pesewas || 0), 0), [orders]);
  const multiVenue = useMemo(() => new Set(orders.map((o) => o.restaurant)).size > 1, [orders]);
  const cols = multiVenue ? "1.1fr 1fr 1fr 0.9fr 0.9fr" : "1.2fr 1fr 0.9fr 0.9fr";

  const setPreset = (days: number) => { setFrom(isoDaysAgo(days)); setTo(todayIso()); };

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Orders</h2>
          <p>Every order paid through Klown, with the items in each. Filter by date, then tap an order for the breakdown.</p>
        </div>
      </section>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            <span>From</span>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            <span>To</span>
            <input type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setPreset(7)}>7d</button>
            <button type="button" onClick={() => setPreset(30)}>30d</button>
            <button type="button" onClick={() => setPreset(90)}>90d</button>
          </div>
        </div>
      </div>

      <div className="metrics-grid own-metrics-4">
        <div className="metric-card"><span>Orders</span><strong>{isLoading ? "..." : orders.length}</strong><small className="green">in range</small></div>
        <div className="metric-card"><span>Volume</span><strong>{isLoading ? "..." : cedisShort(totalPesewas)}</strong><small className="gold">paid via Klown</small></div>
        <div className="metric-card"><span>Klown fee</span><strong>{isLoading ? "..." : cedisShort(feePesewas)}</strong><small className="green">where split is on</small></div>
        <div className="metric-card"><span>Range</span><strong style={{ fontSize: 15 }}>{shortDate(from)} - {shortDate(to)}</strong><small className="gold">inclusive</small></div>
      </div>

      <div className="panel table-panel">
        <div className="panel-heading">
          <div><span className="panel-kicker">Activity</span><h2>All Klown orders</h2></div>
        </div>
        <div className="admin-table">
          <div className="table-row table-head" style={{ display: "grid", gridTemplateColumns: cols, gap: 8 }}>
            <span>When</span>
            {multiVenue && <span>Venue</span>}
            <span>Where</span>
            <span>Method</span>
            <span>Total</span>
          </div>
          {isLoading ? (
            <div className="empty-state"><h3>Loading orders...</h3></div>
          ) : orders.length === 0 ? (
            <div className="empty-state"><h3>No orders in this range</h3><p>Paid Klown orders appear here. Widen the date range to see more.</p></div>
          ) : (
            orders.map((o, i) => (
              <div key={(o.ref ?? "") + i}>
                <div className="table-row" style={{ display: "grid", gridTemplateColumns: cols, gap: 8, cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>
                  <span><b>{shortDate(o.created_at)}</b><small>{o.ref ? "#" + o.ref.slice(-6) : "-"}</small></span>
                  {multiVenue && <span>{o.restaurant}</span>}
                  <span>{o.location}{o.server ? <small>{o.server}</small> : null}</span>
                  <span>{methodLabel(o.method)}<small><span className={o.status === "captured" || o.status === "settled" ? "status-badge status-success" : "status-badge"}>{titleCase(o.status)}</span></small></span>
                  <span><b>{cedis(o.total_pesewas)}</b>{o.tip_pesewas ? <small>{cedis(o.tip_pesewas)} tip</small> : null}</span>
                </div>
                {open === i && (
                  <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.02)" }}>
                    {(o.items ?? []).length === 0 ? (
                      <div style={{ fontSize: 13, opacity: 0.7 }}>No item detail recorded for this order.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {o.items.map((it, j) => (
                          <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                            <span>{it.qty} x {it.name}</span>
                            <span>{cedis(it.pesewas)}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, paddingTop: 6, marginTop: 2, borderTop: "1px solid rgba(0,0,0,0.08)", fontWeight: 700 }}>
                          <span>Total{o.klown_fee_pesewas != null ? " (Klown fee " + cedis(o.klown_fee_pesewas) + ")" : ""}</span>
                          <span>{cedis(o.total_pesewas)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
