import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Points";

export const Route = createFileRoute("/admin/points")({
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

type P = { who: string; phone: string; pts: number; reason: string; when: string };
const LEDGER: P[] = [
  { who: "Ama Mensah", phone: "+233 24 118 4420", pts: 346, reason: "Earned · bill #48213", when: "10:42" },
  { who: "Kofi Asante", phone: "+233 26 449 1187", pts: 120, reason: "Welcome bonus", when: "10:20" },
  { who: "Efua Owusu", phone: "+233 55 220 8834", pts: -400, reason: "Redeemed · Free dessert", when: "09:59" },
  { who: "Kwesi Boateng", phone: "+233 27 904 2213", pts: 128, reason: "Earned · bill #48209", when: "09:31" },
  { who: "Adjoa Nyarko", phone: "+233 20 553 9071", pts: 200, reason: "Manual adjustment · goodwill", when: "Yesterday" },
];
const COLS = "1.6fr 1fr 1.4fr .8fr";

function Page() {
  const { toast, show } = useToast();
  const [adjust, setAdjust] = useState(false);
  useEscape(() => setAdjust(false));
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Points ledger</h2><p>Every earn and redemption across the network. Prototype.</p></div>
        <button className="gold-button" onClick={() => setAdjust(true)}>Adjust points</button>
      </section>

      <div className="member-kpis">
        <div><span>Points issued</span><b>1.24M</b><small className="green">this month</small></div>
        <div><span>Redeemed</span><b>318k</b></div>
        <div><span>Outstanding</span><b>5.46M</b></div>
        <div><span>Breakage</span><b>11%</b><small>expired unused</small></div>
      </div>

      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 720 }}>
          <span>Member</span><span>Points</span><span>Reason</span><span>When</span>
        </div>
        {LEDGER.map((p, i) => (
          <div className="restaurant-table-row" key={i} style={{ gridTemplateColumns: COLS, minWidth: 720 }}>
            <span><b>{p.who}</b><small>{p.phone}</small></span>
            <span className={p.pts >= 0 ? "healthy" : "issue"} style={{ fontWeight: 400 }}>{p.pts >= 0 ? "+" : ""}{p.pts}</span>
            <span>{p.reason}</span>
            <span>{p.when}</span>
          </div>
        ))}
      </div>

      {adjust && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setAdjust(false)}>
          <div className="confirm-box">
            <button onClick={() => setAdjust(false)}>✕</button>
            <span className="panel-kicker">Manual adjustment</span>
            <h3>Adjust points</h3>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Member phone</span></div><input className="wide-input" placeholder="+233 …" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Points (+/-)</span></div><input className="wide-input" type="number" placeholder="e.g. 200 or -100" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Reason</span><span className="sim-badge">required</span></div><input className="wide-input" placeholder="Reason for the adjustment" /></label>
            <button className="gold-button" onClick={() => { show("Points adjusted (prototype)"); setAdjust(false); }}>Record adjustment</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
