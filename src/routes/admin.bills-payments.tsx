import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Bills & Payments";

export const Route = createFileRoute("/admin/bills-payments")({
  head: () => ({
    meta: [
      { title: `Klown Admin — ${TITLE}` },
      { name: "description", content: `Klown staff console: ${TITLE}.` },
      { property: "og:title", content: `Klown Admin — ${TITLE}` },
      { property: "og:description", content: `Klown staff console: ${TITLE}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Pay = { id: string; rest: string; method: string; amount: string; pesewas: number; status: "Captured" | "Refunded" | "Failed" | "Pending"; time: string };
const PAYMENTS: Pay[] = [
  { id: "#48213", rest: "Kozo", method: "Mobile Money", amount: "GH₵ 346.50", pesewas: 34650, status: "Captured", time: "10:42" },
  { id: "#48209", rest: "AYA", method: "Card", amount: "GH₵ 128.00", pesewas: 12800, status: "Captured", time: "10:31" },
  { id: "#48201", rest: "Saint Pablo", method: "Mobile Money", amount: "GH₵ 92.00", pesewas: 9200, status: "Captured", time: "10:18" },
  { id: "#48196", rest: "Kozo", method: "Klown Points", amount: "GH₵ 40.00", pesewas: 4000, status: "Refunded", time: "09:59" },
  { id: "#48090", rest: "Bistro 22", method: "Mobile Money", amount: "GH₵ 210.00", pesewas: 21000, status: "Failed", time: "09:44" },
  { id: "#48072", rest: "AYA", method: "Card", amount: "GH₵ 76.50", pesewas: 7650, status: "Pending", time: "09:31" },
];
const COLS = "1fr 1.1fr 1.1fr 1fr .9fr .7fr";

function Page() {
  const { toast, show } = useToast();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("All statuses");
  const [sel, setSel] = useState<Pay | null>(null);
  useEscape(() => setSel(null));
  const rows = PAYMENTS.filter((p) => (statusF === "All statuses" || p.status === statusF) && `${p.id} ${p.rest} ${p.method}`.toLowerCase().includes(q.toLowerCase()));
  const fee = sel ? Math.round(sel.pesewas * 0.05) : 0;
  const net = sel ? sel.pesewas - fee : 0;
  const ghs = (p: number) => "GH₵ " + (p / 100).toFixed(2);

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Payments &amp; reconciliation</h2><p>Every captured bill, refund and settlement across the network. Prototype.</p></div>
        <button className="gold-button" onClick={() => show("Exported payments.csv (prototype)")}>Export</button>
      </section>

      <div className="member-kpis">
        <div><span>Captured volume</span><b>GH₵ 214.9k</b><small className="green">this month</small></div>
        <div><span>Klown revenue</span><b>GH₵ 10.7k</b><small>5% of volume</small></div>
        <div><span>Refunds</span><b>GH₵ 1.2k</b><small>8 this month</small></div>
        <div><span>Pending settlement</span><b>GH₵ 18.4k</b><small>next payout Fri</small></div>
      </div>

      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bill, restaurant or method" /></div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option>All statuses</option><option>Captured</option><option>Refunded</option><option>Failed</option><option>Pending</option>
        </select>
      </div>

      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 820 }}>
          <span>Bill</span><span>Restaurant</span><span>Method</span><span>Amount</span><span>Status</span><span>Time</span>
        </div>
        {rows.map((p) => (
          <button className="restaurant-table-row" key={p.id} style={{ gridTemplateColumns: COLS, minWidth: 820, width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #e7e2da", background: "transparent", cursor: "pointer" }}
            onClick={() => p.status === "Captured" ? setSel(p) : show(`Bill ${p.id} is ${p.status} — no refund available`)}>
            <span><b>{p.id}</b></span>
            <span>{p.rest}</span>
            <span>{p.method}</span>
            <span><b>{p.amount}</b></span>
            <span><span className={p.status === "Captured" ? "status-badge status-success" : p.status === "Failed" ? "status-badge status-danger" : p.status === "Pending" ? "status-badge status-warning" : "status-badge"}>{p.status}</span></span>
            <span>{p.time}</span>
          </button>
        ))}
      </div>

      {sel && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="detail-drawer">
            <header>
              <div><span className="panel-kicker">Payment · {sel.method}</span><h2>{sel.id}</h2><span className="status-pill live">Captured</span></div>
              <button onClick={() => setSel(null)}>✕</button>
            </header>
            <section className="detail-content">
              <div className="detail-metrics">
                <div><small>Captured</small><b>{sel.amount}</b></div>
                <div><small>Klown fee (5%)</small><b>{ghs(fee)}</b></div>
                <div><small>Net to restaurant</small><b>{ghs(net)}</b></div>
              </div>
              <h3 style={{ marginTop: 30 }}>Issue refund</h3>
              <label className="wizard-fields" style={{ display: "block" }}>
                <div className="helper-line"><span>Refund amount</span><span className="sim-badge">max {sel.amount}</span></div>
                <input className="wide-input" defaultValue={sel.amount.replace("GH₵ ", "")} />
              </label>
              <label className="wizard-fields" style={{ display: "block" }}>
                <div className="helper-line"><span>Reason</span></div>
                <textarea className="wide-input" placeholder="e.g. duplicate charge, diner complaint" />
              </label>
              <div className="detail-note">Only captured payments can be refunded, never beyond the captured total. The real app records the refund + an audit entry before any money moves.</div>
              <div className="wizard-actions">
                <button className="quiet" onClick={() => setSel(null)}>Cancel</button>
                <button className="gold-button" onClick={() => { show(`Refund requested for ${sel.id} (prototype)`); setSel(null); }}>Request refund</button>
              </div>
            </section>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
