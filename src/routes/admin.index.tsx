import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";

const TITLE = "Overview";

export const Route = createFileRoute("/admin/")({
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

const METRICS = [
  { label: "Payment volume", value: "GH₵ 214.9k", note: "+12.4%", cls: "green", sub: "vs last month" },
  { label: "Klown revenue", value: "GH₵ 10.7k", note: "5% of volume", cls: "gold", sub: "" },
  { label: "Active members", value: "3,325", note: "+184", cls: "green", sub: "this month" },
  { label: "Live restaurants", value: "4", note: "1 in testing", cls: "gold", sub: "" },
  { label: "Transactions", value: "1,842", note: "+9.1%", cls: "green", sub: "vs last month" },
  { label: "Avg. bill", value: "GH₵ 116", note: "Mobile Money led", cls: "gold", sub: "" },
];

// Weekly volume points (0-100 scaled) for the line chart.
const SERIES = [22, 34, 30, 46, 52, 44, 61, 58, 72, 68, 80, 76];
const LABELS = ["Wk1", "Wk2", "Wk3", "Wk4", "Wk5", "Wk6", "Wk7", "Wk8", "Wk9", "Wk10", "Wk11", "Wk12"];

const RECENT = [
  { name: "Kozo", city: "Accra", volume: "GH₵ 82.4k", status: "Live" },
  { name: "AYA", city: "Accra", volume: "GH₵ 51.2k", status: "Live" },
  { name: "Saint Pablo", city: "Accra", volume: "GH₵ 33.5k", status: "Live" },
  { name: "Bistro 22", city: "Accra", volume: "GH₵ 22.8k", status: "Testing" },
];

const ACTIVITY = [
  { who: "Ama Mensah", what: "issued a refund on bill #48213", when: "6 min ago" },
  { who: "System", what: "synced Odoo menu for Kozo (307 items)", when: "22 min ago" },
  { who: "Kwesi Boateng", what: "activated SambaPOS for AYA", when: "1 hr ago" },
  { who: "Efua Owusu", what: "added 4 tables to Bistro 22", when: "3 hr ago" },
];

const ALERTS = [
  { title: "POS connection issue", body: "Bistro 22: Omega reachability degraded.", tag: "!" },
  { title: "Payment failed", body: "Mobile Money timeout on bill #48090.", tag: "!" },
  { title: "Open dispute", body: "A diner disputed bill #47955 at SkyBar 25.", tag: "!" },
];

function Chart() {
  const w = 640;
  const h = 175;
  const pts = SERIES.map((v, i) => {
    const x = (i / (SERIES.length - 1)) * w;
    const y = h - (v / 100) * (h - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="admin-chart">
      <div className="chart-grid">
        <span>GH₵ 90k</span>
        <span>GH₵ 60k</span>
        <span>GH₵ 30k</span>
        <span>GH₵ 0</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline
          points={pts}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="chart-labels">
        {LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function Page() {
  const { toast, show } = useToast();
  const [range, setRange] = useState("Last 12 weeks");
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div>
          <h2>Today at Klown</h2>
          <p>Network-wide performance across your live restaurants. Prototype data.</p>
        </div>
        <div className="ops-top-actions">
          <select
            className="directory-toolbar"
            style={{ border: "1px solid #1717172a", padding: "9px", background: "transparent", fontSize: 11 }}
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option>Last 12 weeks</option>
            <option>Last 30 days</option>
            <option>This year</option>
          </select>
          <button className="gold-button" onClick={() => show("Exported overview.csv (prototype)")}>
            Export
          </button>
        </div>
      </section>

      <div className="metrics-grid">
        {METRICS.map((m) => (
          <div className="metric-card" key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <small className={m.cls}>
              {m.note}
              {m.sub ? <em> {m.sub}</em> : null}
            </small>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Payment volume</span>
              <h2>Weekly volume across the network</h2>
            </div>
            <Link to="/admin/bills-payments" className="panel-link">
              View payments ›
            </Link>
          </div>
          <Chart />
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Payment methods</span>
              <h2>How diners pay</h2>
            </div>
          </div>
          <div className="donut-wrap">
            <div className="donut">
              <div>
                <b>62%</b>
                <small>Mobile Money</small>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="legend-gold" />
                Mobile Money <b>62%</b>
              </span>
              <span>
                <i className="legend-dark" />
                Card <b>30%</b>
              </span>
              <span>
                <i className="legend-muted" />
                Klown Points <b>8%</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lower-grid">
        <div className="panel table-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Restaurants</span>
              <h2>Top by volume</h2>
            </div>
            <Link to="/admin/restaurants" className="panel-link">
              All restaurants ›
            </Link>
          </div>
          <div className="admin-table">
            <div className="table-row table-head">
              <span>Restaurant</span>
              <span>City</span>
              <span>Volume</span>
              <span>Status</span>
            </div>
            {RECENT.map((r) => (
              <div className="table-row" key={r.name}>
                <span>
                  <b>{r.name}</b>
                  <small>Klown Pay</small>
                </span>
                <span>{r.city}</span>
                <span>{r.volume}</span>
                <span>
                  <span className={r.status === "Live" ? "status-pill live" : "status-pill"}>{r.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Operations</span>
              <h2>Needs attention</h2>
            </div>
            <Link to="/admin/notifications" className="panel-link">
              All alerts ›
            </Link>
          </div>
          <div className="alert-list">
            {ALERTS.map((a) => (
              <a key={a.title} href="#" onClick={(e) => { e.preventDefault(); show("Opened alert (prototype)"); }}>
                <span className="alert-icon">{a.tag}</span>
                <span>
                  <b>{a.title}</b>
                  <small>{a.body}</small>
                </span>
              </a>
            ))}
          </div>
          <div className="activity-list" style={{ marginTop: 8 }}>
            {ACTIVITY.map((a, i) => (
              <div key={i}>
                <span className="avatar avatar-small">{a.who[0]}</span>
                <p>
                  <b>{a.who}</b> {a.what}
                  <small>{a.when}</small>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
