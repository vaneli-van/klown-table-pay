import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Support";

export const Route = createFileRoute("/admin/support")({
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

type T = { id: string; subject: string; category: string; source: string; rest: string; status: "Open" | "Resolved"; body: string; time: string };
const TICKETS: T[] = [
  { id: "1", subject: "Charged twice for mains", category: "Bill dispute", source: "Diner", rest: "Kozo", status: "Open", body: "Diner says bill #48213 was charged twice on Mobile Money.", time: "10:44" },
  { id: "2", subject: "Table 4 needs assistance", category: "Waiter request", source: "Diner", rest: "AYA", status: "Open", body: "Waiter call raised from Table 4.", time: "10:22" },
  { id: "3", subject: "Partnership — The Larteh Group", category: "Website enquiry", source: "Website", rest: "—", status: "Open", body: "Restaurant group asking to bring Klown to 3 venues in Accra.", time: "09:15" },
  { id: "4", subject: "Refund not received", category: "Bill dispute", source: "Diner", rest: "Bistro 22", status: "Resolved", body: "Refund confirmed settled to Mobile Money.", time: "Yesterday" },
];
const COLS = "1.7fr 1fr 1fr 1fr 22px";

function Page() {
  const { toast, show } = useToast();
  const [sel, setSel] = useState<T | null>(null);
  useEscape(() => setSel(null));
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Support centre</h2><p>Bill disputes, waiter requests and website enquiries in one queue. Prototype.</p></div>
      </section>

      <div className="member-kpis">
        <div><span>Open tickets</span><b>3</b></div>
        <div><span>Bill disputes</span><b>2</b></div>
        <div><span>Waiter requests</span><b>1</b></div>
        <div><span>Website enquiries</span><b>1</b></div>
      </div>

      <div className="restaurant-table" style={{ marginTop: 12 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 760 }}>
          <span>Subject</span><span>Category</span><span>Source</span><span>Status</span><span />
        </div>
        {TICKETS.map((t) => (
          <button className="restaurant-table-row" key={t.id} style={{ gridTemplateColumns: COLS, minWidth: 760, width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #e7e2da", background: "transparent", cursor: "pointer" }} onClick={() => setSel(t)}>
            <span><b>{t.subject}</b><small>{t.time}{t.rest !== "—" ? " · " + t.rest : ""}</small></span>
            <span>{t.category}</span>
            <span>{t.source}</span>
            <span><em className={t.status === "Resolved" ? "healthy" : "issue"} style={{ fontStyle: "normal" }}>{t.status}</em></span>
            <span>›</span>
          </button>
        ))}
      </div>

      {sel && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="detail-drawer">
            <header>
              <div><span className="panel-kicker">Support ticket · {sel.category}</span><h2>{sel.subject}</h2><span className={"status-pill" + (sel.status === "Resolved" ? " live" : "")}>{sel.status}</span></div>
              <button onClick={() => setSel(null)}>✕</button>
            </header>
            <section className="detail-content">
              <div className="detail-metrics">
                <div><small>Source</small><b>{sel.source}</b></div>
                <div><small>Restaurant</small><b>{sel.rest}</b></div>
                <div><small>Raised</small><b>{sel.time}</b></div>
              </div>
              <p style={{ marginTop: 18, lineHeight: 1.5 }}>{sel.body}</p>
              {sel.status === "Open" && (
                <div className="wizard-actions">
                  <button className="quiet" onClick={() => setSel(null)}>Cancel</button>
                  <button className="gold-button" onClick={() => { show(`Resolved: ${sel.subject} (prototype)`); setSel(null); }}>Resolve ticket</button>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
