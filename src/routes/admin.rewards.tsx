import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { titleCase } from "@/lib/format";

const TITLE = "Rewards";
export const Route = createFileRoute("/admin/rewards")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type R = { id: string; name: string; description: string | null; points_cost: number; tier_required: string | null; status: string; redemptions: number; remaining: number | null };

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [create, setCreate] = useState(false);
  const [name, setName] = useState(""); const [cost, setCost] = useState(400); const [tier, setTier] = useState("member");
  useEscape(() => setCreate(false));

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_reward_catalogue", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<R[]> => {
      const { data, error } = await supabase.from("admin_reward_catalogue").select("*").order("points_cost");
      if (error) throw error;
      return (data ?? []) as R[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rewards").insert({ name, points_cost: cost, tier_required: tier, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => { show("Reward created"); setCreate(false); setName(""); qc.invalidateQueries({ queryKey: ["admin_reward_catalogue"] }); },
    onError: (e: any) => show(e.message),
  });

  const all = data ?? [];
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro"><div><h2>Rewards catalogue</h2><p>Live rewards members can redeem their Klown Points for.</p></div><button className="gold-button" onClick={() => setCreate(true)}>+ Create reward</button></section>
      <div className="member-kpis">
        <div><span>Rewards</span><b>{isLoading ? "…" : all.length}</b></div>
        <div><span>Active</span><b>{isLoading ? "…" : all.filter((r) => r.status === "active").length}</b><small className="green">live</small></div>
        <div><span>Redemptions</span><b>{isLoading ? "…" : all.reduce((s, r) => s + (r.redemptions || 0), 0)}</b></div>
        <div><span>Most popular</span><b>{isLoading || !all.length ? "—" : all.slice().sort((a, b) => (b.redemptions || 0) - (a.redemptions || 0))[0].name}</b></div>
      </div>
      {isLoading ? <div className="empty-state"><h3>Loading rewards…</h3></div>
        : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
        : all.length === 0 ? <div className="empty-state"><h3>No rewards yet</h3></div>
        : (
          <div className="reward-grid">
            {all.map((r) => (
              <div className="reward-card" key={r.id}>
                <div className="reward-art">{r.name[0]}</div>
                <h3>{r.name}</h3>
                <small>{r.description || "—"}</small>
                <div className="tier-rule"><span>Cost</span><b>{r.points_cost} pts</b></div>
                <div className="tier-rule"><span>Tier</span><b>{titleCase(r.tier_required) || "Member"}</b></div>
                <div>
                  <span className={r.status === "active" ? "status-pill live" : "status-pill"}>{titleCase(r.status)}{r.remaining != null ? ` · ${r.remaining} left` : ""}</span>
                  <button className="outline-button" onClick={() => show("Redemption is disabled in this live test")}>Redeem</button>
                </div>
              </div>
            ))}
          </div>
        )}
      {create && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setCreate(false)}>
          <div className="confirm-box">
            <button onClick={() => setCreate(false)}>✕</button>
            <span className="panel-kicker">New reward</span><h3>Create reward</h3>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Name</span></div><input className="wide-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Free coffee" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Points cost</span></div><input className="wide-input" type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Tier required</span></div><select className="wide-input" value={tier} onChange={(e) => setTier(e.target.value)}><option value="member">Member</option><option value="regular">Regular</option><option value="inner_circle">Inner Circle</option></select></label>
            <button className="gold-button" onClick={() => name.trim() ? add.mutate() : show("Enter a name")} disabled={add.isPending}>{add.isPending ? "Creating…" : "Create reward"}</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
