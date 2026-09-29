import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const TITLE = "Settings";

export const Route = createFileRoute("/admin/settings")({
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

type Profile = { workspace_name: string; support_email: string; contact_phone: string };
type R = { id: string; name: string; klown_fee_bps: number | null };

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const canEdit = staff?.role === "super_admin" || staff?.role === "operations_admin";

  // ── Klown profile (admin_workspace_settings, key/value) ────────────────────
  const { data: profile } = useQuery({
    queryKey: ["workspace_settings", staff?.id], enabled: !!staff,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from("admin_workspace_settings").select("key,value");
      if (error) throw error;
      const m = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      return { workspace_name: m.workspace_name ?? "Klown", support_email: m.support_email ?? "", contact_phone: m.contact_phone ?? "" };
    },
  });
  const [form, setForm] = useState<Profile>({ workspace_name: "", support_email: "", contact_phone: "" });
  useEffect(() => { if (profile) setForm(profile); }, [profile]);
  const saveProfile = useMutation({
    mutationFn: async () => {
      const name = form.workspace_name.trim();
      if (!name) throw new Error("Workspace name is required.");
      if (form.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.support_email.trim())) throw new Error("Support email doesn't look valid.");
      const rows = [
        { key: "workspace_name", value: name },
        { key: "support_email", value: form.support_email.trim() },
        { key: "contact_phone", value: form.contact_phone.trim() },
      ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from("admin_workspace_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => { show("Profile saved"); qc.invalidateQueries({ queryKey: ["workspace_settings"] }); },
    onError: (e: any) => show(e.message),
  });

  // ── Fees (restaurants.klown_fee_bps — the value the Paystack split uses) ───
  const { data: restaurants = [], isLoading: feesLoading } = useQuery({
    queryKey: ["restaurant_fees", staff?.id], enabled: !!staff,
    queryFn: async (): Promise<R[]> => {
      const { data, error } = await supabase.from("restaurants").select("id,name,klown_fee_bps").order("name");
      if (error) throw error;
      return (data ?? []) as R[];
    },
  });
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({});
  const saveFee = useMutation({
    mutationFn: async (r: R) => {
      const raw = feeDraft[r.id];
      const bps = Math.round(Number(raw));
      if (!Number.isFinite(bps) || bps < 0 || bps > 2000) throw new Error("Fee must be between 0 and 2000 bps (0% to 20%).");
      if (!window.confirm(`Set ${r.name}'s Klown fee to ${bps} bps (${(bps / 100).toFixed(2)}%)? This changes the Paystack split for all future payments at this restaurant.`)) return;
      const { error } = await supabase.from("restaurants").update({ klown_fee_bps: bps }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: (_d, r) => { show(`${r.name} fee updated`); setFeeDraft((d) => { const n = { ...d }; delete n[r.id]; return n; }); qc.invalidateQueries({ queryKey: ["restaurant_fees"] }); },
    onError: (e: any) => show(e.message),
  });
  const pct = (bps: number | null) => ((bps ?? 0) / 100).toFixed(2) + "%";

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Workspace settings</h2><p>Klown profile and the per-restaurant commission that drives the Paystack split.</p></div>
      </section>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-heading"><div><span className="panel-kicker">Klown profile</span><h2>Workspace</h2></div></div>
        <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
          <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Workspace name</span></div><input className="wide-input" value={form.workspace_name} onChange={(e) => setForm({ ...form, workspace_name: e.target.value })} disabled={!canEdit} /></label>
          <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Support email</span></div><input className="wide-input" type="email" placeholder="support@klown.io" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} disabled={!canEdit} /></label>
          <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Contact phone</span></div><input className="wide-input" placeholder="+233 …" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} disabled={!canEdit} /></label>
          {canEdit && <div><button className="gold-button" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>{saveProfile.isPending ? "Saving…" : "Save profile"}</button></div>}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-heading"><div><span className="panel-kicker">Fees &amp; revenue</span><h2>Klown commission per restaurant</h2></div></div>
        <p style={{ color: "#77736c", fontSize: 12, margin: "0 0 10px" }}>Stored in basis points (100 bps = 1%). This is the exact value used to split each Paystack payment, so a change applies to every future payment at that restaurant. Default for new restaurants is 50 bps (0.5%).</p>
        <div className="restaurant-table">
          <div className="restaurant-table-head" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr", minWidth: 560 }}><span>Restaurant</span><span>Current fee</span><span>New fee (bps)</span><span /></div>
          {feesLoading ? <div className="empty-state"><h3>Loading…</h3></div> : restaurants.map((r) => (
            <div key={r.id} className="restaurant-table-row" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr", minWidth: 560 }}>
              <span><b>{r.name}</b></span>
              <span>{r.klown_fee_bps ?? 0} bps · {pct(r.klown_fee_bps)}</span>
              <span><input className="wide-input" type="number" min={0} max={2000} step={1} placeholder={String(r.klown_fee_bps ?? 50)} value={feeDraft[r.id] ?? ""} onChange={(e) => setFeeDraft({ ...feeDraft, [r.id]: e.target.value })} disabled={!canEdit} style={{ width: 110 }} /></span>
              <span>{canEdit && <button className="outline-button" onClick={() => saveFee.mutate(r)} disabled={saveFee.isPending || !feeDraft[r.id] || Number(feeDraft[r.id]) === (r.klown_fee_bps ?? 0)}>Save</button>}</span>
            </div>
          ))}
        </div>
      </div>

      <Toast text={toast} />
    </AdminLayout>
  );
}
