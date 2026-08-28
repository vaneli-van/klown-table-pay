import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const TITLE = "Points";
export const Route = createFileRoute("/admin/points")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type P = { id: string; phone: string; points: number; reason: string | null; created_at: string };
const COLS = "1.6fr 1fr 1.4fr .8fr";
const timeOf = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const [adjust, setAdjust] = useState(false);
  useEscape(() => setAdjust(false));

  const { data, isLoading, error } = useQuery({
    queryKey: ["rewards_activity", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<P[]> => {
      const { data, error } = await supabase.from("rewards_activity").select("id,phone,points,reason,created_at").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as P[];
    },
  });

  const all = data ?? [];
  const issued = all.filter((p) => p.points > 0).reduce((s, p) => s + p.points, 0);
  const redeemed = all.filter((p) => p.points < 0).reduce((s, p) => s + p.points, 0);

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro"><div><h2>Points ledger</h2><p>Live earn and redemption events across the network.</p></div><button className="gold-button" onClick={() => setAdjust(true)}>Adjust points</button></section>
      <div className="member-kpis">
        <div><span>Points issued</span><b>{isLoading ? "…" : issued.toLocaleString("en-GH")}</b><small className="green">all-time</small></div>
        <div><span>Redeemed</span><b>{isLoading ? "…" : Math.abs(redeemed).toLocaleString("en-GH")}</b></div>
        <div><span>Net outstanding</span><b>{isLoading ? "…" : (issued + redeemed).toLocaleString("en-GH")}</b></div>
        <div><span>Events</span><b>{isLoading ? "…" : all.length}</b></div>
      </div>
      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 720 }}><span>Member</span><span>Points</span><span>Reason</span><span>When</span></div>
        {isLoading ? <div className="empty-state"><h3>Loading ledger…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : all.length === 0 ? <div className="empty-state"><h3>No point events yet</h3></div>
          : all.map((p) => (
            <div className="restaurant-table-row" key={p.id} style={{ gridTemplateColumns: COLS, minWidth: 720 }}>
              <span><b>{p.phone}</b></span>
              <span className={p.points >= 0 ? "healthy" : "issue"} style={{ fontWeight: 400 }}>{p.points >= 0 ? "+" : ""}{p.points}</span>
              <span>{p.reason ?? "—"}</span>
              <span>{timeOf(p.created_at)}</span>
            </div>
          ))}
      </div>
      {adjust && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setAdjust(false)}>
          <div className="confirm-box">
            <button onClick={() => setAdjust(false)}>✕</button>
            <span className="panel-kicker">Manual adjustment</span><h3>Adjust points</h3>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Member phone</span></div><input className="wide-input" placeholder="+233 …" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Points (+/-)</span></div><input className="wide-input" type="number" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Reason</span><span className="sim-badge">required</span></div><input className="wide-input" /></label>
            <button className="gold-button" onClick={() => { show("Manual adjustment is disabled in this live test"); setAdjust(false); }}>Record adjustment</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
