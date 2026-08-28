import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Rewards";

export const Route = createFileRoute("/admin/rewards")({
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

type R = { name: string; desc: string; cost: number; tier: string; stock: string; status: "Active" | "Inactive" };
const REWARDS: R[] = [
  { name: "Free dessert", desc: "Any dessert on the house at participating restaurants.", cost: 400, tier: "Member", stock: "120 left", status: "Active" },
  { name: "GH₵20 off your bill", desc: "Flat GH₵20 credit applied at checkout.", cost: 800, tier: "Regular", stock: "Unlimited", status: "Active" },
  { name: "Priority table", desc: "Skip the wait — a held table on your next visit.", cost: 1500, tier: "Inner Circle", stock: "20 left", status: "Active" },
  { name: "Chef's tasting menu", desc: "A five-course tasting for two at Kozo.", cost: 3000, tier: "Inner Circle", stock: "5 left", status: "Inactive" },
];

function Page() {
  const { toast, show } = useToast();
  const [create, setCreate] = useState(false);
  useEscape(() => setCreate(false));
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Rewards catalogue</h2><p>What members can redeem their Klown Points for. Prototype.</p></div>
        <button className="gold-button" onClick={() => setCreate(true)}>+ Create reward</button>
      </section>

      <div className="member-kpis">
        <div><span>Active rewards</span><b>3</b></div>
        <div><span>Redeemed (30d)</span><b>412</b><small className="green">+12%</small></div>
        <div><span>Points spent</span><b>318k</b></div>
        <div><span>Most popular</span><b>Free dessert</b></div>
      </div>

      <div className="reward-grid">
        {REWARDS.map((r) => (
          <div className="reward-card" key={r.name}>
            <div className="reward-art">{r.name[0]}</div>
            <h3>{r.name}</h3>
            <small>{r.desc}</small>
            <div className="tier-rule"><span>Cost</span><b>{r.cost} pts</b></div>
            <div className="tier-rule"><span>Tier</span><b>{r.tier}</b></div>
            <div>
              <span className={r.status === "Active" ? "status-pill live" : "status-pill"}>{r.status} · {r.stock}</span>
              <button className="outline-button" onClick={() => show(`Redeemed ${r.name} (prototype)`)}>Redeem</button>
            </div>
          </div>
        ))}
      </div>

      {create && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setCreate(false)}>
          <div className="confirm-box">
            <button onClick={() => setCreate(false)}>✕</button>
            <span className="panel-kicker">New reward</span>
            <h3>Create reward</h3>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Name</span></div><input className="wide-input" placeholder="e.g. Free coffee" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Points cost</span></div><input className="wide-input" type="number" placeholder="400" /></label>
            <label className="wizard-fields" style={{ display: "block" }}><div className="helper-line"><span>Tier required</span></div><select className="wide-input"><option>Member</option><option>Regular</option><option>Inner Circle</option></select></label>
            <button className="gold-button" onClick={() => { show("Reward created (prototype)"); setCreate(false); }}>Create reward</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
