import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { titleCase, relTime } from "@/lib/format";

const TITLE = "POS Integrations";

export const Route = createFileRoute("/admin/pos-integrations")({
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

type Field = { key: string; label: string; type?: string; placeholder?: string; help?: string };

const PROVIDERS: {
  key: string; name: string; color: string; blurb: string; connections: number; health: "healthy" | "warn"; fields: Field[];
}[] = [
  { key: "odoo", name: "Odoo", color: "#7c4dff", blurb: "JSON-RPC connector. Menu sync + order injection for Odoo 15+.", connections: 2, health: "healthy",
    fields: [
      { key: "url", label: "Odoo URL", placeholder: "https://kozo.odoo.com" },
      { key: "db", label: "Database", placeholder: "kozo-prod" },
      { key: "user", label: "Username", placeholder: "admin@kozo.com" },
      { key: "key", label: "API key", type: "password", placeholder: "••••••••", help: "Stored encrypted, never shown again." },
    ] },
  { key: "sambapos", name: "SambaPOS", color: "#2e7d32", blurb: "Message-server connector for SambaPOS 5 terminals.", connections: 1, health: "healthy",
    fields: [
      { key: "host", label: "Message server", placeholder: "192.168.1.20:9000" },
      { key: "user", label: "Username", placeholder: "klown" },
      { key: "pass", label: "Password", type: "password", placeholder: "••••••••" },
    ] },
  { key: "omega", name: "Omega", color: "#c8a56b", blurb: "REST connector. Company + branch scoped API key.", connections: 1, health: "warn",
    fields: [
      { key: "base", label: "Base URL", placeholder: "https://api.omegapos.com" },
      { key: "key", label: "API key", type: "password", placeholder: "••••••••" },
      { key: "branch", label: "Branch code", placeholder: "ACC-01" },
    ] },
  { key: "bimpos", name: "BIMPOS", color: "#1565c0", blurb: "Outlet-scoped login. Popular across West Africa.", connections: 0, health: "healthy",
    fields: [
      { key: "base", label: "Base URL", placeholder: "https://cloud.bimpos.com" },
      { key: "user", label: "Username", placeholder: "manager" },
      { key: "pass", label: "Password", type: "password", placeholder: "••••••••" },
      { key: "outlet", label: "Outlet ID", placeholder: "OUT-2231" },
    ] },
  { key: "ezee", name: "eZee", color: "#00838f", blurb: "Property code + auth token for eZee Optimus.", connections: 0, health: "healthy",
    fields: [
      { key: "property", label: "Property code", placeholder: "KOZO-ACC" },
      { key: "token", label: "Auth token", type: "password", placeholder: "••••••••" },
    ] },
  { key: "custom", name: "Custom", color: "#455a64", blurb: "Bring your own REST/webhook endpoint.", connections: 0, health: "healthy",
    fields: [
      { key: "base", label: "Base URL", placeholder: "https://pos.mycompany.com/api" },
      { key: "auth", label: "Auth type", placeholder: "Bearer / Basic / API key" },
      { key: "secret", label: "Secret", type: "password", placeholder: "••••••••" },
      { key: "webhook", label: "Webhook URL", placeholder: "https://…/klown/webhook" },
    ] },
];


const CAPS = ["Menu sync", "Orders", "Payments", "Tables", "Modifiers", "Stock", "Webhooks", "Realtime"];
const MATRIX: Record<string, ("y" | "p" | "n")[]> = {
  Odoo: ["y", "y", "p", "y", "y", "y", "y", "p"],
  SambaPOS: ["y", "y", "n", "y", "y", "p", "p", "y"],
  Omega: ["y", "p", "n", "p", "p", "n", "y", "n"],
  BIMPOS: ["y", "p", "n", "y", "p", "p", "n", "n"],
  eZee: ["y", "n", "n", "p", "n", "y", "p", "n"],
  Custom: ["p", "p", "p", "p", "p", "p", "y", "p"],
};

function Page() {
  const { toast, show } = useToast();
  const [connect, setConnect] = useState<(typeof PROVIDERS)[number] | null>(null);
  const [tested, setTested] = useState(false);
  const { staff } = useAuth();
  const { data: conns = [], isLoading: connLoading } = useQuery({
    queryKey: ["admin_pos_directory", staff?.id],
    enabled: !!staff,
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_pos_directory").select("*").order("restaurant_name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const qc = useQueryClient();
  const [odoo, setOdoo] = useState(false);
  const [of, setOf] = useState({ restaurant_id: "", url: "", db: "", user: "admin", key: "" });
  const [saving, setSaving] = useState(false);
  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants_min", staff?.id], enabled: !!staff,
    queryFn: async () => { const { data, error } = await supabase.from("restaurants").select("id,name").order("name"); if (error) throw error; return (data ?? []) as any[]; },
  });
  const { data: odooConfigs = [] } = useQuery({
    queryKey: ["admin_pos_odoo_config", staff?.id], enabled: !!staff,
    queryFn: async () => { const { data, error } = await supabase.from("admin_pos_odoo_config").select("*"); if (error) throw error; return (data ?? []) as any[]; },
  });
  const saveOdoo = async () => {
    if (!of.restaurant_id || !of.url.trim() || !of.db.trim()) { show("Restaurant, URL and database are required"); return; }
    setSaving(true);
    const { error } = await supabase.rpc("save_pos_odoo_credentials", { p_restaurant_id: of.restaurant_id, p_base_url: of.url.trim(), p_db: of.db.trim(), p_username: of.user.trim(), p_api_key: of.key });
    setSaving(false);
    if (error) { show("Save failed: " + error.message); return; }
    show("Odoo connection saved — the sync will pick it up within a minute");
    setOdoo(false); setOf({ restaurant_id: "", url: "", db: "", user: "admin", key: "" });
    qc.invalidateQueries({ queryKey: ["admin_pos_odoo_config"] });
  };
  const [samba, setSamba] = useState(false);
  const [sf, setSf] = useState({ restaurant_id: "" });
  const [newToken, setNewToken] = useState<string | null>(null);
  const [gen, setGen] = useState(false);
  const { data: connectors = [] } = useQuery({
    queryKey: ["admin_pos_connectors", staff?.id], enabled: !!staff,
    queryFn: async () => { const { data, error } = await supabase.from("admin_pos_connectors").select("*"); if (error) throw error; return (data ?? []) as any[]; },
  });
  const genToken = async () => {
    if (!sf.restaurant_id) { show("Pick a restaurant first"); return; }
    setGen(true);
    const { data, error } = await supabase.rpc("create_pos_connector", { p_restaurant_id: sf.restaurant_id, p_name: "SambaPOS connector", p_provider: "sambapos" });
    setGen(false);
    if (error) { show("Failed: " + error.message); return; }
    setNewToken(data as string);
    qc.invalidateQueries({ queryKey: ["admin_pos_connectors"] });
  };
  useEscape(() => { setConnect(null); setTested(false); setOdoo(false); setSamba(false); setNewToken(null); });

  const capDot = (v: "y" | "p" | "n") =>
    v === "y" ? <span className="cap-yes">●</span> : v === "p" ? <span className="cap-partial">◐</span> : <span className="cap-no">○</span>;

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div>
          <h2>Point-of-sale integrations</h2>
          <p>Connect each restaurant's POS so menus, orders and tables stay in sync. Prototype.</p>
        </div>
      </section>

      <div className="pos-kpis">
        <div><span>Connected POS</span><b>{connLoading ? "…" : conns.length}</b><small>across {connLoading ? "…" : new Set(conns.map((c:any)=>c.restaurant_id)).size} restaurants</small></div>
        <div><span>Healthy</span><b>{connLoading ? "…" : conns.filter((c:any)=>c.health==="healthy").length}</b><small className="green">live &amp; syncing</small></div>
        <div><span>Needs attention</span><b>{connLoading ? "…" : conns.filter((c:any)=>c.health && c.health!=="healthy").length}</b></div>
        <div><span>Live connections</span><b>{connLoading ? "…" : conns.filter((c:any)=>c.status==="live").length}</b><small className="green">reading real data</small></div>
      </div>

      <div className="provider-grid">
        {PROVIDERS.map((p) => (
          <div className="pos-provider-card" key={p.key}>
            <div className="provider-card-top">
              <span className="provider-logo" style={{ background: p.color }}>{p.name[0]}</span>
              <span className="status-pill">{p.key === "odoo" ? odooConfigs.length : p.key === "sambapos" ? connectors.length : p.connections} connected</span>
            </div>
            <h3>{p.name}</h3>
            <p>{p.blurb}</p>
            <div className="provider-meta">
              <span><span className={p.health === "warn" ? "health-dot warn" : "health-dot"} />{p.health === "warn" ? "Degraded" : "Operational"}</span>
              <span>{p.connections} live</span>
            </div>
            <div className="provider-card-footer">
              <button className="gold-button" onClick={() => { if (p.key === "odoo") { setOdoo(true); } else if (p.key === "sambapos") { setSamba(true); setNewToken(null); } else { setConnect(p); setTested(false); } }}>{p.key === "odoo" ? "Connect / manage" : "Connect"}</button>
              <button className="outline-button" onClick={() => show(`${p.name} docs (prototype)`)}>Docs</button>
            </div>
          </div>
        ))}
      </div>

      <div className="pos-summary-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Active connections</span><h2>Live POS links</h2></div></div>
          <div className="connection-list">
            {connLoading ? <div className="empty-state"><h3>Loading…</h3></div> : conns.length === 0 ? <div className="empty-state"><h3>No connections yet</h3></div> : conns.map((c: any) => (
              <div key={c.id}>
                <span className="provider-logo mini">{(titleCase(c.provider) || "?")[0]}</span>
                <span><b>{c.restaurant_name} · {titleCase(c.provider)}</b><small>Last sync {relTime(c.last_sync_at)}</small></span>
                <span className={c.health === "healthy" ? "healthy" : c.health === "offline" ? "offline" : "issue"}>● {titleCase(c.health) || "—"}</span>
                <span className={c.status === "live" ? "status-pill live" : "status-pill"}>{titleCase(c.status) || "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Sync jobs</span><h2>Recent activity</h2></div></div>
          <div className="job-list">
            {[
              { t: "2m", r: "Kozo", m: "Menu sync · 307 items", c: "12 updated" },
              { t: "18m", r: "AYA", m: "Order pushed · #A-2231", c: "ok" },
              { t: "1h", r: "Bistro 22", m: "Menu sync failed · timeout", c: "retry" },
              { t: "3h", r: "Saint Pablo", m: "Menu sync · 168 items", c: "3 updated" },
            ].map((j, i) => (
              <div key={i}>
                <span className="job-time">{j.t}</span>
                <span><b>{j.r}</b><small>{j.m}</small></span>
                <span className="sync-count">{j.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel capability-panel" style={{ marginTop: 12 }}>
        <div className="panel-heading"><div><span className="panel-kicker">Connector coverage</span><h2>What each POS supports</h2></div></div>
        <div className="capability-table">
          <div className="capability-row capability-head">
            <span>Provider</span>
            {CAPS.map((c) => <span key={c}>{c}</span>)}
          </div>
          {Object.entries(MATRIX).map(([prov, row]) => (
            <div className="capability-row" key={prov}>
              <span><b style={{ fontWeight: 400 }}>{prov}</b></span>
              {row.map((v, i) => <span key={i}>{capDot(v)}</span>)}
            </div>
          ))}
        </div>
      </div>

      {connect && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setConnect(null)}>
          <div className="detail-drawer">
            <header>
              <div>
                <span className="panel-kicker">Connect POS</span>
                <h2>{connect.name}</h2>
              </div>
              <button onClick={() => setConnect(null)}>✕</button>
            </header>
            <section className="detail-content">
              <div className="provider-selected">
                <span className="provider-logo" style={{ background: connect.color }}>{connect.name[0]}</span>
                <div><b style={{ fontWeight: 400 }}>{connect.name}</b><p>{connect.blurb}</p></div>
              </div>
              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 4 }}>
                {connect.fields.map((f) => (
                  <label key={f.key} className="wizard-fields" style={{ display: "block" }}>
                    <div className="helper-line"><span>{f.label}</span>{f.type === "password" && <span className="sim-badge">encrypted</span>}</div>
                    <input className="wide-input" type={f.type ?? "text"} placeholder={f.placeholder} />
                    {f.help && <small style={{ color: "#77736c", fontSize: 9 }}>{f.help}</small>}
                  </label>
                ))}
              </div>
              {tested && (
                <div className="test-result">
                  <div className="test-icon success">✓</div>
                  <h4>Connection successful</h4>
                  <p>Authenticated with {connect.name}. Read version and located the menu endpoint. (Prototype — no live call.)</p>
                </div>
              )}
              <div className="wizard-actions">
                <button className="quiet" onClick={() => setConnect(null)}>Cancel</button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="outline-button" onClick={() => setTested(true)}>Test connection</button>
                  <button className="gold-button" onClick={() => { show(`${connect.name} connection saved (prototype)`); setConnect(null); }}>Save connection</button>
                </div>
              </div>
              <div className="detail-note">Secrets are write-only in the real app — stored server-side and never returned to the browser.</div>
            </section>
          </div>
        </div>
      )}
      {samba && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSamba(false)}>
          <div className="detail-drawer">
            <header>
              <div><span className="panel-kicker">Connect POS · SambaPOS</span><h2>SambaPOS connector</h2></div>
              <button onClick={() => setSamba(false)}>✕</button>
            </header>
            <section className="detail-content">
              <p style={{ color: "#77736c", fontSize: 12, margin: "0 0 6px" }}>SambaPOS runs on the restaurant\'s PC, so it connects through the <b>Klown Connector</b> (a small app on that PC). Generate a token, paste it into the connector\'s .env, and run it.</p>
              <label className="wizard-fields" style={{ display: "block", marginTop: 14 }}>
                <div className="helper-line"><span>Restaurant</span></div>
                <select className="wide-input" value={sf.restaurant_id} onChange={(e) => { setSf({ restaurant_id: e.target.value }); setNewToken(null); }}>
                  <option value="">Select a restaurant…</option>
                  {restaurants.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              <button className="gold-button" style={{ marginTop: 10 }} onClick={genToken} disabled={gen}>{gen ? "Generating…" : "Generate connector token"}</button>
              {newToken && (
                <div className="detail-note" style={{ flexDirection: "column", gap: 6 }}>
                  <b style={{ fontWeight: 400, color: "var(--ink)" }}>Connector token (shown once) — paste into the connector .env as KLOWN_CONNECTOR_TOKEN</b>
                  <code style={{ wordBreak: "break-all", fontSize: 11 }}>{newToken}</code>
                  <button className="outline-button" style={{ alignSelf: "flex-start" }} onClick={() => { navigator.clipboard?.writeText(newToken); show("Token copied"); }}>Copy token</button>
                </div>
              )}
              {connectors.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div className="section-label">CONNECTORS</div>
                  <div className="connection-list">
                    {connectors.map((c: any) => (
                      <div key={c.id}>
                        <span><b>{c.restaurant_name} · {c.provider}</b><small>{c.last_seen_at ? "last seen " + relTime(c.last_seen_at) : "never connected"} · auto-close {c.writeback_enabled ? "on" : "off"}</small></span>
                        <span className={c.last_seen_at ? "healthy" : "offline"}>● {c.last_seen_at ? "Online" : "Waiting"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="detail-note">Download the Klown Connector, run it on the SambaPOS PC, and it links itself with this token. Read-only until you enable auto-close.</div>
            </section>
          </div>
        </div>
      )}
      {odoo && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setOdoo(false)}>
          <div className="detail-drawer">
            <header>
              <div><span className="panel-kicker">Connect POS · Odoo</span><h2>Connect a restaurant's Odoo</h2></div>
              <button onClick={() => setOdoo(false)}>✕</button>
            </header>
            <section className="detail-content">
              <p style={{ color: "#77736c", fontSize: 12, margin: "0 0 6px" }}>Enter the restaurant's Odoo details. Orders on its POS tables mirror into the live diner bill automatically. The API key is stored server-side and never shown again.</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="wizard-fields" style={{ display: "block" }}>
                  <div className="helper-line"><span>Restaurant</span></div>
                  <select className="wide-input" value={of.restaurant_id} onChange={(e) => setOf({ ...of, restaurant_id: e.target.value })}>
                    <option value="">Select a restaurant…</option>
                    {restaurants.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </label>
                <label className="wizard-fields" style={{ display: "block" }}>
                  <div className="helper-line"><span>Odoo URL</span></div>
                  <input className="wide-input" placeholder="https://naxos.odoo.com" value={of.url} onChange={(e) => setOf({ ...of, url: e.target.value })} />
                </label>
                <label className="wizard-fields" style={{ display: "block" }}>
                  <div className="helper-line"><span>Database</span></div>
                  <input className="wide-input" placeholder="naxos-prod" value={of.db} onChange={(e) => setOf({ ...of, db: e.target.value })} />
                </label>
                <label className="wizard-fields" style={{ display: "block" }}>
                  <div className="helper-line"><span>Username</span></div>
                  <input className="wide-input" placeholder="admin" value={of.user} onChange={(e) => setOf({ ...of, user: e.target.value })} />
                </label>
                <label className="wizard-fields" style={{ display: "block" }}>
                  <div className="helper-line"><span>API key</span><span className="sim-badge">write-only</span></div>
                  <input className="wide-input" type="password" placeholder="••••••••" value={of.key} onChange={(e) => setOf({ ...of, key: e.target.value })} />
                  <small style={{ color: "#77736c", fontSize: 9 }}>Leave blank when editing to keep the existing key.</small>
                </label>
              </div>
              {odooConfigs.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div className="section-label">CONNECTED</div>
                  <div className="connection-list">
                    {odooConfigs.map((c: any) => (
                      <div key={c.restaurant_id}>
                        <span><b>{c.restaurant_name}</b><small>{c.base_url} · {c.db} · {c.username}</small></span>
                        <span className={c.key_set ? "healthy" : "issue"}>● {c.key_set ? "Key set" : "No key"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="wizard-actions">
                <button className="quiet" onClick={() => setOdoo(false)}>Cancel</button>
                <button className="gold-button" onClick={saveOdoo} disabled={saving}>{saving ? "Saving…" : "Save connection"}</button>
              </div>
              <div className="detail-note">Read-only: the sync only reads open table orders from Odoo — it never writes to your POS. Runs every minute.</div>
            </section>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
