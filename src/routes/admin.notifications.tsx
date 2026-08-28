import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";

const TITLE = "Notifications";

export const Route = createFileRoute("/admin/notifications")({
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

const NOTES = [
  { level: "Critical", title: "Open bill dispute", body: "A diner disputed bill #47955 at SkyBar 25.", src: "Support", at: "5 min ago" },
  { level: "High", title: "Payment failed", body: "Mobile Money timeout on bill #48090 (Bistro 22).", src: "Payments", at: "16 min ago" },
  { level: "High", title: "POS offline", body: "SkyBar 25 manual menu bridge is offline.", src: "POS", at: "1 hr ago" },
  { level: "Medium", title: "POS degraded", body: "Bistro 22: Omega reachability degraded.", src: "POS", at: "1 hr ago" },
  { level: "Medium", title: "Menu needs review", body: "Bistro 22 menu is stale — last sync 1 hr ago.", src: "Menus", at: "1 hr ago" },
];

function Page() {
  const { toast, show } = useToast();
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Notifications</h2><p>Live operational signals derived from POS health, payments and support. Prototype.</p></div>
        <button className="outline-button" onClick={() => show("Marked all as read (prototype)")}>Mark all read</button>
      </section>

      <div className="member-kpis">
        <div><span>Critical</span><b>1</b><small>needs action</small></div>
        <div><span>High</span><b>2</b></div>
        <div><span>Medium</span><b>2</b></div>
        <div><span>Resolved today</span><b>7</b><small className="green">cleared</small></div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="alert-list">
          {NOTES.map((n, i) => (
            <a key={i} href="#" onClick={(e) => { e.preventDefault(); show(`Opened: ${n.title} (prototype)`); }}>
              <span className="alert-icon">!</span>
              <span>
                <b>{n.title}</b>
                <small>{n.body} · {n.src}</small>
              </span>
              <span className={"status-badge " + (n.level === "Critical" ? "status-danger" : n.level === "High" ? "status-warning" : "")}>{n.level}</span>
              <span style={{ color: "#77736c", fontSize: 9, marginLeft: 10 }}>{n.at}</span>
            </a>
          ))}
        </div>
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
