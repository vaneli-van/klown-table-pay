import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";

const TITLE = "Activity Log";

export const Route = createFileRoute("/admin/activity-log")({
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

const LOG = [
  { who: "Ama Mensah", action: "Requested refund", record: "Bill #48213 · GH₵ 346.50", when: "10:44" },
  { who: "System", action: "Synced Odoo menu", record: "Kozo · 307 items (12 updated)", when: "10:40" },
  { who: "Kwesi Boateng", action: "Activated POS connection", record: "AYA · SambaPOS", when: "09:58" },
  { who: "Samuel", action: "Invited staff", record: "efua@klown.com · Read-Only Analyst", when: "09:31" },
  { who: "Efua Owusu", action: "Added tables", record: "Bistro 22 · 4 tables", when: "Yesterday" },
  { who: "Ama Mensah", action: "Changed member tier", record: "Adjoa Nyarko → Inner Circle", when: "Yesterday" },
];
const COLS = "1fr 1.2fr 1.8fr .7fr";

function Page() {
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Activity log</h2><p>An immutable record of every privileged action in the console. Prototype.</p></div>
      </section>
      <div className="restaurant-table" style={{ marginTop: 12 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 760 }}>
          <span>Actor</span><span>Action</span><span>Record</span><span>When</span>
        </div>
        {LOG.map((l, i) => (
          <div className="restaurant-table-row" key={i} style={{ gridTemplateColumns: COLS, minWidth: 760 }}>
            <span className="restaurant-name" style={{ cursor: "default" }}><span className="restaurant-logo">{l.who[0]}</span><span><b>{l.who}</b></span></span>
            <span>{l.action}</span>
            <span>{l.record}</span>
            <span>{l.when}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
