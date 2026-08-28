import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Tables & Devices";

export const Route = createFileRoute("/admin/tables-devices")({
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

type Row = { id: string; label: string; rest: string; device: string; status: "Online" | "Offline" | "Unpaired"; beat: string };
const ROWS: Row[] = [
  { id: "1", label: "Table 3", rest: "Kozo", device: "Klown Bridge A1", status: "Online", beat: "just now" },
  { id: "2", label: "Table 7", rest: "Kozo", device: "Klown Bridge A2", status: "Online", beat: "12s ago" },
  { id: "3", label: "Table 12", rest: "Kozo", device: "Klown Bridge A5", status: "Offline", beat: "2 hr ago" },
  { id: "4", label: "Table 2", rest: "AYA", device: "Klown Bridge B1", status: "Online", beat: "30s ago" },
  { id: "5", label: "Table 5", rest: "AYA", device: "—", status: "Unpaired", beat: "—" },
  { id: "6", label: "Table 1", rest: "Saint Pablo", device: "Klown Bridge C1", status: "Online", beat: "1m ago" },
  { id: "7", label: "Table 4", rest: "Bistro 22", device: "Klown Bridge D2", status: "Offline", beat: "5 hr ago" },
  { id: "8", label: "Table 9", rest: "SkyBar 25", device: "—", status: "Unpaired", beat: "—" },
];
const COLS = "1.2fr 1fr 1.2fr 1fr .9fr 110px";

function Page() {
  const { toast, show } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All restaurants");
  const [wizard, setWizard] = useState(false);
  useEscape(() => setWizard(false));
  const rows = ROWS.filter((r) => (filter === "All restaurants" || r.rest === filter) && `${r.label} ${r.rest} ${r.device}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Tables &amp; devices</h2><p>QR tables and the Klown bridge devices that pair to them. Prototype.</p></div>
        <button className="gold-button" onClick={() => setWizard(true)}>+ Bulk create tables</button>
      </section>

      <div className="member-kpis">
        <div><span>Tables</span><b>45</b><small>across 5 restaurants</small></div>
        <div><span>Devices paired</span><b>38</b><small className="green">bridge online</small></div>
        <div><span>Online now</span><b>31</b><small className="green">accepting scans</small></div>
        <div><span>Offline / unpaired</span><b>7</b></div>
      </div>

      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tables or devices" /></div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>All restaurants</option><option>Kozo</option><option>AYA</option><option>Saint Pablo</option><option>Bistro 22</option><option>SkyBar 25</option>
        </select>
      </div>

      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 820 }}>
          <span>Table</span><span>Restaurant</span><span>Device</span><span>Bridge status</span><span>Last heartbeat</span><span />
        </div>
        {rows.map((r) => (
          <div className="restaurant-table-row" key={r.id} style={{ gridTemplateColumns: COLS, minWidth: 820 }}>
            <span><b>{r.label}</b><small>QR + NFC</small></span>
            <span>{r.rest}</span>
            <span>{r.device}</span>
            <span>
              <span className={"status-dot " + (r.status === "Online" ? "online" : "offline")} />
              {r.status}
            </span>
            <span>{r.beat}</span>
            <span>
              <button className="outline-button" onClick={() => show(r.status === "Unpaired" ? `Pairing ${r.label}… (prototype)` : `Pinged ${r.device} (prototype)`)}>
                {r.status === "Unpaired" ? "Pair" : "Ping"}
              </button>
            </span>
          </div>
        ))}
      </div>
      <div className="pagination"><span>Showing 1–{rows.length} of {ROWS.length}</span><div><button>‹</button><button>›</button></div></div>

      {wizard && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setWizard(false)}>
          <div className="confirm-box">
            <button onClick={() => setWizard(false)}>✕</button>
            <span className="panel-kicker">Bulk create</span>
            <h3>Add tables</h3>
            <p>Generate a run of QR tables for a restaurant. Devices pair on first scan.</p>
            <label className="wizard-fields" style={{ display: "block" }}>
              <div className="helper-line"><span>Restaurant</span></div>
              <select className="wide-input"><option>Kozo</option><option>AYA</option><option>Saint Pablo</option></select>
            </label>
            <label className="wizard-fields" style={{ display: "block" }}>
              <div className="helper-line"><span>Label prefix</span></div>
              <input className="wide-input" defaultValue="Table" />
            </label>
            <label className="wizard-fields" style={{ display: "block" }}>
              <div className="helper-line"><span>How many</span></div>
              <input className="wide-input" type="number" defaultValue={10} />
            </label>
            <button className="gold-button" onClick={() => { show("Created 10 tables (prototype)"); setWizard(false); }}>Create tables</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
