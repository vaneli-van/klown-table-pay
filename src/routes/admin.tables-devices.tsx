import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { titleCase, relTime } from "@/lib/format";

const TITLE = "Tables & Devices";
export const Route = createFileRoute("/admin/tables-devices")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type Row = { table_id: string; label: string; restaurant_name: string | null; device_label: string | null; bridge_status: string | null; last_heartbeat_at: string | null };
const COLS = "1.2fr 1fr 1.2fr 1fr .9fr 110px";

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All restaurants");
  const [wizard, setWizard] = useState(false);
  useEscape(() => setWizard(false));

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_table_devices", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("admin_table_devices").select("*").order("restaurant_name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const all = data ?? [];
  const restaurants = Array.from(new Set(all.map((r) => r.restaurant_name).filter(Boolean))) as string[];
  const rows = all.filter((r) => (filter === "All restaurants" || r.restaurant_name === filter) && `${r.label} ${r.restaurant_name ?? ""} ${r.device_label ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const online = all.filter((r) => r.bridge_status === "online").length;
  const paired = all.filter((r) => r.device_label).length;

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Tables &amp; devices</h2><p>Live QR tables and their Klown bridge devices.</p></div>
        <button className="gold-button" onClick={() => setWizard(true)}>+ Bulk create tables</button>
      </section>
      <div className="member-kpis">
        <div><span>Tables</span><b>{isLoading ? "…" : all.length}</b><small>across {restaurants.length} restaurant{restaurants.length === 1 ? "" : "s"}</small></div>
        <div><span>Devices paired</span><b>{isLoading ? "…" : paired}</b></div>
        <div><span>Online now</span><b>{isLoading ? "…" : online}</b><small className="green">accepting scans</small></div>
        <div><span>Offline / unpaired</span><b>{isLoading ? "…" : all.length - online}</b></div>
      </div>
      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tables or devices" /></div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All restaurants</option>{restaurants.map((r) => <option key={r}>{r}</option>)}</select>
      </div>
      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 820 }}><span>Table</span><span>Restaurant</span><span>Device</span><span>Bridge status</span><span>Last heartbeat</span><span /></div>
        {isLoading ? <div className="empty-state"><h3>Loading tables…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : rows.length === 0 ? <div className="empty-state"><h3>No tables yet</h3></div>
          : rows.map((r) => (
            <div className="restaurant-table-row" key={r.table_id} style={{ gridTemplateColumns: COLS, minWidth: 820 }}>
              <span><b>{r.label}</b><small>QR + NFC</small></span>
              <span>{r.restaurant_name ?? "—"}</span>
              <span>{r.device_label ?? "—"}</span>
              <span><span className={"status-dot " + (r.bridge_status === "online" ? "online" : "offline")} />{titleCase(r.bridge_status) || "Unpaired"}</span>
              <span>{relTime(r.last_heartbeat_at)}</span>
              <span><button className="outline-button" onClick={() => show(r.device_label ? `Pinged ${r.device_label}` : `Pairing ${r.label}…`)}>{r.device_label ? "Ping" : "Pair"}</button></span>
            </div>
          ))}
      </div>
      {wizard && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setWizard(false)}>
          <div className="confirm-box">
            <button onClick={() => setWizard(false)}>✕</button>
            <span className="panel-kicker">Bulk create</span><h3>Add tables</h3>
            <p>Generate a run of QR tables for a restaurant. Devices pair on first scan.</p>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Restaurant</span></div><select className="wide-input">{restaurants.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>How many</span></div><input className="wide-input" type="number" defaultValue={10} /></label>
            <button className="gold-button" onClick={() => { show("Bulk create is disabled in this live test"); setWizard(false); }}>Create tables</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
