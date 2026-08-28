import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { titleCase } from "@/lib/format";

const TITLE = "Support";
export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type T = { key: string; id: string; subject: string; category: string; source: string; rest: string; status: string; body?: string; email?: string; time: string; lead?: boolean };
const COLS = "1.7fr 1fr 1fr 1fr 22px";
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [sel, setSel] = useState<T | null>(null);
  useEscape(() => setSel(null));

  const { data, isLoading, error } = useQuery({
    queryKey: ["support", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<T[]> => {
      const [queue, leads] = await Promise.all([
        supabase.from("admin_support_queue").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("admin_marketing_leads").select("*").eq("kind", "contact").order("created_at", { ascending: false }),
      ]);
      if (queue.error) throw queue.error;
      if (leads.error) throw leads.error;
      const leadT: T[] = (leads.data ?? []).map((l: any) => ({
        key: "lead-" + l.id, id: l.id, subject: l.name ? "Enquiry — " + l.name : "Website enquiry",
        category: l.source ? l.source.replace(/^.*?:\s*/, "") : "Website enquiry", source: "Website",
        rest: "—", status: l.status === "new" ? "Open" : titleCase(l.status), body: l.message, email: l.email, time: fmt(l.created_at), lead: true,
      }));
      const queueT: T[] = (queue.data ?? []).map((r: any) => ({
        key: "q-" + r.id, id: r.id, subject: r.subject, category: r.category, source: r.source === "dispute" ? "Bill dispute" : "Waiter request",
        rest: r.restaurant_name ?? "—", status: titleCase(r.status), time: fmt(r.created_at),
      }));
      return [...leadT, ...queueT];
    },
  });

  const resolve = useMutation({
    mutationFn: async (t: T) => {
      if (t.lead) { const { error } = await supabase.from("marketing_leads").update({ status: "handled" }).eq("id", t.id); if (error) throw error; }
      else throw new Error("Resolving diner tickets isn't wired in this test yet.");
    },
    onSuccess: () => { show("Resolved"); setSel(null); qc.invalidateQueries({ queryKey: ["support"] }); },
    onError: (e: any) => show(e.message),
  });

  const all = data ?? [];
  const open = all.filter((t) => !["resolved", "handled", "archived"].includes(t.status.toLowerCase()));
  const resolvedish = (s: string) => ["resolved", "handled", "archived"].includes(s.toLowerCase());

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro"><div><h2>Support centre</h2><p>Live queue: bill disputes, waiter requests and website enquiries from the homepage.</p></div></section>
      <div className="member-kpis">
        <div><span>Open tickets</span><b>{isLoading ? "…" : open.length}</b></div>
        <div><span>Bill disputes</span><b>{isLoading ? "…" : all.filter((t) => t.category === "Bill dispute" || t.source === "Bill dispute").length}</b></div>
        <div><span>Waiter requests</span><b>{isLoading ? "…" : all.filter((t) => t.source === "Waiter request").length}</b></div>
        <div><span>Website enquiries</span><b>{isLoading ? "…" : all.filter((t) => t.lead).length}</b></div>
      </div>
      <div className="restaurant-table" style={{ marginTop: 12 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 760 }}><span>Subject</span><span>Category</span><span>Source</span><span>Status</span><span /></div>
        {isLoading ? <div className="empty-state"><h3>Loading…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : all.length === 0 ? <div className="empty-state"><h3>Queue is clear</h3><p>No disputes, waiter requests or enquiries right now.</p></div>
          : all.map((t) => (
            <button className="restaurant-table-row" key={t.key} style={{ gridTemplateColumns: COLS, minWidth: 760, width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #e7e2da", background: "transparent", cursor: "pointer" }} onClick={() => setSel(t)}>
              <span><b>{t.subject}</b><small>{t.time}{t.rest !== "—" ? " · " + t.rest : ""}</small></span>
              <span>{t.category}</span><span>{t.source}</span>
              <span><em className={resolvedish(t.status) ? "healthy" : "issue"} style={{ fontStyle: "normal" }}>{t.status}</em></span><span>›</span>
            </button>
          ))}
      </div>
      {sel && (
        <div className="ops-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="detail-drawer">
            <header><div><span className="panel-kicker">Support · {sel.category}</span><h2>{sel.subject}</h2><span className={"status-pill" + (resolvedish(sel.status) ? " live" : "")}>{sel.status}</span></div><button onClick={() => setSel(null)}>✕</button></header>
            <section className="detail-content">
              <div className="detail-metrics">
                <div><small>Source</small><b>{sel.source}</b></div>
                {sel.email ? <div><small>Email</small><b>{sel.email}</b></div> : <div><small>Restaurant</small><b>{sel.rest}</b></div>}
                <div><small>Raised</small><b>{sel.time}</b></div>
              </div>
              {sel.body && <p style={{ marginTop: 18, lineHeight: 1.5 }}>{sel.body}</p>}
              {!resolvedish(sel.status) && <div className="wizard-actions"><button className="quiet" onClick={() => setSel(null)}>Cancel</button><button className="gold-button" onClick={() => resolve.mutate(sel)} disabled={resolve.isPending}>{sel.lead ? "Mark handled" : "Resolve ticket"}</button></div>}
            </section>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
