import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";

const TITLE = "Tiers";

export const Route = createFileRoute("/admin/tiers")({
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

const TIERS = [
  { name: "Member", count: "2,140", earn: "1× points", threshold: "Join Klown", perks: "Digital receipts, member offers" },
  { name: "Regular", count: "940", earn: "1.5× points", threshold: "8 visits / 90 days", perks: "Everything in Member + early access" },
  { name: "Inner Circle", count: "245", earn: "2× points", threshold: "20 visits / 90 days", perks: "Highest earn rate, priority experiences" },
];

function Page() {
  const { toast, show } = useToast();
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Membership tiers</h2><p>The Klown Club ladder — earn rates, thresholds and who sits where. Prototype.</p></div>
        <button className="gold-button" onClick={() => show("Tier rules saved (prototype)")}>Save rules</button>
      </section>

      <div className="member-kpis">
        <div><span>Total members</span><b>3,325</b></div>
        <div><span>Regular</span><b>940</b><small className="green">28% of base</small></div>
        <div><span>Inner Circle</span><b>245</b><small className="green">7% of base</small></div>
        <div><span>Avg. tier lift</span><b>+18%</b><small>spend vs Member</small></div>
      </div>

      <div className="tier-admin-grid">
        {TIERS.map((t) => (
          <div className="tier-admin-card" key={t.name}>
            <span className="panel-kicker">{t.count} members</span>
            <h3>{t.name}</h3>
            <p>{t.perks}</p>
            <div className="tier-rule"><span>Earn rate</span><b>{t.earn}</b></div>
            <div className="tier-rule"><span>Threshold</span><b>{t.threshold}</b></div>
            <button className="outline-button" onClick={() => show(`Edit ${t.name} tier (prototype)`)}>Edit tier</button>
          </div>
        ))}
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
