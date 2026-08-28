import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const TITLE = "Subscribers";
export const Route = createFileRoute("/admin/subscribers")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type Row = { key: string; name: string; contact: string; source: string; consent: string; member: string; joined: string; phone?: string; lead?: boolean; leadId?: string };
const COLS = "1.7fr 1.2fr 1fr 1fr .9fr 22px";
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Row | null>(null);
  useEscape(() => setSel(null));

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscribers", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<Row[]> => {
      const [subs, leads] = await Promise.all([
        supabase.from("admin_subscriber_directory").select("*").order("created_at", { ascending: false }),
        supabase.from("admin_marketing_leads").select("*").eq("kind", "subscriber").order("created_at", { ascending: false }),
      ]);
      if (subs.error) throw subs.error;
      if (leads.error) throw leads.error;
      const leadRows: Row[] = (leads.data ?? []).map((l: any) => ({
        key: "lead-" + l.id, name: l.name || l.email, contact: l.email,
        source: l.source ? "Website · " + l.source.replace(/^.*?:\s*/, "") : "Website signup",
        consent: "Newsletter opt-in", member: l.status === "archived" ? "Archived" : "Not converted", joined: dateOf(l.created_at), lead: true, leadId: l.id,
      }));
      const subRows: Row[] = (subs.data ?? []).map((s: any) => ({
        key: "sub-" + s.id, name: s.first_name || s.phone, contact: s.phone, source: "Klown Pay checkout",
        consent: s.marketing_consent ? "Marketing opted in" : s.rewards_consent ? "Rewards only" : "Receipt only",
        member: s.is_member ? "Member" : "Not converted", joined: dateOf(s.created_at), phone: s.phone,
      }));
      return [...leadRows, ...subRows];
    },
  });

  const convert = useMutation({
    mutationFn: async (r: Row) => {
      if (!r.phone) throw new Error("Website signups have no phone to convert.");
      const { error } = await supabase.from("member_profiles").upsert({ phone: r.phone, first_name: r.name, tier: "member" }, { onConflict: "phone" });
      if (error) throw error;
    },
    onSuccess: () => { show("Converted to member"); setSel(null); qc.invalidateQueries({ queryKey: ["subscribers"] }); },
    onError: (e: any) => show(e.message),
  });
  const handleLead = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("marketing_leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { show("Updated"); setSel(null); qc.invalidateQueries({ queryKey: ["subscribers"] }); },
    onError: (e: any) => show(e.message),
  });

  const all = data ?? [];
  const rows = all.filter((s) => `${s.name} ${s.contact} ${s.source}`.toLowerCase().includes(q.toLowerCase()));
  const members = all.filter((s) => s.member === "Member").length;

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Subscriber list</h2><p>Live consent + sources. Website newsletter signups from the homepage appear here too.</p></div>
        <button className="gold-button" onClick={() => show("Exported subscribers.csv")}>Export</button>
      </section>
      <div className="member-kpis">
        <div><span>Total subscribers</span><b>{isLoading ? "…" : all.length}</b><small className="green">live</small></div>
        <div><span>Website signups</span><b>{isLoading ? "…" : all.filter((s) => s.lead).length}</b></div>
        <div><span>Converted to members</span><b>{isLoading ? "…" : members}</b></div>
        <div><span>Conversion</span><b>{isLoading || !all.length ? "—" : Math.round((members / all.length) * 100) + "%"}</b></div>
      </div>
      <div className="member-toolbar"><div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subscribers, contact or source" /></div></div>
      <div className="subscriber-table">
        <div className="member-row member-head" style={{ gridTemplateColumns: COLS }}><span>Subscriber</span><span>Source</span><span>Consent</span><span>Member</span><span>Signup date</span><span /></div>
        {isLoading ? <div className="empty-state"><h3>Loading…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : rows.length === 0 ? <div className="empty-state"><h3>No subscribers yet</h3></div>
          : rows.map((s) => (
            <button className="member-row" key={s.key} style={{ gridTemplateColumns: COLS }} onClick={() => setSel(s)}>
              <span className="member-name"><i>{s.name[0]?.toUpperCase()}</i><b>{s.name}</b><small>{s.contact}</small></span>
              <span>{s.source}</span><span>{s.consent}</span>
              <span className={s.member === "Member" ? "healthy" : ""}>{s.member}</span>
              <span>{s.joined}</span><span>→</span>
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
              {!sel.lead && sel.member !== "Member" && <button onClick={() => convert.mutate(sel)} disabled={convert.isPending}>Convert to member <span>›</span></button>}
              {sel.lead && <button onClick={() => handleLead.mutate({ id: sel.leadId!, status: "handled" })} disabled={handleLead.isPending}>Mark handled <span>›</span></button>}
              {sel.lead && <button onClick={() => handleLead.mutate({ id: sel.leadId!, status: "archived" })} disabled={handleLead.isPending}>Archive <span>›</span></button>}
            </div>
            <button className="quiet" onClick={() => setSel(null)}>Cancel</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
