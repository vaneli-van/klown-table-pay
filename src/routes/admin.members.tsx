import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Members";

export const Route = createFileRoute("/admin/members")({
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

type M = { name: string; phone: string; tier: "Member" | "Regular" | "Inner Circle"; points: string; visits: number; seen: string; since: string };
const MEMBERS: M[] = [
  { name: "Ama Mensah", phone: "+233 24 118 4420", tier: "Inner Circle", points: "4,210", visits: 38, seen: "2 days ago", since: "Jan 2026" },
  { name: "Adjoa Nyarko", phone: "+233 20 553 9071", tier: "Inner Circle", points: "5,020", visits: 44, seen: "yesterday", since: "Nov 2025" },
  { name: "Kwesi Boateng", phone: "+233 27 904 2213", tier: "Regular", points: "1,860", visits: 21, seen: "5 days ago", since: "Feb 2026" },
  { name: "Yaw Darko", phone: "+233 24 771 5560", tier: "Regular", points: "2,110", visits: 24, seen: "1 week ago", since: "Dec 2025" },
  { name: "Efua Owusu", phone: "+233 55 220 8834", tier: "Member", points: "540", visits: 7, seen: "today", since: "Mar 2026" },
  { name: "Kofi Asante", phone: "+233 26 449 1187", tier: "Member", points: "120", visits: 2, seen: "today", since: "Aug 2026" },
];
const COLS = "1.65fr 1fr .9fr .7fr 1fr 1fr .9fr 22px";

function Page() {
  const { toast, show } = useToast();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<M | null>(null);
  useEscape(() => setSel(null));
  const rows = MEMBERS.filter((m) => `${m.name} ${m.phone} ${m.tier}`.toLowerCase().includes(q.toLowerCase()));
  const setTier = (t: string) => { show(`${sel?.name} → ${t} (prototype)`); setSel(null); };

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Member directory</h2><p>Diners who joined Klown, their tier and points balance. Prototype.</p></div>
        <button className="gold-button" onClick={() => show("Exported members.csv (prototype)")}>Export</button>
      </section>

      <div className="member-kpis">
        <div><span>Members</span><b>3,325</b><small className="green">+184 this month</small></div>
        <div><span>Marketing opted-in</span><b>2,910</b></div>
        <div><span>Avg. points</span><b>1,640</b></div>
        <div><span>Redemptions</span><b>412</b><small>this month</small></div>
      </div>

      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members, phone or tier" /></div>
      </div>

      <div className="member-table">
        <div className="member-row member-head" style={{ gridTemplateColumns: COLS }}>
          <span>Member</span><span>Tier</span><span>Points</span><span>Visits</span><span>Last seen</span><span>Member since</span><span>Status</span><span />
        </div>
        {rows.map((m) => (
          <button className="member-row" key={m.phone} style={{ gridTemplateColumns: COLS }} onClick={() => setSel(m)}>
            <span className="member-name"><i>{m.name[0]}</i><b>{m.name}</b><small>{m.phone}</small></span>
            <span><span className={m.tier === "Inner Circle" ? "status-pill live" : "status-pill"}>{m.tier}</span></span>
            <span>{m.points}</span>
            <span>{m.visits}</span>
            <span>{m.seen}</span>
            <span>{m.since}</span>
            <span className="healthy">Active</span>
            <span>→</span>
          </button>
        ))}
      </div>
      <div className="pagination"><span>Showing 1–{rows.length} of 3,325</span><div><button>‹</button><button>›</button></div></div>

      {sel && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="detail-drawer">
            <header>
              <div className="detail-title">
                <span className="restaurant-logo large">{sel.name[0]}</span>
                <div><span className="panel-kicker">Member</span><h2>{sel.name}</h2><span className="status-pill live">{sel.tier}</span></div>
              </div>
              <button onClick={() => setSel(null)}>✕</button>
            </header>
            <section className="detail-content">
              <div className="detail-metrics">
                <div><small>Points balance</small><b>{sel.points}</b></div>
                <div><small>Lifetime visits</small><b>{sel.visits}</b></div>
                <div><small>Member since</small><b>{sel.since}</b></div>
              </div>
              <h3 style={{ marginTop: 30 }}>Change tier</h3>
              <div className="action-list">
                <button onClick={() => setTier("Member")}>Set to Member <span>›</span></button>
                <button onClick={() => setTier("Regular")}>Set to Regular <span>›</span></button>
                <button onClick={() => setTier("Inner Circle")}>Set to Inner Circle <span>›</span></button>
                <button onClick={() => { show(`Adjusted points for ${sel.name} (prototype)`); setSel(null); }}>Adjust points <span>›</span></button>
              </div>
            </section>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
