import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
const COLS = "1.1fr 1fr 1fr 1fr .8fr 150px";

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
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All restaurants");
  const [wizard, setWizard] = useState(false);
  const [qrRow, setQrRow] = useState<(Row & Qr) | null>(null);
  const [sheet, setSheet] = useState(false);
  const single = useRef<HTMLDivElement>(null);
  useEscape(() => { setWizard(false); setQrRow(null); setSheet(false); });

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

  const all = data ?? [];
  const restaurants = Array.from(new Set(all.map((r) => r.restaurant_name).filter(Boolean))) as string[];
  const rows = all.filter((r) => (filter === "All restaurants" || r.restaurant_name === filter) && `${r.label} ${r.restaurant_name ?? ""} ${r.device_label ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const online = all.filter((r) => r.bridge_status === "online").length;
  const paired = all.filter((r) => r.device_label).length;

  const sheetRows = rows.map((r) => ({ ...r, qr: qrMap.get(r.table_id) })).filter((r) => r.qr?.qr_url);

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
      <Toast text={toast} />
    </AdminLayout>
  );
}
