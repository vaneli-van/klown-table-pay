import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Restaurants";

export const Route = createFileRoute("/admin/restaurants")({
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

type R = {
  id: string; name: string; city: string; locations: number; pos: string; connection: "Healthy" | "Issue" | "Offline";
  tables: number; members: string; volume: string; revenue: string; onboarding: string; owner: string; sync: string; status: "Active" | "Paused";
};
const RESTAURANTS: R[] = [
  { id: "kozo", name: "Kozo", city: "Accra", locations: 1, pos: "Odoo", connection: "Healthy", tables: 12, members: "1,240", volume: "GH₵ 82.4k", revenue: "GH₵ 4.1k", onboarding: "Live", owner: "Ama Mensah", sync: "2 min ago", status: "Active" },
  { id: "aya", name: "AYA", city: "Accra", locations: 1, pos: "SambaPOS", connection: "Healthy", tables: 8, members: "860", volume: "GH₵ 51.2k", revenue: "GH₵ 2.6k", onboarding: "Live", owner: "Kwesi Boateng", sync: "11 min ago", status: "Active" },
  { id: "bistro22", name: "Bistro 22", city: "Accra", locations: 1, pos: "Omega", connection: "Issue", tables: 6, members: "410", volume: "GH₵ 22.8k", revenue: "GH₵ 1.1k", onboarding: "Testing", owner: "Efua Owusu", sync: "1 hr ago", status: "Active" },
  { id: "skybar25", name: "SkyBar 25", city: "Accra", locations: 1, pos: "Manual menu", connection: "Offline", tables: 10, members: "295", volume: "GH₵ 12.1k", revenue: "GH₵ 0.6k", onboarding: "Configuration", owner: "Yaw Darko", sync: "—", status: "Paused" },
  { id: "saintpablo", name: "Saint Pablo", city: "Accra", locations: 1, pos: "Odoo", connection: "Healthy", tables: 9, members: "520", volume: "GH₵ 33.5k", revenue: "GH₵ 1.7k", onboarding: "Ready to launch", owner: "Adjoa Nyarko", sync: "25 min ago", status: "Active" },
];
const STAGES = ["Lead", "Contacted", "Agreement pending", "Configuration", "POS connection", "Menu setup", "Table/device setup", "Testing", "Ready to launch", "Live", "Paused"];
const WIZARD_STEPS = ["Business information", "Primary contact", "First location", "POS selection", "Menu setup", "Tables and devices", "Commercial configuration", "Review and activate"];

function Page() {
  const { toast, show } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [pos, setPos] = useState("All POS");
  const [view, setView] = useState<"directory" | "pipeline">("directory");
  const [selected, setSelected] = useState<R | null>(null);
  const [confirm, setConfirm] = useState<R | null>(null);
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(1);
  useEscape(() => { setSelected(null); setConfirm(null); setWizard(false); });

  const filtered = useMemo(
    () => RESTAURANTS.filter(
      (r) => (status === "All statuses" || r.status === status) && (pos === "All POS" || r.pos === pos) &&
        `${r.name} ${r.city} ${r.owner}`.toLowerCase().includes(query.toLowerCase())
    ),
    [query, status, pos]
  );

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Restaurant directory</h2><p>Manage your network, onboarding pipeline and location operations. Prototype.</p></div>
        <div className="ops-top-actions">
          <div className="view-switch">
            <button className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}>Directory</button>
            <button className={view === "pipeline" ? "active" : ""} onClick={() => setView("pipeline")}>Onboarding pipeline</button>
          </div>
          <button className="gold-button" onClick={() => { setWizard(true); setStep(1); }}>+ Add restaurant</button>
        </div>
      </section>

      {view === "directory" ? (
        <>
          <section className="directory-toolbar">
            <label className="search-field"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search restaurants, owners or locations" /></label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}><option>All statuses</option><option>Active</option><option>Paused</option><option>Archived</option></select>
            <select value={pos} onChange={(e) => setPos(e.target.value)}><option>All POS</option><option>Odoo</option><option>SambaPOS</option><option>Omega</option><option>Manual menu</option></select>
            <button className="outline-button" onClick={() => show("Exported restaurants.csv (prototype)")}>Export CSV</button>
          </section>
          <div className="directory-summary"><b>{filtered.length} restaurants</b><span>Prototype data</span></div>
          <section className="restaurant-table">
            <div className="restaurant-table-head">
              <span>Restaurant</span><span>POS &amp; connection</span><span>Members</span><span>Payment volume</span><span>Onboarding</span><span>Owner / last sync</span><span>Status</span><i />
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state"><h3>No restaurants found</h3><p>Try adjusting your filters or search terms.</p></div>
            ) : filtered.map((r) => (
              <div className="restaurant-table-row" key={r.id}>
                <button className="restaurant-name" onClick={() => setSelected(r)}>
                  <span className="restaurant-logo">{r.name[0]}</span>
                  <span><b>{r.name}</b><small>{r.city} · {r.locations} location · {r.tables} tables</small></span>
                </button>
                <span><b>{r.pos}</b><small className={r.connection === "Healthy" ? "healthy" : r.connection === "Issue" ? "issue" : "offline"}>● {r.connection}</small></span>
                <span>{r.members}</span>
                <span><b>{r.volume}</b><small>{r.revenue} Klown revenue</small></span>
                <span><span className={r.onboarding === "Live" ? "status-pill live" : "status-pill"}>{r.onboarding}</span></span>
                <span><b>{r.owner}</b><small>{r.sync}</small></span>
                <span><span className={r.status === "Active" ? "status-pill live" : "status-pill"}>{r.status}</span></span>
                <button className="row-menu" onClick={() => setConfirm(r)} aria-label={`Actions for ${r.name}`}>⌄</button>
              </div>
            ))}
          </section>
          <div className="pagination"><span>Showing 1–{filtered.length} of {RESTAURANTS.length}</span><div><button>‹</button><button>›</button></div></div>
        </>
      ) : (
        <section className="pipeline">
          {STAGES.map((stage) => {
            const inStage = RESTAURANTS.filter((r) => r.onboarding === stage || (stage === "Paused" && r.status === "Paused"));
            return (
              <div className="pipeline-column" key={stage}>
                <header><span>{stage}</span><b>{inStage.length}</b></header>
                {inStage.map((r) => (
                  <button className="pipeline-card" key={r.id} onClick={() => setSelected(r)}>
                    <b>{r.name}</b><small>{r.city}</small><span>{r.owner}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {selected && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="detail-drawer">
            <header>
              <div className="detail-title">
                <span className="restaurant-logo large">{selected.name[0]}</span>
                <div><span className="panel-kicker">Restaurant profile</span><h2>{selected.name}</h2><span className="status-pill live">{selected.status}</span></div>
              </div>
              <button onClick={() => setSelected(null)}>✕</button>
            </header>
            <div className="detail-tabs">
              {["Overview", "Locations", "POS", "Menu", "Bills & Payments", "Members", "Support", "Activity"].map((t, i) => (
                <button key={t} className={i === 0 ? "active" : ""}>{t}</button>
              ))}
            </div>
            <section className="detail-content">
              <span className="panel-kicker">Overview</span>
              <h3>Today at {selected.name}</h3>
              <div className="detail-metrics">
                <div><small>Payment volume</small><b>{selected.volume}</b></div>
                <div><small>Active members</small><b>{selected.members}</b></div>
                <div><small>POS health</small><b>{selected.connection}</b></div>
              </div>
              <div className="location-card" style={{ marginTop: 20 }}>
                <b>{selected.city}</b>
                <span>{selected.city}, Ghana · {selected.tables} tables</span>
                <small>Service charge 10% · Tax 15%</small>
              </div>
            </section>
          </div>
        </div>
      )}

      {confirm && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="confirm-box">
            <button onClick={() => setConfirm(null)}>✕</button>
            <span className="panel-kicker">Restaurant action</span>
            <h3>Manage {confirm.name}</h3>
            <div className="action-list">
              <button onClick={() => { setSelected(confirm); setConfirm(null); }}>View restaurant <span>›</span></button>
              <button onClick={() => show("Opened menu editor (prototype)")}>Edit menu <span>›</span></button>
              <button onClick={() => show("Opened POS connection (prototype)")}>Connect POS <span>›</span></button>
              <button onClick={() => { show(`${confirm.name} paused (prototype)`); setConfirm(null); }}>Pause account <span>›</span></button>
            </div>
            <button className="quiet" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {wizard && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setWizard(false)}>
          <div className="wizard">
            <header>
              <div><span className="panel-kicker">New restaurant</span><h2>Add restaurant</h2></div>
              <button onClick={() => setWizard(false)}>✕</button>
            </header>
            <div className="wizard-body">
              <aside>
                {WIZARD_STEPS.map((t, i) => (
                  <div key={t} className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""}><b>{i + 1}</b><span>{t}</span></div>
                ))}
              </aside>
              <section>
                <span className="panel-kicker">Step {step} of 8</span>
                <h3>{WIZARD_STEPS[step - 1]}</h3>
                {step === 1 ? (
                  <div className="wizard-fields">
                    <label>Legal name<input placeholder="e.g. Kozo Hospitality Ltd" /></label>
                    <label>Trading name<input placeholder="e.g. Kozo" /></label>
                    <label className="wide">Description<textarea placeholder="Tell us about this restaurant" /></label>
                    <label>City<input defaultValue="Accra" /></label>
                    <label>Currency<select><option>GHS — Ghanaian cedi</option><option>NGN — Nigerian naira</option></select></label>
                    <label className="wide upload">Upload logo and cover image<input type="file" accept="image/*" /></label>
                  </div>
                ) : (
                  <div className="wizard-placeholder">
                    <div className="placeholder-icon">+</div>
                    <p>Configure {WIZARD_STEPS[step - 1].toLowerCase()} for this restaurant.</p>
                    <small>Business details are saved when you activate; further steps open in each section.</small>
                  </div>
                )}
                <div className="wizard-actions">
                  <button className="quiet" onClick={() => show("Draft saved (prototype)")}>Save draft</button>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="quiet" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}>Back</button>
                    {step < 8 ? (
                      <button className="gold-button" onClick={() => setStep(step + 1)}>Continue ›</button>
                    ) : (
                      <button className="gold-button" onClick={() => { show("Restaurant activated (prototype)"); setWizard(false); }}>Activate restaurant</button>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
