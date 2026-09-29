import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
type Level = "Critical" | "High" | "Medium";
// key is stable per underlying row so an acknowledgement survives reloads.
type N = { key: string; level: Level; title: string; body: string; src: string; to: string };

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();

  // Live signals derived from POS health, failed payments and open support items.
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", staff?.id], enabled: !!staff,
    queryFn: async (): Promise<N[]> => {
      const [pos, fails, support] = await Promise.all([
        supabase.from("admin_pos_directory").select("id,provider,health,restaurant_name").neq("health", "healthy"),
        supabase.from("admin_payment_feed").select("id,failure_reason,restaurant_name,status").eq("status", "failed").limit(5),
        supabase.from("admin_support_queue").select("id,source,subject,restaurant_name,status").neq("status", "resolved").limit(5),
      ]);
      const out: N[] = [];
      (support.data ?? []).forEach((d: any) => out.push({
        key: "support:" + d.id,
        level: d.source === "dispute" ? "High" : "Medium", // a bill dispute is urgent; a waiter request is routine
        title: d.source === "dispute" ? "Open bill dispute" : "Open waiter request",
        body: `${d.subject}${d.restaurant_name ? " · " + d.restaurant_name : ""}`, src: "Support", to: "/admin/support",
      }));
      (fails.data ?? []).forEach((f: any) => out.push({
        key: "payment:" + f.id, level: "High", title: "Payment failed",
        body: `${f.failure_reason || "A payment attempt failed"}${f.restaurant_name ? " · " + f.restaurant_name : ""}`, src: "Payments", to: "/admin/bills-payments",
      }));
      (pos.data ?? []).forEach((p: any) => out.push({
        key: "pos:" + p.id, level: p.health === "offline" ? "Critical" : "High", title: "POS " + titleCase(p.health),
        body: `${p.restaurant_name}: ${titleCase(p.provider)} is ${p.health}.`, src: "POS", to: "/admin/pos-integrations",
      }));
      return out;
    },
  });

  // What this staff member has already acknowledged.
  const { data: acked } = useQuery({
    queryKey: ["notification_acks", staff?.id], enabled: !!staff,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from("admin_notification_acks").select("item_key");
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.item_key as string));
    },
  });

  const all = data ?? [];
  const unread = all.filter((n) => !acked?.has(n.key));
  const byLevel = (l: Level) => unread.filter((n) => n.level === l).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!staff || unread.length === 0) return;
      const rows = unread.map((n) => ({ staff_id: staff.id, item_key: n.key }));
      const { error } = await supabase.from("admin_notification_acks").upsert(rows, { onConflict: "staff_id,item_key", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => { show(unread.length ? `Marked ${unread.length} as read` : "Nothing unread"); qc.invalidateQueries({ queryKey: ["notification_acks"] }); },
    onError: (e: any) => show(e.message),
  });

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Notifications</h2><p>Live operational signals derived from POS health, payments and support. Read items stay hidden until the underlying issue changes.</p></div>
        <button className="outline-button" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unread.length === 0}>Mark all read</button>
      </section>
      <div className="member-kpis">
        <div><span>Critical</span><b>{isLoading ? "…" : byLevel("Critical")}</b></div>
        <div><span>High</span><b>{isLoading ? "…" : byLevel("High")}</b></div>
        <div><span>Medium</span><b>{isLoading ? "…" : byLevel("Medium")}</b></div>
        <div><span>Unread</span><b>{isLoading ? "…" : unread.length}</b></div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="alert-list">
          {isLoading ? <div className="empty-state"><h3>Loading…</h3></div>
            : unread.length === 0 ? <div className="empty-state"><h3>All clear</h3><p>{all.length ? "Everything here has been read." : "No POS, payment or support issues right now."}</p></div>
            : unread.map((n) => (
              <Link key={n.key} to={n.to}>
                <span className="alert-icon">!</span>
                <span><b>{n.title}</b><small>{n.body} · {n.src}</small></span>
                <span className={"status-badge " + (n.level === "Critical" ? "status-danger" : n.level === "High" ? "status-warning" : "")}>{n.level}</span>
              </Link>
            ))}
        </div>
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
