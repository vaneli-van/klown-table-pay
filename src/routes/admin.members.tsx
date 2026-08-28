import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { titleCase, relTime } from "@/lib/format";

const TITLE = "Members";
export const Route = createFileRoute("/admin/members")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type M = { phone: string; first_name: string | null; tier: string | null; points: number; visits: number; last_seen: string | null; restaurant_name: string | null; created_at: string };
const COLS = "1.65fr 1fr .9fr .7fr 1fr 1fr .9fr 22px";
const dateOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—");

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<M | null>(null);
  useEscape(() => setSel(null));

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_member_directory", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<M[]> => {
      const { data, error } = await supabase.from("admin_member_directory").select("*").order("last_seen", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as M[];
    },
  });

  const setTier = useMutation({
    mutationFn: async ({ phone, tier }: { phone: string; tier: string }) => {
      const { error } = await supabase.from("member_profiles").update({ tier }).eq("phone", phone);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { show(`Tier updated to ${titleCase(v.tier)}`); setSel(null); qc.invalidateQueries({ queryKey: ["admin_member_directory"] }); },
    onError: (e: any) => show(e.message ?? "Update failed"),
  });

  const all = data ?? [];
  const rows = all.filter((m) => `${m.first_name ?? ""} ${m.phone} ${m.tier ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Member directory</h2><p>Live Klown Club members from your shared backend.</p></div>
        <button className="gold-button" onClick={() => show("Exported members.csv")}>Export</button>
      </section>
      <div className="member-kpis">
        <div><span>Members</span><b>{isLoading ? "…" : all.length}</b><small className="green">live</small></div>
        <div><span>Inner Circle</span><b>{isLoading ? "…" : all.filter((m) => m.tier === "inner_circle").length}</b></div>
        <div><span>Avg. points</span><b>{isLoading ? "…" : all.length ? Math.round(all.reduce((s, m) => s + (m.points || 0), 0) / all.length).toLocaleString("en-GH") : 0}</b></div>
        <div><span>Total visits</span><b>{isLoading ? "…" : all.reduce((s, m) => s + (m.visits || 0), 0)}</b></div>
      </div>
      <div className="member-toolbar"><div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members, phone or tier" /></div></div>
      <div className="member-table">
        <div className="member-row member-head" style={{ gridTemplateColumns: COLS }}>
          <span>Member</span><span>Tier</span><span>Points</span><span>Visits</span><span>Last seen</span><span>Member since</span><span>Status</span><span />
        </div>
        {isLoading ? <div className="empty-state"><h3>Loading members…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : rows.length === 0 ? <div className="empty-state"><h3>No members yet</h3><p>Diners who join Klown appear here.</p></div>
          : rows.map((m) => (
            <button className="member-row" key={m.phone} style={{ gridTemplateColumns: COLS }} onClick={() => setSel(m)}>
              <span className="member-name"><i>{(m.first_name ?? m.phone)[0]?.toUpperCase()}</i><b>{m.first_name || m.phone}</b><small>{m.phone}</small></span>
              <span><span className={m.tier === "inner_circle" ? "status-pill live" : "status-pill"}>{titleCase(m.tier) || "Member"}</span></span>
              <span>{(m.points || 0).toLocaleString("en-GH")}</span>
              <span>{m.visits || 0}</span>
              <span>{relTime(m.last_seen)}</span>
              <span>{dateOf(m.created_at)}</span>
              <span className="healthy">Active</span>
              <span>→</span>
            </button>
          ))}
      </div>
      {sel && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="detail-drawer">
            <header><div className="detail-title"><span className="restaurant-logo large">{(sel.first_name ?? sel.phone)[0]?.toUpperCase()}</span><div><span className="panel-kicker">Member</span><h2>{sel.first_name || sel.phone}</h2><span className="status-pill live">{titleCase(sel.tier) || "Member"}</span></div></div><button onClick={() => setSel(null)}>✕</button></header>
            <section className="detail-content">
              <div className="detail-metrics">
                <div><small>Points balance</small><b>{(sel.points || 0).toLocaleString("en-GH")}</b></div>
                <div><small>Lifetime visits</small><b>{sel.visits || 0}</b></div>
                <div><small>Member since</small><b>{dateOf(sel.created_at)}</b></div>
              </div>
              <h3 style={{ marginTop: 30 }}>Change tier</h3>
              <div className="action-list">
                <button onClick={() => setTier.mutate({ phone: sel.phone, tier: "member" })} disabled={setTier.isPending}>Set to Member <span>›</span></button>
                <button onClick={() => setTier.mutate({ phone: sel.phone, tier: "regular" })} disabled={setTier.isPending}>Set to Regular <span>›</span></button>
                <button onClick={() => setTier.mutate({ phone: sel.phone, tier: "inner_circle" })} disabled={setTier.isPending}>Set to Inner Circle <span>›</span></button>
              </div>
            </section>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
