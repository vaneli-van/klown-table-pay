import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";

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

type Restaurant = {
  id: string;
  name: string;
  city: string;
  locations: number;
  pos: string;
  connection: string;
  tables: number;
  members: string;
  volume: string;
  revenue: string;
  onboarding: string;
  owner: string;
  sync: string;
  status: string;
};

const RESTAURANTS: Restaurant[] = [
  { id: 'kozo', name: 'Kozo', city: 'Accra', locations: 1, pos: 'Odoo', connection: 'Healthy', tables: 12, members: '1,240', volume: 'GH₵ 82.4k', revenue: 'GH₵ 4.1k', onboarding: 'Live', owner: 'Ama Mensah', sync: '2 min ago', status: 'Active' },
  { id: 'aya', name: 'AYA', city: 'Accra', locations: 1, pos: 'SambaPOS', connection: 'Healthy', tables: 8, members: '860', volume: 'GH₵ 51.2k', revenue: 'GH₵ 2.6k', onboarding: 'Live', owner: 'Kwesi Boateng', sync: '11 min ago', status: 'Active' },
  { id: 'bistro22', name: 'Bistro 22', city: 'Accra', locations: 1, pos: 'Omega', connection: 'Issue', tables: 6, members: '410', volume: 'GH₵ 22.8k', revenue: 'GH₵ 1.1k', onboarding: 'Testing', owner: 'Efua Owusu', sync: '1 hr ago', status: 'Active' },
  { id: 'skybar25', name: 'SkyBar 25', city: 'Accra', locations: 1, pos: 'Manual menu', connection: 'Offline', tables: 10, members: '295', volume: 'GH₵ 12.1k', revenue: 'GH₵ 0.6k', onboarding: 'Configuration', owner: 'Yaw Darko', sync: '—', status: 'Paused' },
  { id: 'saintpablo', name: 'Saint Pablo', city: 'Accra', locations: 1, pos: 'Odoo', connection: 'Healthy', tables: 9, members: '520', volume: 'GH₵ 33.5k', revenue: 'GH₵ 1.7k', onboarding: 'Ready to launch', owner: 'Adjoa Nyarko', sync: '25 min ago', status: 'Active' },
];

const STAGES = ['Lead', 'Contacted', 'Agreement pending', 'Configuration', 'POS connection', 'Menu setup', 'Table/device setup', 'Testing', 'Ready to launch', 'Live', 'Paused'];

const WIZARD_STEPS = [
  'Business information',
  'Primary contact',
  'First location',
  'POS selection',
  'Menu setup',
  'Tables and devices',
  'Commercial configuration',
  'Review and activate',
];

const DETAIL_TABS = ['Overview', 'Locations', 'POS Connections', 'Menu', 'Bills & Payments', 'Members', 'Support', 'Activity'];

function connectionClass(connection: string) {
  return connection === 'Healthy' ? 'healthy' : connection === 'Issue' ? 'issue' : 'offline';
}

function Page() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [posFilter, setPosFilter] = useState('All POS');
  const [view, setView] = useState<'directory' | 'pipeline'>('directory');
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [confirm, setConfirm] = useState<Restaurant | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(DETAIL_TABS[0]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelected(null);
      setConfirm(null);
      setWizardOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = RESTAURANTS.filter((r) => {
    const matchesQuery =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.owner.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All statuses' || r.status === statusFilter;
    const matchesPos = posFilter === 'All POS' || r.pos === posFilter;
    return matchesQuery && matchesStatus && matchesPos;
  });

  const openDrawer = (r: Restaurant) => {
    setActiveTab(DETAIL_TABS[0]);
    setSelected(r);
  };

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div>
          <h2>Restaurant directory</h2>
          <p>Manage your network, onboarding pipeline and location operations.</p>
        </div>
        <div>
          <div className="view-switch">
            <button
              className={view === 'directory' ? 'active' : undefined}
              onClick={() => setView('directory')}
            >
              Directory
            </button>
            <button
              className={view === 'pipeline' ? 'active' : undefined}
              onClick={() => setView('pipeline')}
            >
              Onboarding pipeline
            </button>
          </div>
          <button className="gold-button" onClick={() => setWizardOpen(true)}>
            + Add restaurant
          </button>
        </div>
      </section>

      {view === 'directory' && (
        <>
          <section className="directory-toolbar">
            <label className="search-field">
              <input
                type="search"
                placeholder="Search restaurants, owners or locations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All statuses</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Archived</option>
            </select>
            <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
              <option>All POS</option>
              <option>Odoo</option>
              <option>SambaPOS</option>
              <option>Omega</option>
              <option>Manual menu</option>
            </select>
            <button
              className="outline-button"
              onClick={() => setToast('Exported restaurants.csv (prototype)')}
            >
              Export CSV
            </button>
          </section>

          <div className="directory-summary">
            <b>{filtered.length} restaurants</b>
            <span>Prototype data</span>
          </div>

          <section className="restaurant-table">
            <div className="restaurant-table-head">
              <span>Restaurant</span>
              <span>POS &amp; connection</span>
              <span>Members</span>
              <span>Payment volume</span>
              <span>Onboarding</span>
              <span>Owner / last sync</span>
              <span>Status</span>
              <i />
            </div>
            {filtered.map((r) => (
              <div className="restaurant-table-row" key={r.id}>
                <button className="restaurant-name" onClick={() => openDrawer(r)}>
                  <span className="restaurant-logo">{r.name[0]}</span>
                  <span>
                    <b>{r.name}</b>
                    <small>
                      {r.city} · {r.locations} location · {r.tables} tables
                    </small>
                  </span>
                </button>
                <span>
                  <b>{r.pos}</b>
                  <small className={connectionClass(r.connection)}>● {r.connection}</small>
                </span>
                <span>{r.members}</span>
                <span>
                  <b>{r.volume}</b>
                  <small>{r.revenue} Klown revenue</small>
                </span>
                <span>
                  <span className={r.onboarding === 'Live' ? 'status-pill live' : 'status-pill'}>
                    {r.onboarding}
                  </span>
                </span>
                <span>
                  <b>{r.owner}</b>
                  <small>{r.sync}</small>
                </span>
                <span>
                  <span className={r.status === 'Active' ? 'status-pill live' : 'status-pill'}>
                    {r.status}
                  </span>
                </span>
                <button className="row-menu" onClick={() => setConfirm(r)}>
                  ⌄
                </button>
              </div>
            ))}
          </section>

          <div className="pagination">
            <span>
              Showing 1–{filtered.length} of {RESTAURANTS.length}
            </span>
            <div>
              <button>‹</button>
              <button>›</button>
            </div>
          </div>
        </>
      )}

      {view === 'pipeline' && (
        <section className="pipeline">
          {STAGES.map((stage) => {
            const items = RESTAURANTS.filter((r) =>
              stage === 'Paused' ? r.status === 'Paused' : r.onboarding === stage && r.status !== 'Paused',
            );
            return (
              <div className="pipeline-column" key={stage}>
                <header>
                  <span>{stage}</span>
                  <b>{items.length}</b>
                </header>
                {items.map((r) => (
                  <button className="pipeline-card" key={r.id} onClick={() => openDrawer(r)}>
                    <b>{r.name}</b>
                    <small>{r.city}</small>
                    <span>{r.owner}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {selected && (
        <div className="ops-overlay">
          <div className="detail-drawer">
            <header>
              <div className="detail-title">
                <span className="restaurant-logo large">{selected.name[0]}</span>
                <div>
                  <span className="panel-kicker">Restaurant profile</span>
                  <h2>{selected.name}</h2>
                  <span className="status-pill live">{selected.status}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)}>✕</button>
            </header>
            <div className="detail-tabs">
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? 'active' : undefined}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <section className="detail-content">
              <div className="detail-metrics">
                <div>
                  <small>Payment volume</small>
                  <b>{selected.volume}</b>
                </div>
                <div>
                  <small>Active members</small>
                  <b>{selected.members}</b>
                </div>
                <div>
                  <small>POS health</small>
                  <b>{selected.connection}</b>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {wizardOpen && (
        <div className="ops-overlay">
          <div className="wizard">
            <header>
              <div>
                <span className="panel-kicker">New restaurant</span>
                <h2>Add restaurant</h2>
              </div>
              <button onClick={() => setWizardOpen(false)}>✕</button>
            </header>
            <div className="wizard-body">
              <aside>
                {WIZARD_STEPS.map((step, i) => (
                  <div key={step} className={i === 0 ? 'current' : undefined}>
                    <b>{i + 1}</b>
                    <span>{step}</span>
                  </div>
                ))}
              </aside>
              <section>
                <span className="panel-kicker">Step 1 of 8</span>
                <h3>Business information</h3>
                <div className="wizard-fields">
                  <label>
                    Legal name
                    <input type="text" placeholder="Kozo Hospitality Ltd" />
                  </label>
                  <label>
                    Trading name
                    <input type="text" placeholder="Kozo" />
                  </label>
                  <label className="wide">
                    Description
                    <textarea placeholder="Tell members about this restaurant" />
                  </label>
                  <label>
                    City
                    <input type="text" placeholder="Accra" />
                  </label>
                  <label>
                    Currency
                    <select>
                      <option>GH₵ — Ghanaian cedi</option>
                      <option>USD — US dollar</option>
                      <option>EUR — Euro</option>
                    </select>
                  </label>
                  <label className="wide upload">
                    Upload logo and cover image
                    <input type="file" />
                  </label>
                </div>
                <div className="wizard-actions">
                  <button className="quiet" onClick={() => setToast('Draft saved (prototype)')}>
                    Save draft
                  </button>
                  <button
                    className="gold-button"
                    onClick={() => {
                      setToast('Kozo-style restaurant created (prototype)');
                      setWizardOpen(false);
                    }}
                  >
                    Activate restaurant
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <button onClick={() => setConfirm(null)}>✕</button>
            <span className="panel-kicker">Restaurant action</span>
            <h3>Manage {confirm.name}</h3>
            <div className="action-list">
              <button
                onClick={() => {
                  const r = confirm;
                  setConfirm(null);
                  openDrawer(r);
                }}
              >
                View restaurant
              </button>
              <button onClick={() => setToast('Menu editor opening (prototype)')}>Edit menu</button>
              <button onClick={() => setToast('POS connection flow (prototype)')}>Connect POS</button>
              <button
                onClick={() => {
                  setToast('Restaurant paused (prototype)');
                  setConfirm(null);
                }}
              >
                Pause account
              </button>
            </div>
            <button className="quiet" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </AdminLayout>
  );
}
