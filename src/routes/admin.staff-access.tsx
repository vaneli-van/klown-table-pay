import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Staff & Access";

export const Route = createFileRoute("/admin/staff-access")({
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

type Staff = { name: string; email: string; role: string; status: "Active" | "Invited" | "Suspended"; seen: string };
const STAFF: Staff[] = [
  { name: "Samuel", email: "samuel@westernpremium.com.gh", role: "Super Admin", status: "Active", seen: "now" },
  { name: "Ama Mensah", email: "ama@klown.com", role: "Operations Admin", status: "Active", seen: "2 hr ago" },
  { name: "Kwesi Boateng", email: "kwesi@klown.com", role: "Finance Admin", status: "Active", seen: "yesterday" },
  { name: "Efua Owusu", email: "efua@klown.com", role: "Read-Only Analyst", status: "Invited", seen: "—" },
];
const CAPS = ["Restaurants", "POS", "Payments", "Refunds", "Members", "Staff", "Settings"];
const MATRIX: Record<string, ("y" | "n")[]> = {
  "Super Admin": ["y", "y", "y", "y", "y", "y", "y"],
  "Operations Admin": ["y", "y", "y", "n", "y", "n", "n"],
  "Finance Admin": ["n", "n", "y", "y", "y", "n", "n"],
  "Read-Only Analyst": ["n", "n", "y", "n", "y", "n", "n"],
};
const COLS = "1.4fr 1.8fr 1.2fr .8fr .8fr";

function Page() {
  const { toast, show } = useToast();
  const [invite, setInvite] = useState(false);
  useEscape(() => setInvite(false));
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Staff &amp; access</h2><p>Who can do what in the console. Role-based, enforced everywhere. Prototype.</p></div>
        <button className="gold-button" onClick={() => setInvite(true)}>+ Invite staff</button>
      </section>

      <div className="restaurant-table" style={{ marginTop: 12 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 780 }}>
          <span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Last sign-in</span>
        </div>
        {STAFF.map((s) => (
          <div className="restaurant-table-row" key={s.email} style={{ gridTemplateColumns: COLS, minWidth: 780 }}>
            <span className="restaurant-name" style={{ cursor: "default" }}><span className="restaurant-logo">{s.name[0]}</span><span><b>{s.name}</b></span></span>
            <span>{s.email}</span>
            <span>{s.role}</span>
            <span><span className={s.status === "Active" ? "status-badge status-success" : s.status === "Invited" ? "status-badge status-warning" : "status-badge status-danger"}>{s.status}</span></span>
            <span>{s.seen}</span>
          </div>
        ))}
      </div>

      <div className="panel capability-panel" style={{ marginTop: 12 }}>
        <div className="panel-heading"><div><span className="panel-kicker">Permission matrix</span><h2>Role capabilities</h2></div></div>
        <div className="capability-table">
          <div className="capability-row capability-head" style={{ gridTemplateColumns: "1.4fr repeat(7,1fr)" }}>
            <span>Role</span>{CAPS.map((c) => <span key={c}>{c}</span>)}
          </div>
          {Object.entries(MATRIX).map(([role, row]) => (
            <div className="capability-row" key={role} style={{ gridTemplateColumns: "1.4fr repeat(7,1fr)" }}>
              <span><b style={{ fontWeight: 400 }}>{role}</b></span>
              {row.map((v, i) => <span key={i}>{v === "y" ? <span className="cap-yes">●</span> : <span className="cap-no">○</span>}</span>)}
            </div>
          ))}
        </div>
      </div>

      {invite && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setInvite(false)}>
          <div className="confirm-box">
            <button onClick={() => setInvite(false)}>✕</button>
            <span className="panel-kicker">Invite</span>
            <h3>Invite staff</h3>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Name</span></div><input className="wide-input" placeholder="Full name" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Email</span></div><input className="wide-input" placeholder="name@klown.com" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Role</span></div><select className="wide-input"><option>Operations Admin</option><option>Finance Admin</option><option>Read-Only Analyst</option><option>Super Admin</option></select></label>
            <button className="gold-button" onClick={() => { show("Invitation sent (prototype)"); setInvite(false); }}>Send invite</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
