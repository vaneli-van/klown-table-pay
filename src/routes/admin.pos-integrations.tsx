import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

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

const CONNECTIONS = [
  { rest: "Kozo", provider: "Odoo", status: "Live", health: "Healthy", sync: "2 min ago" },
  { rest: "Saint Pablo", provider: "Odoo", status: "Live", health: "Healthy", sync: "25 min ago" },
  { rest: "AYA", provider: "SambaPOS", status: "Live", health: "Healthy", sync: "11 min ago" },
  { rest: "Bistro 22", provider: "Omega", status: "Testing", health: "Issue", sync: "1 hr ago" },
  { rest: "SkyBar 25", provider: "Manual menu", status: "Configuration", health: "Offline", sync: "—" },
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
  useEscape(() => { setConnect(null); setTested(false); });

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
        <div><span>Connected POS</span><b>5</b><small>across 5 restaurants</small></div>
        <div><span>Healthy</span><b>3</b><small className="green">live &amp; syncing</small></div>
        <div><span>Needs attention</span><b>1</b><small>Omega degraded</small></div>
        <div><span>Sync jobs today</span><b>128</b><small className="green">99.1% success</small></div>
      </div>

      <div className="provider-grid">
        {PROVIDERS.map((p) => (
          <div className="pos-provider-card" key={p.key}>
            <div className="provider-card-top">
              <span className="provider-logo" style={{ background: p.color }}>{p.name[0]}</span>
              <span className="status-pill">{p.connections} connected</span>
            </div>
            <h3>{p.name}</h3>
            <p>{p.blurb}</p>
            <div className="provider-meta">
              <span><span className={p.health === "warn" ? "health-dot warn" : "health-dot"} />{p.health === "warn" ? "Degraded" : "Operational"}</span>
              <span>{p.connections} live</span>
            </div>
            <div className="provider-card-footer">
              <button className="gold-button" onClick={() => { setConnect(p); setTested(false); }}>Connect</button>
              <button className="outline-button" onClick={() => show(`${p.name} docs (prototype)`)}>Docs</button>
            </div>
          </div>
        ))}
      </div>

      <div className="pos-summary-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Active connections</span><h2>Live POS links</h2></div></div>
          <div className="connection-list">
            {CONNECTIONS.map((c) => (
              <div key={c.rest}>
                <span className="provider-logo mini">{c.provider[0]}</span>
                <span><b>{c.rest} · {c.provider}</b><small>Last sync {c.sync}</small></span>
                <span className={c.health === "Healthy" ? "healthy" : c.health === "Issue" ? "issue" : "offline"}>● {c.health}</span>
                <span className={c.status === "Live" ? "status-pill live" : "status-pill"}>{c.status}</span>
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
      <Toast text={toast} />
    </AdminLayout>
  );
}
