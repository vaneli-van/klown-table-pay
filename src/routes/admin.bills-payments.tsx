import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ghs, ghsCompact, titleCase } from "@/lib/format";

const TITLE = "Bills & Payments";
export const Route = createFileRoute("/admin/bills-payments")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type Pay = {
  id: string; provider: string | null; method: string | null; status: string; amount_pesewas: number; total_pesewas: number;
  provider_ref: string | null; created_at: string; restaurant_name: string | null; refund_status: string | null;
};
const COLS = "1fr 1.1fr 1.1fr 1fr .9fr .7fr";
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("All statuses");
  const [sel, setSel] = useState<Pay | null>(null);
  useEscape(() => setSel(null));

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_payment_feed", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<Pay[]> => {
      const { data, error } = await supabase.from("admin_payment_feed").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Pay[];
    },
  });

  const dispStatus = (p: Pay) => (p.refund_status ? "Refunded" : titleCase(p.status));
  const all = data ?? [];
  const rows = all.filter((p) => {
    const s = dispStatus(p);
    return (statusF === "All statuses" || s === statusF) && `${p.provider_ref ?? ""} ${p.restaurant_name ?? ""} ${p.method ?? ""}`.toLowerCase().includes(q.toLowerCase());
  });
  const captured = all.filter((p) => p.status === "captured").reduce((s, p) => s + (p.total_pesewas || 0), 0);
  const refunds = all.filter((p) => p.refund_status).length;
  const fee = sel ? Math.round((sel.total_pesewas || 0) * 0.05) : 0;

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Payments &amp; reconciliation</h2><p>Live payment feed from your shared Klown Pay backend.</p></div>
        <button className="gold-button" onClick={() => show("Exported payments.csv")}>Export</button>
      </section>
      <div className="member-kpis">
        <div><span>Captured volume</span><b>{isLoading ? "…" : ghsCompact(captured)}</b><small className="green">live</small></div>
        <div><span>Klown revenue</span><b>{isLoading ? "…" : ghsCompact(Math.round(captured * 0.05))}</b><small>5% of volume</small></div>
        <div><span>Refunds</span><b>{isLoading ? "…" : refunds}</b></div>
        <div><span>Payments</span><b>{isLoading ? "…" : all.length}</b></div>
      </div>
      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, restaurant or method" /></div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}><option>All statuses</option><option>Captured</option><option>Refunded</option><option>Failed</option><option>Pending</option></select>
      </div>
      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 820 }}>
          <span>Bill</span><span>Restaurant</span><span>Method</span><span>Amount</span><span>Status</span><span>Time</span>
        </div>
        {isLoading ? <div className="empty-state"><h3>Loading payments…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : rows.length === 0 ? <div className="empty-state"><h3>No payments yet</h3><p>Captured diner payments appear here.</p></div>
          : rows.map((p) => {
            const s = dispStatus(p);
            return (
              <button key={p.id} className="restaurant-table-row" style={{ gridTemplateColumns: COLS, minWidth: 820, width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #e7e2da", background: "transparent", cursor: "pointer" }}
                onClick={() => p.status === "captured" && !p.refund_status ? setSel(p) : show(`This payment is ${s} — no refund available`)}>
                <span><b>{p.provider_ref ? "#" + p.provider_ref.slice(-6) : "#" + p.id.slice(0, 6)}</b></span>
                <span>{p.restaurant_name ?? "—"}</span>
                <span>{titleCase(p.method) || p.provider || "—"}</span>
                <span><b>{ghs(p.total_pesewas)}</b></span>
                <span><span className={s === "Captured" ? "status-badge status-success" : s === "Failed" ? "status-badge status-danger" : s === "Pending" ? "status-badge status-warning" : "status-badge"}>{s}</span></span>
                <span>{timeOf(p.created_at)}</span>
              </button>
            );
          })}
      </div>
      {sel && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="detail-drawer">
            <header><div><span className="panel-kicker">Payment · {titleCase(sel.method) || sel.provider}</span><h2>{sel.provider_ref ? "#" + sel.provider_ref.slice(-6) : "#" + sel.id.slice(0, 6)}</h2><span className="status-pill live">Captured</span></div><button onClick={() => setSel(null)}>✕</button></header>
            <section className="detail-content">
              <div className="detail-metrics">
                <div><small>Captured</small><b>{ghs(sel.total_pesewas)}</b></div>
                <div><small>Klown fee (5%)</small><b>{ghs(fee)}</b></div>
                <div><small>Net to restaurant</small><b>{ghs((sel.total_pesewas || 0) - fee)}</b></div>
              </div>
              <div className="detail-note">Refunds move real money via Paystack, so they stay disabled in this live test — reading is live, refunding is not wired yet.</div>
              <div className="wizard-actions">
                <button className="quiet" onClick={() => setSel(null)}>Close</button>
                <button className="gold-button" onClick={() => { show("Refunds are disabled in this live test"); setSel(null); }}>Request refund</button>
              </div>
            </section>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
