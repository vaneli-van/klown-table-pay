import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { titleCase, relTime } from "@/lib/format";

const TITLE = "Menus";

export const Route = createFileRoute("/admin/menus")({
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

type MenuRow = {
  id: string; name: string; pos_source: string | null; sync_health: string | null; status: string | null;
  last_synced_at: string | null; restaurant_name: string; city: string | null; categories: number; items: number;
};
const COLS = "1.5fr 1fr .8fr 1fr .9fr 120px";

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<MenuRow | null>(null);
  useEscape(() => setSel(null));

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_menu_directory", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<MenuRow[]> => {
      const { data, error } = await supabase.from("admin_menu_directory").select("*").order("restaurant_name");
      if (error) throw error;
      return (data ?? []) as MenuRow[];
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("menus").update({ status, last_synced_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { show(`Menu set to ${titleCase(v.status)}`); setSel(null); qc.invalidateQueries({ queryKey: ["admin_menu_directory"] }); },
    onError: (e: any) => show(e.message ?? "Update failed"),
  });

  const rows = (data ?? []).filter((m) => `${m.name} ${m.restaurant_name} ${m.pos_source}`.toLowerCase().includes(q.toLowerCase()));
  const published = (data ?? []).filter((m) => m.status === "published").length;
  const review = (data ?? []).filter((m) => m.status === "needs_review").length;
  const totalItems = (data ?? []).reduce((s, m) => s + (m.items || 0), 0);

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Menu directory</h2><p>Live menus from each restaurant's POS. Reading your shared Klown Pay backend.</p></div>
        <button className="gold-button" onClick={() => show("Sync all menus queued")}>Sync all</button>
      </section>

      <div className="member-kpis">
        <div><span>Menus</span><b>{isLoading ? "…" : (data?.length ?? 0)}</b><small className="green">Live</small></div>
        <div><span>Published</span><b>{isLoading ? "…" : published}</b><small className="green">visible to diners</small></div>
        <div><span>Needs review</span><b>{isLoading ? "…" : review}</b></div>
        <div><span>Total items</span><b>{isLoading ? "…" : totalItems.toLocaleString("en-GH")}</b></div>
      </div>

      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menus, restaurants or source" /></div>
      </div>

      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 860 }}>
          <span>Menu</span><span>Source</span><span>Items</span><span>Sync health</span><span>Status</span><span />
        </div>
        {isLoading ? (
          <div className="empty-state"><h3>Loading menus…</h3><p>Reading admin_menu_directory.</p></div>
        ) : error ? (
          <div className="empty-state"><h3>Couldn't load menus</h3><p>{(error as any).message}</p></div>
        ) : rows.length === 0 ? (
          <div className="empty-state"><h3>No menus found</h3><p>Try a different search.</p></div>
        ) : rows.map((m) => (
          <div className="restaurant-table-row" key={m.id} style={{ gridTemplateColumns: COLS, minWidth: 860 }}>
            <button className="restaurant-name" onClick={() => setSel(m)}>
              <span className="restaurant-logo">{m.restaurant_name?.[0] ?? "K"}</span>
              <span><b>{m.name}</b><small>{m.restaurant_name} · {m.categories} categories</small></span>
            </button>
            <span>{m.pos_source ?? "Manual"}</span>
            <span>{m.items}</span>
            <span className={m.sync_health === "healthy" ? "healthy" : m.sync_health === "offline" ? "offline" : "issue"}>● {titleCase(m.sync_health) || "—"}<small>{relTime(m.last_synced_at)}</small></span>
            <span><span className={m.status === "published" ? "status-pill live" : "status-pill"}>{titleCase(m.status) || "Draft"}</span></span>
            <span><button className="outline-button" onClick={() => setSel(m)}>Manage</button></span>
          </div>
        ))}
      </div>

      {sel && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="confirm-box">
            <button onClick={() => setSel(null)}>✕</button>
            <span className="panel-kicker">Menu · {sel.pos_source ?? "Manual"}</span>
            <h3>{sel.name}</h3>
            <p>{sel.restaurant_name} · {sel.categories} categories · {sel.items} items · synced {relTime(sel.last_synced_at)}.</p>
            <div className="action-list">
              <button onClick={() => mutate.mutate({ id: sel.id, status: "published" })} disabled={mutate.isPending}>Publish <span>›</span></button>
              <button onClick={() => mutate.mutate({ id: sel.id, status: "needs_review" })} disabled={mutate.isPending}>Mark needs review <span>›</span></button>
              <button onClick={() => mutate.mutate({ id: sel.id, status: "draft" })} disabled={mutate.isPending}>Move to draft <span>›</span></button>
            </div>
            <button className="quiet" onClick={() => setSel(null)}>Cancel</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
