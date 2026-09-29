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


const PROVIDERS: { key: string; name: string; color: string; blurb: string; mode: "odoo" | "sambapos" | "in_progress" }[] = [
  { key: "odoo", name: "Odoo", color: "#7c4dff", blurb: "JSON-RPC connector. Menu sync + order mirroring for Odoo 15+.", mode: "odoo" },
  { key: "sambapos", name: "SambaPOS", color: "#2e7d32", blurb: "On-premise connector for SambaPOS 5 terminals (Klown Connector app).", mode: "sambapos" },
  { key: "omega", name: "Omega", color: "#c8a56b", blurb: "REST connector. Integration in progress under the Omega partnership.", mode: "in_progress" },
];

const CAPS = ["Menu sync", "Orders", "Payments", "Tables", "Modifiers", "Stock", "Webhooks", "Realtime"];
const MATRIX: Record<string, ("y" | "p" | "n")[]> = {
  Odoo: ["y", "y", "p", "y", "y", "y", "y", "p"],
  SambaPOS: ["y", "y", "n", "y", "y", "p", "p", "y"],
  Omega: ["y", "p", "n", "p", "p", "n", "y", "n"],
};

function Page() {
  const { toast, show } = useToast();
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
  useEscape(() => { setOdoo(false); setSamba(false); setNewToken(null); });

  const capDot = (v: "y" | "p" | "n") =>
    v === "y" ? <span className="cap-yes">●</span> : v === "p" ? <span className="cap-partial">◐</span> : <span className="cap-no">○</span>;

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div>
          <h2>Point-of-sale integrations</h2>
          <p>Connect each restaurant's POS so menus, orders and tables stay in sync.</p>
        </div>
      </section>

      <div className="pos-kpis">
        <div><span>Connected POS</span><b>{connLoading ? "…" : conns.length}</b><small>across {connLoading ? "…" : new Set(conns.map((c:any)=>c.restaurant_id)).size} restaurants</small></div>
        <div><span>Healthy</span><b>{connLoading ? "…" : conns.filter((c:any)=>c.health==="healthy").length}</b><small className="green">live &amp; syncing</small></div>
        <div><span>Needs attention</span><b>{connLoading ? "…" : conns.filter((c:any)=>c.health && c.health!=="healthy").length}</b></div>
        <div><span>Live connections</span><b>{connLoading ? "…" : conns.filter((c:any)=>c.status==="live").length}</b><small className="green">reading real data</small></div>
      </div>

      <div className="provider-grid">
        {PROVIDERS.map((p) => {
          const mine = conns.filter((c: any) => c.provider === p.key);
          const live = mine.filter((c: any) => c.status === "live").length;
          const worst = mine.some((c: any) => c.health === "offline") ? "offline" : mine.some((c: any) => c.health && c.health !== "healthy") ? "issue" : "healthy";
          const configured = p.mode === "odoo" ? odooConfigs.length : p.mode === "sambapos" ? connectors.length : mine.length;
          return (
            <div className="pos-provider-card" key={p.key}>
              <div className="provider-card-top">
                <span className="provider-logo" style={{ background: p.color }}>{p.name[0]}</span>
                <span className="status-pill">{connLoading ? "…" : configured} connected</span>
              </div>
              <h3>{p.name}</h3>
              <p>{p.blurb}</p>
              <div className="provider-meta">
                <span><span className={worst === "healthy" ? "health-dot" : "health-dot warn"} />{mine.length === 0 ? "No connections" : worst === "healthy" ? "Operational" : worst === "offline" ? "Offline" : "Degraded"}</span>
                <span>{connLoading ? "…" : live} live</span>
              </div>
              <div className="provider-card-footer">
                {p.mode === "odoo" && <button className="gold-button" onClick={() => setOdoo(true)}>Connect / manage</button>}
                {p.mode === "sambapos" && <button className="gold-button" onClick={() => { setSamba(true); setNewToken(null); }}>Connect</button>}
                {p.mode === "in_progress" && <span className="status-pill">Integration in progress</span>}
              </div>
            </div>
          );
        })}
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
          <div className="panel-heading"><div><span className="panel-kicker">Sync activity</span><h2>Most recent syncs</h2></div></div>
          <div className="job-list">
            {connLoading ? <div className="empty-state"><h3>Loading…</h3></div>
              : conns.length === 0 ? <div className="empty-state"><h3>No syncs yet</h3></div>
              : [...conns].sort((a: any, b: any) => (b.last_sync_at ?? "").localeCompare(a.last_sync_at ?? "")).slice(0, 6).map((c: any) => (
              <div key={c.id}>
                <span className="job-time">{c.last_sync_at ? relTime(c.last_sync_at) : "never"}</span>
                <span><b>{c.restaurant_name}</b><small>{titleCase(c.provider)} · {c.health === "healthy" ? "sync ok" : c.health ? titleCase(c.health) : "no status"}</small></span>
                <span className="sync-count">{titleCase(c.status) || "—"}</span>
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
