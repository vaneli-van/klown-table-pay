import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
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
type Qr = { table_id: string; table_label: string; restaurant_name: string; branch_name: string; token: string | null; qr_url: string | null };
type Reg = { register_id: string; register_name: string; odoo_pos_config_id: number | null; active: boolean; restaurant_id: string; restaurant_name: string | null; branch_id: string; branch_name: string | null; token: string | null; qr_url: string | null };
const COLS = "1.1fr 1fr 1fr 1fr .8fr 150px";
const REG_COLS = "1.1fr 1fr 1fr .8fr 150px";

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

// Serialize a rendered <svg> and hand the browser a downloadable file.
function svgOf(container: HTMLElement | null): SVGSVGElement | null { return container ? container.querySelector("svg") : null; }
function download(url: string, filename: string) {
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function downloadSVG(container: HTMLElement | null, filename: string) {
  const svg = svgOf(container); if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  download("data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml), filename + ".svg");
}
function downloadPNG(container: HTMLElement | null, filename: string, size = 720) {
  const svg = svgOf(container); if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = size; c.height = size;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    c.toBlob((b) => { if (b) download(URL.createObjectURL(b), filename + ".png"); });
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All restaurants");
  const [wizard, setWizard] = useState(false);
  const [qrRow, setQrRow] = useState<(Row & Qr) | null>(null);
  const [sheet, setSheet] = useState(false);
  const [regRow, setRegRow] = useState<Reg | null>(null);
  const [regWizard, setRegWizard] = useState(false);
  const [rf, setRf] = useState({ restaurant_id: "", branch_id: "", name: "", config: "" });
  const [rfBusy, setRfBusy] = useState(false);
  const single = useRef<HTMLDivElement>(null);
  const regSingle = useRef<HTMLDivElement>(null);
  useEscape(() => { setWizard(false); setQrRow(null); setSheet(false); setRegWizard(false); setRegRow(null); });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_table_devices", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("admin_table_devices").select("*").order("restaurant_name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { data: qrData } = useQuery({
    queryKey: ["admin_table_qr", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<Qr[]> => {
      const { data, error } = await supabase.from("admin_table_qr").select("*");
      if (error) throw error;
      return (data ?? []) as Qr[];
    },
  });
  const qrMap = useMemo(() => {
    const m = new Map<string, Qr>();
    (qrData ?? []).forEach((x) => m.set(x.table_id, x));
    return m;
  }, [qrData]);

  const { data: regData } = useQuery({
    queryKey: ["admin_registers", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<Reg[]> => {
      const { data, error } = await supabase.from("admin_registers").select("*").order("restaurant_name");
      if (error) throw error;
      return (data ?? []) as Reg[];
    },
  });
  const { data: restList } = useQuery({
    queryKey: ["admin_reg_restaurants", staff?.id], enabled: !!staff,
    queryFn: async () => { const { data, error } = await supabase.from("restaurants").select("id,name").order("name"); if (error) throw error; return (data ?? []) as { id: string; name: string }[]; },
  });
  const { data: branchList } = useQuery({
    queryKey: ["admin_reg_branches", staff?.id], enabled: !!staff,
    queryFn: async () => { const { data, error } = await supabase.from("branches").select("id,name,restaurant_id").order("name"); if (error) throw error; return (data ?? []) as { id: string; name: string; restaurant_id: string }[]; },
  });

  const all = data ?? [];
  const restaurants = Array.from(new Set([...all.map((r) => r.restaurant_name), ...((regData ?? []).map((r) => r.restaurant_name))].filter(Boolean))) as string[];
  const rows = all.filter((r) => (filter === "All restaurants" || r.restaurant_name === filter) && `${r.label} ${r.restaurant_name ?? ""} ${r.device_label ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const online = all.filter((r) => r.bridge_status === "online").length;
  const paired = all.filter((r) => r.device_label).length;

  const sheetRows = rows.map((r) => ({ ...r, qr: qrMap.get(r.table_id) })).filter((r) => r.qr?.qr_url);
  const regs = (regData ?? []).filter((r) => (filter === "All restaurants" || r.restaurant_name === filter) && `${r.register_name} ${r.restaurant_name ?? ""} ${r.branch_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Tables &amp; devices</h2><p>Live QR tables and their Klown bridge devices. Each table has a unique QR that opens its menu &amp; pay screen.</p></div>
        <div className="ops-top-actions">
          <button className="outline-button" onClick={() => setSheet(true)} disabled={sheetRows.length === 0}>Print QR sheet</button>
          <button className="gold-button" onClick={() => setWizard(true)}>+ Bulk create tables</button>
        </div>
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
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 860 }}><span>Table</span><span>Restaurant</span><span>Device</span><span>Bridge status</span><span>Last heartbeat</span><span /></div>
        {isLoading ? <div className="empty-state"><h3>Loading tables…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : rows.length === 0 ? <div className="empty-state"><h3>No tables yet</h3></div>
          : rows.map((r) => {
            const qr = qrMap.get(r.table_id);
            return (
            <div className="restaurant-table-row" key={r.table_id} style={{ gridTemplateColumns: COLS, minWidth: 860 }}>
              <span><b>{r.label}</b><small>QR + NFC</small></span>
              <span>{r.restaurant_name ?? "—"}</span>
              <span>{r.device_label ?? "—"}</span>
              <span><span className={"status-dot " + (r.bridge_status === "online" ? "online" : "offline")} />{titleCase(r.bridge_status) || "Unpaired"}</span>
              <span>{relTime(r.last_heartbeat_at)}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button className="gold-button" style={{ padding: "8px 12px" }} disabled={!qr?.qr_url} onClick={() => qr && setQrRow({ ...r, ...qr })}>QR code</button>
                <button className="outline-button" style={{ padding: "8px 10px" }} onClick={() => show(r.device_label ? `Pinged ${r.device_label}` : `Pairing ${r.label}…`)}>{r.device_label ? "Ping" : "Pair"}</button>
              </span>
            </div>
          );})}
      </div>

      <section className="ops-intro" style={{ marginTop: 28 }}>
        <div><h2>Counters</h2><p>Over-the-counter registers. Each has one QR/NFC that opens the pay screen for the order the cashier sends to Klown. No table needed.</p></div>
        <div className="ops-top-actions">
          <button className="gold-button" onClick={() => setRegWizard(true)}>+ Add counter register</button>
        </div>
      </section>
      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: REG_COLS, minWidth: 820 }}><span>Register</span><span>Restaurant</span><span>Branch</span><span>Odoo POS</span><span /></div>
        {regs.length === 0 ? <div className="empty-state"><h3>No counter registers</h3><p>Add one for a counter-service restaurant.</p></div>
          : regs.map((r) => (
          <div className="restaurant-table-row" key={r.register_id} style={{ gridTemplateColumns: REG_COLS, minWidth: 820 }}>
            <span><b>{r.register_name}</b><small>QR + NFC</small></span>
            <span>{r.restaurant_name ?? "—"}</span>
            <span>{r.branch_name ?? "—"}</span>
            <span>{r.odoo_pos_config_id ?? "—"}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button className="gold-button" style={{ padding: "8px 12px" }} disabled={!r.qr_url} onClick={() => setRegRow(r)}>QR code</button>
            </span>
          </div>
        ))}
      </div>

      {qrRow && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setQrRow(null)}>
          <div className="confirm-box qr-modal">
            <button onClick={() => setQrRow(null)}>✕</button>
            <span className="panel-kicker">{qrRow.restaurant_name} · {qrRow.branch_name}</span>
            <h3>Table {qrRow.label}</h3>
            <p>Scan to open this table's menu &amp; pay screen. Unique to this table.</p>
            <div className="qr-frame" ref={single}>
              <QRCodeSVG value={qrRow.qr_url!} size={220} level="M" marginSize={2} bgColor="#ffffff" fgColor="#171717" />
            </div>
            <code className="qr-url">{qrRow.qr_url}</code>
            <div className="qr-actions">
              <button className="gold-button" onClick={() => downloadPNG(single.current, `klown-qr-${slug(qrRow.restaurant_name)}-table-${slug(qrRow.label)}`)}>Download PNG</button>
              <button className="outline-button" onClick={() => downloadSVG(single.current, `klown-qr-${slug(qrRow.restaurant_name)}-table-${slug(qrRow.label)}`)}>Download SVG</button>
              <button className="outline-button" onClick={() => { navigator.clipboard?.writeText(qrRow.qr_url!); show("Link copied"); }}>Copy link</button>
            </div>
          </div>
        </div>
      )}

      {regRow && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setRegRow(null)}>
          <div className="confirm-box qr-modal">
            <button onClick={() => setRegRow(null)}>✕</button>
            <span className="panel-kicker">{regRow.restaurant_name} · {regRow.branch_name}</span>
            <h3>{regRow.register_name}</h3>
            <p>Tap or scan to pay the order the cashier sends to Klown at this counter.</p>
            <div className="qr-frame" ref={regSingle}>
              <QRCodeSVG value={regRow.qr_url!} size={220} level="M" marginSize={2} bgColor="#ffffff" fgColor="#171717" />
            </div>
            <code className="qr-url">{regRow.qr_url}</code>
            <div className="qr-actions">
              <button className="gold-button" onClick={() => downloadPNG(regSingle.current, `klown-qr-${slug(regRow.restaurant_name ?? "")}-${slug(regRow.register_name)}`)}>Download PNG</button>
              <button className="outline-button" onClick={() => downloadSVG(regSingle.current, `klown-qr-${slug(regRow.restaurant_name ?? "")}-${slug(regRow.register_name)}`)}>Download SVG</button>
              <button className="outline-button" onClick={() => { navigator.clipboard?.writeText(regRow.qr_url!); show("Link copied"); }}>Copy link</button>
            </div>
          </div>
        </div>
      )}

      {sheet && (
        <div className="qr-print-overlay" onClick={(e) => e.target === e.currentTarget && setSheet(false)}>
          <div className="qr-print-panel">
            <div className="qr-print-bar">
              <div><span className="panel-kicker">{filter === "All restaurants" ? "All restaurants" : filter}</span><h3>{sheetRows.length} table QR codes</h3></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="gold-button" onClick={() => window.print()}>Print</button>
                <button className="outline-button" onClick={() => setSheet(false)}>Close</button>
              </div>
            </div>
            <div className="qr-grid">
              {sheetRows.map((r) => (
                <div className="qr-card" key={r.table_id}>
                  <QRCodeSVG value={r.qr!.qr_url!} size={150} level="M" marginSize={2} bgColor="#ffffff" fgColor="#171717" />
                  <b>Table {r.label}</b>
                  <small>{r.restaurant_name}{r.qr?.branch_name ? ` · ${r.qr.branch_name}` : ""}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
      {regWizard && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setRegWizard(false)}>
          <div className="confirm-box">
            <button onClick={() => setRegWizard(false)}>✕</button>
            <span className="panel-kicker">Counter setup</span><h3>Add counter register</h3>
            <p>Create a register (one per counter till) and its QR/NFC. Match the Odoo POS config id for that till.</p>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Restaurant</span></div>
              <select className="wide-input" value={rf.restaurant_id} onChange={(e) => setRf({ ...rf, restaurant_id: e.target.value, branch_id: "" })}><option value="">Select…</option>{(restList ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Branch</span></div>
              <select className="wide-input" value={rf.branch_id} onChange={(e) => setRf({ ...rf, branch_id: e.target.value })} disabled={!rf.restaurant_id}><option value="">Select…</option>{(branchList ?? []).filter((b) => b.restaurant_id === rf.restaurant_id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Register name</span></div><input className="wide-input" value={rf.name} onChange={(e) => setRf({ ...rf, name: e.target.value })} placeholder="e.g. Front counter" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Odoo POS config id</span></div><input className="wide-input" type="number" value={rf.config} onChange={(e) => setRf({ ...rf, config: e.target.value })} placeholder="e.g. 7" /></label>
            <button className="gold-button" disabled={rfBusy || !rf.restaurant_id || !rf.branch_id || !rf.name.trim() || !rf.config} onClick={async () => {
              setRfBusy(true);
              const { error } = await supabase.rpc("create_pos_register", { p_restaurant_id: rf.restaurant_id, p_branch_id: rf.branch_id, p_name: rf.name.trim(), p_odoo_pos_config_id: Number(rf.config) });
              setRfBusy(false);
              if (error) { show(error.message); return; }
              show("Counter register created");
              setRegWizard(false); setRf({ restaurant_id: "", branch_id: "", name: "", config: "" });
              qc.invalidateQueries({ queryKey: ["admin_registers"] });
            }}>{rfBusy ? "Creating…" : "Create register"}</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
