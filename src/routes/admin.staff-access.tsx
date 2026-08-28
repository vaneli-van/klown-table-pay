import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { relTime } from "@/lib/format";

const TITLE = "Staff & Access";
export const Route = createFileRoute("/admin/staff-access")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});
type S = { id: string; email: string; name: string | null; role: string; status: string; last_sign_in_at: string | null };
const ROLE: Record<string, string> = { super_admin: "Super Admin", operations_admin: "Operations Admin", finance_admin: "Finance Admin", read_only: "Read-Only Analyst" };
const CAPS = ["Restaurants", "POS", "Payments", "Refunds", "Members", "Staff", "Settings"];
const MATRIX: Record<string, ("y" | "n")[]> = {
  "Super Admin": ["y", "y", "y", "y", "y", "y", "y"], "Operations Admin": ["y", "y", "y", "n", "y", "n", "n"],
  "Finance Admin": ["n", "n", "y", "y", "y", "n", "n"], "Read-Only Analyst": ["n", "n", "y", "n", "y", "n", "n"],
};
const COLS = "1.4fr 1.8fr 1.2fr .8fr .8fr";

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [invite, setInvite] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("operations_admin");
  useEscape(() => setInvite(false));

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff", staff?.id], enabled: !!staff,
    queryFn: async (): Promise<S[]> => {
      const { data, error } = await supabase.from("staff").select("id,email,name,role,status,last_sign_in_at").order("created_at");
      if (error) throw error; return (data ?? []) as S[];
    },
  });

  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("add_bootstrap", { p_email: email.trim().toLowerCase(), p_role: role, p_name: name }); if (error) throw error; },
    onSuccess: () => { show(`${email} authorised — they can register at /admin/auth/register`); setInvite(false); setEmail(""); setName(""); },
    onError: (e: any) => show(e.message),
  });

  const all = data ?? [];
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro"><div><h2>Staff &amp; access</h2><p>Live staff on your shared backend. Role-based, enforced by RLS.</p></div><button className="gold-button" onClick={() => setInvite(true)}>+ Invite staff</button></section>
      <div className="restaurant-table" style={{ marginTop: 12 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 780 }}><span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Last sign-in</span></div>
        {isLoading ? <div className="empty-state"><h3>Loading…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : all.map((s) => (
            <div className="restaurant-table-row" key={s.id} style={{ gridTemplateColumns: COLS, minWidth: 780 }}>
              <span className="restaurant-name" style={{ cursor: "default" }}><span className="restaurant-logo">{(s.name || s.email)[0]?.toUpperCase()}</span><span><b>{s.name || "—"}</b></span></span>
              <span>{s.email}</span><span>{ROLE[s.role] ?? s.role}</span>
              <span><span className={s.status === "active" ? "status-badge status-success" : s.status === "invited" ? "status-badge status-warning" : "status-badge status-danger"}>{s.status}</span></span>
              <span>{relTime(s.last_sign_in_at)}</span>
            </div>
          ))}
      </div>
      <div className="panel capability-panel" style={{ marginTop: 12 }}>
        <div className="panel-heading"><div><span className="panel-kicker">Permission matrix</span><h2>Role capabilities</h2></div></div>
        <div className="capability-table">
          <div className="capability-row capability-head" style={{ gridTemplateColumns: "1.4fr repeat(7,1fr)" }}><span>Role</span>{CAPS.map((c) => <span key={c}>{c}</span>)}</div>
          {Object.entries(MATRIX).map(([r, row]) => (
            <div className="capability-row" key={r} style={{ gridTemplateColumns: "1.4fr repeat(7,1fr)" }}><span><b style={{ fontWeight: 400 }}>{r}</b></span>{row.map((v, i) => <span key={i}>{v === "y" ? <span className="cap-yes">●</span> : <span className="cap-no">○</span>}</span>)}</div>
          ))}
        </div>
      </div>
      {invite && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setInvite(false)}>
          <div className="confirm-box">
            <button onClick={() => setInvite(false)}>✕</button>
            <span className="panel-kicker">Invite</span><h3>Invite staff</h3>
            <p>Authorises an email to self-register. No password is stored by this app.</p>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Name</span></div><input className="wide-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Email</span></div><input className="wide-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@klown.com" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Role</span></div><select className="wide-input" value={role} onChange={(e) => setRole(e.target.value)}><option value="operations_admin">Operations Admin</option><option value="finance_admin">Finance Admin</option><option value="read_only">Read-Only Analyst</option><option value="super_admin">Super Admin</option></select></label>
            <button className="gold-button" onClick={() => email.trim() ? add.mutate() : show("Enter an email")} disabled={add.isPending}>{add.isPending ? "Authorising…" : "Authorise email"}</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
