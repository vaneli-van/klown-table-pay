import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { titleCase } from "@/lib/format";

const TITLE = "Notifications";
export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});
type N = { level: "Critical" | "High" | "Medium"; title: string; body: string; src: string };

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", staff?.id], enabled: !!staff,
    queryFn: async (): Promise<N[]> => {
      const [pos, fails, support] = await Promise.all([
        supabase.from("admin_pos_directory").select("provider,health,restaurant_name").neq("health", "healthy"),
        supabase.from("admin_payment_feed").select("failure_reason,restaurant_name,status").eq("status", "failed").limit(5),
        supabase.from("admin_support_queue").select("subject,restaurant_name,status").neq("status", "resolved").limit(5),
      ]);
      const out: N[] = [];
      (support.data ?? []).forEach((d: any) => out.push({ level: "Critical", title: "Open support ticket", body: `${d.subject}${d.restaurant_name ? " · " + d.restaurant_name : ""}`, src: "Support" }));
      (fails.data ?? []).forEach((f: any) => out.push({ level: "High", title: "Payment failed", body: `${f.failure_reason || "A payment attempt failed"}${f.restaurant_name ? " · " + f.restaurant_name : ""}`, src: "Payments" }));
      (pos.data ?? []).forEach((p: any) => out.push({ level: p.health === "offline" ? "High" : "Medium", title: "POS " + titleCase(p.health), body: `${p.restaurant_name}: ${titleCase(p.provider)} is ${p.health}.`, src: "POS" }));
      return out;
    },
  });
  const all = data ?? [];
  const byLevel = (l: string) => all.filter((n) => n.level === l).length;
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro"><div><h2>Notifications</h2><p>Live operational signals derived from POS health, payments and support.</p></div><button className="outline-button" onClick={() => show("Marked all read")}>Mark all read</button></section>
      <div className="member-kpis">
        <div><span>Critical</span><b>{isLoading ? "…" : byLevel("Critical")}</b></div>
        <div><span>High</span><b>{isLoading ? "…" : byLevel("High")}</b></div>
        <div><span>Medium</span><b>{isLoading ? "…" : byLevel("Medium")}</b></div>
        <div><span>Total</span><b>{isLoading ? "…" : all.length}</b></div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="alert-list">
          {isLoading ? <div className="empty-state"><h3>Loading…</h3></div>
            : all.length === 0 ? <div className="empty-state"><h3>All clear</h3><p>No POS, payment or support issues right now.</p></div>
            : all.map((n, i) => (
              <a key={i} href="#" onClick={(e) => { e.preventDefault(); show("Opened: " + n.title); }}>
                <span className="alert-icon">!</span>
                <span><b>{n.title}</b><small>{n.body} · {n.src}</small></span>
                <span className={"status-badge " + (n.level === "Critical" ? "status-danger" : n.level === "High" ? "status-warning" : "")}>{n.level}</span>
              </a>
            ))}
        </div>
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
