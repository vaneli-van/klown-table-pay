import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

const TITLE = "Subscribers";

export const Route = createFileRoute("/admin/subscribers")({
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

type S = { name: string; contact: string; source: string; consent: string; member: string; joined: string; lead?: boolean };
const SUBS: S[] = [
  { name: "kojo.aidoo@gmail.com", contact: "kojo.aidoo@gmail.com", source: "Website · Footer newsletter", consent: "Newsletter opt-in", member: "Not converted", joined: "26 Aug 2026", lead: true },
  { name: "The Larteh Group", contact: "hello@larteh.gh", source: "Website · Become a partner", consent: "Newsletter opt-in", member: "Not converted", joined: "25 Aug 2026", lead: true },
  { name: "Ama Mensah", contact: "+233 24 118 4420", source: "Klown Pay checkout", consent: "Marketing opted in", member: "Member", joined: "12 Jan 2026" },
  { name: "Kwesi Boateng", contact: "+233 27 904 2213", source: "Klown Pay checkout", consent: "Rewards only", member: "Member", joined: "03 Feb 2026" },
  { name: "Efua Owusu", contact: "+233 55 220 8834", source: "Klown Pay checkout", consent: "Receipt only", member: "Not converted", joined: "18 Mar 2026" },
];
const COLS = "1.7fr 1.2fr 1fr 1fr .9fr 22px";

function Page() {
  const { toast, show } = useToast();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<S | null>(null);
  useEscape(() => setSel(null));
  const rows = SUBS.filter((s) => `${s.name} ${s.contact} ${s.source}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Subscriber list</h2><p>Consent, campaign sources and member conversion. Website newsletter signups appear here too. Prototype.</p></div>
        <button className="gold-button" onClick={() => show("Exported subscribers.csv (prototype)")}>Export</button>
      </section>

      <div className="member-kpis">
        <div><span>Total subscribers</span><b>2,984</b></div>
        <div><span>Marketing opted-in</span><b>2,910</b></div>
        <div><span>Converted to members</span><b>2,140</b></div>
        <div><span>Conversion</span><b>72%</b></div>
      </div>

      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subscribers, contact or source" /></div>
      </div>

      <div className="subscriber-table">
        <div className="member-row member-head" style={{ gridTemplateColumns: COLS }}>
          <span>Subscriber</span><span>Source</span><span>Consent</span><span>Member</span><span>Signup date</span><span />
        </div>
        {rows.map((s, i) => (
          <button className="member-row" key={i} style={{ gridTemplateColumns: COLS }} onClick={() => setSel(s)}>
            <span className="member-name"><i>{s.name[0].toUpperCase()}</i><b>{s.name}</b><small>{s.contact}</small></span>
            <span>{s.source}</span>
            <span>{s.consent}</span>
            <span className={s.member === "Member" ? "healthy" : ""}>{s.member}</span>
            <span>{s.joined}</span>
            <span>→</span>
          </button>
        ))}
      </div>

      {sel && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="confirm-box">
            <button onClick={() => setSel(null)}>✕</button>
            <span className="panel-kicker">{sel.lead ? "Website signup" : "Subscriber"}</span>
            <h3>{sel.name}</h3>
            <p>{sel.contact} · {sel.source}. Joined {sel.joined}.</p>
            <div className="action-list">
              {sel.member !== "Member" && <button onClick={() => { show(`Converted ${sel.name} to member (prototype)`); setSel(null); }}>Convert to member <span>›</span></button>}
              <button onClick={() => { show("Marked handled (prototype)"); setSel(null); }}>Mark handled <span>›</span></button>
              <button onClick={() => { show("Archived (prototype)"); setSel(null); }}>Archive <span>›</span></button>
            </div>
            <button className="quiet" onClick={() => setSel(null)}>Cancel</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
