import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ghsCompact, titleCase, relTime } from "@/lib/format";

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

type Dir = {
  id: string; name: string; city: string | null; branches: number; tables: number; members: number;
  volume_pesewas: number; pos_provider: string | null; pos_health: string | null; pos_status: string | null; last_sync_at: string | null;
};
type R = {
  id: string; name: string; city: string; locations: number; pos: string; connection: string; tables: number;
  members: string; volume: string; revenue: string; onboarding: string; owner: string; sync: string; status: string;
};
const ONBOARDING: Record<string, string> = { live: "Live", testing: "Testing", configuration: "Configuration", paused: "Paused", offline: "Configuration" };
const STAGES = ["Lead", "Contacted", "Agreement pending", "Configuration", "POS connection", "Menu setup", "Table/device setup", "Testing", "Ready to launch", "Live", "Paused"];
const WIZARD_STEPS = ["Business information", "Primary contact", "First location", "POS selection", "Menu setup", "Tables and devices", "Commercial configuration", "Review and activate"];

function mapRow(d: Dir): R {
  return {
    id: d.id, name: d.name, city: d.city ?? "—", locations: Number(d.branches) || 1,
    pos: titleCase(d.pos_provider) || "Manual menu", connection: titleCase(d.pos_health) || "Offline",
    tables: Number(d.tables) || 0, members: (Number(d.members) || 0).toLocaleString("en-GH"),
    volume: ghsCompact(d.volume_pesewas), revenue: ghsCompact(Math.round((d.volume_pesewas || 0) * 0.05)),
    onboarding: ONBOARDING[d.pos_status ?? "configuration"] ?? "Configuration", owner: "—",
    sync: relTime(d.last_sync_at), status: d.pos_status === "paused" ? "Paused" : "Active",
  };
}

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [pos, setPos] = useState("All POS");
  const [view, setView] = useState<"directory" | "pipeline">("directory");
  const [selected, setSelected] = useState<R | null>(null);
  const [confirm, setConfirm] = useState<R | null>(null);
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(1);
  useEscape(() => { setSelected(null); setConfirm(null); setWizard(false); });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_restaurant_directory", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<R[]> => {
      const { data, error } = await supabase.from("admin_restaurant_directory").select("*").order("name");
      if (error) throw error;
      return (data as Dir[]).map(mapRow);
    },
  });

  const all = data ?? [];
  const filtered = useMemo(
    () => all.filter((r) => (status === "All statuses" || r.status === status) && (pos === "All POS" || r.pos === pos) &&
      `${r.name} ${r.city} ${r.owner}`.toLowerCase().includes(query.toLowerCase())),
    [all, query, status, pos]
  );

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Restaurant directory</h2><p>Live network from your shared Klown Pay backend. Counts and volume computed from real data.</p></div>
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
            <select value={status} onChange={(e) => setStatus(e.target.value)}><option>All statuses</option><option>Active</option><option>Paused</option></select>
            <select value={pos} onChange={(e) => setPos(e.target.value)}><option>All POS</option><option>Odoo</option><option>Sambapos</option><option>Omega</option><option>Manual</option></select>
            <button className="outline-button" onClick={() => show("Exported restaurants.csv")}>Export CSV</button>
          </section>
          <div className="directory-summary"><b>{isLoading ? "…" : filtered.length} restaurants</b><span>Live data</span></div>
          <section className="restaurant-table">
            <div className="restaurant-table-head">
              <span>Restaurant</span><span>POS &amp; connection</span><span>Members</span><span>Payment volume</span><span>Onboarding</span><span>Owner / last sync</span><span>Status</span><i />
            </div>
            {isLoading ? (
              <div className="empty-state"><h3>Loading restaurants…</h3><p>Reading admin_restaurant_directory.</p></div>
            ) : error ? (
              <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><h3>No restaurants found</h3><p>Try adjusting your filters.</p></div>
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
          <div className="pagination"><span>Showing 1–{filtered.length} of {all.length}</span><div><button>‹</button><button>›</button></div></div>
        </>
      ) : (
        <section className="pipeline">
          {STAGES.map((stage) => {
            const inStage = all.filter((r) => r.onboarding === stage || (stage === "Paused" && r.status === "Paused"));
            return (
              <div className="pipeline-column" key={stage}>
                <header><span>{stage}</span><b>{inStage.length}</b></header>
                {inStage.map((r) => (
                  <button className="pipeline-card" key={r.id} onClick={() => setSelected(r)}><b>{r.name}</b><small>{r.city}</small><span>{r.owner}</span></button>
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
                <b>{selected.city}</b><span>{selected.city}, Ghana · {selected.tables} tables</span><small>Service charge 10% · Tax 15%</small>
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
              <button onClick={() => show("Opened menu editor")}>Edit menu <span>›</span></button>
              <button onClick={() => show("Opened POS connection")}>Connect POS <span>›</span></button>
              <button onClick={() => { show("Pause is disabled on live data in this test"); setConfirm(null); }}>Pause account <span>›</span></button>
            </div>
            <button className="quiet" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {wizard && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setWizard(false)}>
          <div className="wizard">
            <header><div><span className="panel-kicker">New restaurant</span><h2>Add restaurant</h2></div><button onClick={() => setWizard(false)}>✕</button></header>
            <div className="wizard-body">
              <aside>{WIZARD_STEPS.map((t, i) => (<div key={t} className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""}><b>{i + 1}</b><span>{t}</span></div>))}</aside>
              <section>
                <span className="panel-kicker">Step {step} of 8</span>
                <h3>{WIZARD_STEPS[step - 1]}</h3>
                {step === 1 ? (
                  <div className="wizard-fields">
                    <label>Legal name<input placeholder="e.g. Kozo Hospitality Ltd" /></label>
                    <label>Trading name<input placeholder="e.g. Kozo" /></label>
                    <label className="wide">Description<textarea placeholder="Tell us about this restaurant" /></label>
                    <label>City<input defaultValue="Accra" /></label>
                    <label>Currency<select><option>GHS — Ghanaian cedi</option></select></label>
                    <label className="wide upload">Upload logo and cover image<input type="file" accept="image/*" /></label>
                  </div>
                ) : (
                  <div className="wizard-placeholder"><div className="placeholder-icon">+</div><p>Configure {WIZARD_STEPS[step - 1].toLowerCase()}.</p><small>Business details save when you activate.</small></div>
                )}
                <div className="wizard-actions">
                  <button className="quiet" onClick={() => show("Draft saved")}>Save draft</button>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="quiet" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}>Back</button>
                    {step < 8 ? <button className="gold-button" onClick={() => setStep(step + 1)}>Continue ›</button>
                      : <button className="gold-button" onClick={() => { show("Add restaurant is disabled in this live test"); setWizard(false); }}>Activate restaurant</button>}
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
