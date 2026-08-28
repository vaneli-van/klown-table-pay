import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";

const TITLE = "Settings";

export const Route = createFileRoute("/admin/settings")({
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

const CARDS = [
  { t: "Klown profile", d: "Workspace name, logo, contact and support email." },
  { t: "Fees & revenue", d: "Klown fee is 5% of captured volume. Payout schedule and thresholds." },
  { t: "Payment providers", d: "Paystack keys, Mobile Money channels and card settings." },
  { t: "Notifications", d: "Where operational alerts are sent — email, in-app, webhook." },
  { t: "API keys & webhooks", d: "Programmatic access and event subscriptions." },
  { t: "Data & export", d: "Bulk exports, retention and audit-log downloads." },
];

function Page() {
  const { toast, show } = useToast();
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Workspace settings</h2><p>Klown profile, fees, providers and access. Prototype.</p></div>
        <button className="gold-button" onClick={() => show("Settings saved (prototype)")}>Save changes</button>
      </section>

      <div className="settings-grid">
        {CARDS.map((c) => (
          <button className="settings-card" key={c.t} onClick={() => show(`${c.t} (prototype)`)}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gold)", marginTop: 4 }} />
            <b>{c.t}</b>
            <small>{c.d}</small>
            <span style={{ color: "#77736c" }}>›</span>
          </button>
        ))}
      </div>

      <div className="warning-panel">
        <span style={{ color: "#9b7544", fontWeight: 700 }}>!</span>
        <div>
          <b>Danger zone</b>
          <p>Suspending the workspace pauses all diner payments across every restaurant. This is a prototype — no destructive action is wired.</p>
        </div>
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
