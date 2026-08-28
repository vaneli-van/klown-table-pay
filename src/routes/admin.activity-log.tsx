import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { relTime } from "@/lib/format";

const TITLE = "Activity Log";
export const Route = createFileRoute("/admin/activity-log")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});
type L = { id: string; actor_name: string | null; action: string; record_type: string | null; record_label: string | null; created_at: string };
const COLS = "1fr 1.2fr 1.8fr .7fr";

function Page() {
  const { staff } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["activity_log", staff?.id], enabled: !!staff,
    queryFn: async (): Promise<L[]> => {
      const { data, error } = await supabase.from("activity_log").select("id,actor_name,action,record_type,record_label,created_at").order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return (data ?? []) as L[];
    },
  });
  const all = data ?? [];
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro"><div><h2>Activity log</h2><p>An immutable record of every privileged action in the console.</p></div></section>
      <div className="restaurant-table" style={{ marginTop: 12 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 760 }}><span>Actor</span><span>Action</span><span>Record</span><span>When</span></div>
        {isLoading ? <div className="empty-state"><h3>Loading…</h3></div>
          : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any).message}</p></div>
          : all.length === 0 ? <div className="empty-state"><h3>No activity yet</h3><p>Privileged actions (refunds, invites, status changes) will be recorded here.</p></div>
          : all.map((l) => (
            <div className="restaurant-table-row" key={l.id} style={{ gridTemplateColumns: COLS, minWidth: 760 }}>
              <span className="restaurant-name" style={{ cursor: "default" }}><span className="restaurant-logo">{(l.actor_name || "?")[0]}</span><span><b>{l.actor_name ?? "System"}</b></span></span>
              <span>{l.action}</span><span>{l.record_label ?? l.record_type ?? "—"}</span><span>{relTime(l.created_at)}</span>
            </div>
          ))}
      </div>
    </AdminLayout>
  );
}
