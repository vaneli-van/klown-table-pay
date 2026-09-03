import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerTickets, ownerCreateTicket, relTime, titleCase, type Ticket } from "@/lib/owner-api";

const TITLE = "Support";
const CATEGORIES = ["Payments", "Payouts", "Integrations", "Theme", "Account", "Something else"];
const PRIORITIES = ["low", "normal", "high"];

export const Route = createFileRoute("/owner/support")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Raise a support request with the Klown team and track your tickets." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <SupportBody />
    </OwnerLayout>
  ),
});

function statusClass(s: string) {
  const k = (s || "").toLowerCase();
  if (k === "resolved" || k === "closed") return "status-badge status-success";
  if (k === "open") return "status-badge status-warning";
  return "status-badge";
}

function SupportBody() {
  const { restaurantId, show } = useOwner();
  const qc = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["owner_tickets", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerTickets,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { show("Add a subject for your request"); return; }
    setSaving(true);
    try {
      const res = await ownerCreateTicket({ category, priority, subject: subject.trim(), body: body.trim() });
      show(`Ticket ${res.ref} created — we'll be in touch`);
      setSubject(""); setBody(""); setPriority("normal"); setCategory(CATEGORIES[0]);
      qc.invalidateQueries({ queryKey: ["owner_tickets", restaurantId] });
    } catch (e: any) {
      show("Couldn't create ticket: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Support</h2>
          <p>Raise a request with the Klown team and track your open tickets.</p>
        </div>
      </section>

      <div className="own-theme-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">New request</span><h2>Contact Klown</h2></div></div>
          <form className="own-form" onSubmit={submit}>
            <div className="own-two">
              <div className="own-field">
                <label>Category</label>
                <select className="wide-input" style={{ margin: 0 }} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="own-field">
                <label>Priority</label>
                <select className="wide-input" style={{ margin: 0 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
                </select>
              </div>
            </div>
            <div className="own-field">
              <label>Subject</label>
              <input className="wide-input" style={{ margin: 0 }} value={subject} maxLength={140} placeholder="Short summary" onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="own-field">
              <label>Details</label>
              <textarea className="wide-input" style={{ margin: 0, minHeight: 120 }} value={body} maxLength={2000} placeholder="Tell us what's happening and what you need." onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="own-actions">
              <button className="gold-button" type="submit" disabled={saving}>{saving ? "Sending…" : "Send request"}</button>
            </div>
          </form>
        </div>

        <aside className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">History</span><h2>Your tickets</h2></div></div>
          <div className="connection-list">
            {isLoading ? (
              <div className="empty-state"><h3>Loading…</h3></div>
            ) : tickets.length === 0 ? (
              <div className="empty-state"><h3>No tickets yet</h3><p>Requests you raise appear here with their status.</p></div>
            ) : (
              tickets.map((t) => (
                <div key={t.ref}>
                  <span>
                    <b>{t.subject}</b>
                    <small>{t.ref} · {t.category} · {titleCase(t.priority)} · {relTime(t.created_at)}</small>
                  </span>
                  <span className={statusClass(t.status)}>{titleCase(t.status)}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
