import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ghsCompact, titleCase, relTime } from "@/lib/format";

const TITLE = "Overview";
export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["overview", staff?.id],
    enabled: !!staff,
    queryFn: async () => {
      const [pay, rest, mem, menus, acts] = await Promise.all([
        supabase.from("admin_payment_feed").select("method,status,total_pesewas,restaurant_name,created_at,provider_ref,id").order("created_at", { ascending: false }).limit(200),
        supabase.from("admin_restaurant_directory").select("id,name,city,volume_pesewas,pos_status"),
        supabase.from("admin_member_directory").select("phone"),
        supabase.from("admin_menu_directory").select("items"),
        supabase.from("activity_log").select("actor_name,action,record_label,created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      const payments = pay.data ?? [];
      const captured = payments.filter((p: any) => p.status === "captured").reduce((s: number, p: any) => s + (p.total_pesewas || 0), 0);
      const methodTotals: Record<string, number> = {};
      payments.filter((p: any) => p.status === "captured").forEach((p: any) => { const m = (p.method || "other").toLowerCase(); methodTotals[m] = (methodTotals[m] || 0) + (p.total_pesewas || 0); });
      const items = (menus.data ?? []).reduce((s: number, m: any) => s + (m.items || 0), 0);
      const restaurants = rest.data ?? [];
      return {
        captured,
        payments,
        methodTotals,
        items,
        members: (mem.data ?? []).length,
        restaurants,
        liveRestaurants: restaurants.filter((r: any) => r.pos_status === "live").length,
        activity: acts.data ?? [],
      };
    },
  });

  const d = data;
  const mm = d ? (d.methodTotals["mobile_money"] || d.methodTotals["momo"] || 0) : 0;
  const card = d ? (d.methodTotals["card"] || 0) : 0;
  const pts = d ? (d.methodTotals["klown_points"] || d.methodTotals["points"] || 0) : 0;
  const totMethod = mm + card + pts || 1;
  const pct = (n: number) => Math.round((n / totMethod) * 100);
  const g1 = pct(mm), g2 = g1 + pct(card);
  const donutStyle = { background: `conic-gradient(var(--gold) 0 ${g1}%, #373633 ${g1}% ${g2}%, #b8b1a6 ${g2}% 100%)` };

  const METRICS = [
    { label: "Captured volume", value: d ? ghsCompact(d.captured) : "…", note: "live", cls: "green" },
    { label: "Klown revenue", value: d ? ghsCompact(Math.round(d.captured * 0.05)) : "…", note: "5% of volume", cls: "gold" },
    { label: "Active members", value: d ? String(d.members) : "…", note: "live", cls: "green" },
    { label: "Live restaurants", value: d ? String(d.liveRestaurants) : "…", note: `${d?.restaurants.length ?? 0} total`, cls: "gold" },
    { label: "Payments", value: d ? String(d.payments.length) : "…", note: "captured + attempts", cls: "green" },
    { label: "Menu items", value: d ? d.items.toLocaleString("en-GH") : "…", note: "across menus", cls: "gold" },
  ];

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Today at Klown</h2><p>Live network performance from your shared Klown Pay backend.</p></div>
        <button className="gold-button" onClick={() => show("Exported overview.csv")}>Export</button>
      </section>

      <div className="metrics-grid">
        {METRICS.map((m) => (<div className="metric-card" key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small className={m.cls}>{m.note}</small></div>))}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Payments</span><h2>Recent captures</h2></div><Link to="/admin/bills-payments" className="panel-link">View payments ›</Link></div>
          <div className="admin-table">
            <div className="table-row table-head"><span>Bill</span><span>Restaurant</span><span>Amount</span><span>When</span></div>
            {isLoading ? <div className="empty-state"><h3>Loading…</h3></div> : (d?.payments ?? []).slice(0, 6).map((p: any) => (
              <div className="table-row" key={p.id}>
                <span><b>{p.provider_ref ? "#" + p.provider_ref.slice(-6) : "#" + p.id.slice(0, 6)}</b><small>{titleCase(p.status)}</small></span>
                <span>{p.restaurant_name ?? "—"}</span>
                <span>{ghsCompact(p.total_pesewas)}</span>
                <span>{relTime(p.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Payment methods</span><h2>How diners pay</h2></div></div>
          <div className="donut-wrap">
            <div className="donut" style={donutStyle}><div><b>{pct(mm)}%</b><small>Mobile Money</small></div></div>
            <div className="legend">
              <span><i className="legend-gold" />Mobile Money <b>{pct(mm)}%</b></span>
              <span><i className="legend-dark" />Card <b>{pct(card)}%</b></span>
              <span><i className="legend-muted" />Klown Points <b>{pct(pts)}%</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="lower-grid">
        <div className="panel table-panel">
          <div className="panel-heading"><div><span className="panel-kicker">Restaurants</span><h2>By volume</h2></div><Link to="/admin/restaurants" className="panel-link">All restaurants ›</Link></div>
          <div className="admin-table">
            <div className="table-row table-head"><span>Restaurant</span><span>City</span><span>Volume</span><span>Status</span></div>
            {(d?.restaurants ?? []).slice().sort((a: any, b: any) => (b.volume_pesewas || 0) - (a.volume_pesewas || 0)).map((r: any) => (
              <div className="table-row" key={r.id}>
                <span><b>{r.name}</b><small>Klown Pay</small></span>
                <span>{r.city ?? "—"}</span>
                <span>{ghsCompact(r.volume_pesewas)}</span>
                <span><span className={r.pos_status === "live" ? "status-pill live" : "status-pill"}>{titleCase(r.pos_status) || "—"}</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Operations</span><h2>Recent activity</h2></div><Link to="/admin/activity-log" className="panel-link">Activity log ›</Link></div>
          <div className="activity-list">
            {(d?.activity ?? []).length === 0 ? <div className="empty-state"><h3>Quiet</h3><p>Privileged actions will show here.</p></div> : (d?.activity ?? []).map((a: any, i: number) => (
              <div key={i}><span className="avatar avatar-small">{(a.actor_name || "?")[0]}</span><p><b>{a.actor_name}</b> {a.action}{a.record_label ? " · " + a.record_label : ""}<small>{relTime(a.created_at)}</small></p></div>
            ))}
          </div>
        </div>
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
