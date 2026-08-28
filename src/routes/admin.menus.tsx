import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast, useEscape } from "@/components/prototype";

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

type Menu = { id: string; name: string; rest: string; source: string; categories: number; items: number; sync: string; health: "Healthy" | "Stale" | "Offline"; status: "Published" | "Needs review" | "Draft" };
const MENUS: Menu[] = [
  { id: "kozo", name: "Kozo Menu", rest: "Kozo", source: "Odoo", categories: 33, items: 307, sync: "2 min ago", health: "Healthy", status: "Published" },
  { id: "aya", name: "AYA Menu", rest: "AYA", source: "SambaPOS", categories: 21, items: 184, sync: "11 min ago", health: "Healthy", status: "Published" },
  { id: "pablo", name: "Saint Pablo Menu", rest: "Saint Pablo", source: "Odoo", categories: 18, items: 168, sync: "25 min ago", health: "Healthy", status: "Published" },
  { id: "bistro", name: "Bistro 22 Menu", rest: "Bistro 22", source: "Omega", categories: 14, items: 96, sync: "1 hr ago", health: "Stale", status: "Needs review" },
  { id: "skybar", name: "SkyBar 25 Menu", rest: "SkyBar 25", source: "Manual", categories: 9, items: 61, sync: "—", health: "Offline", status: "Draft" },
];
const COLS = "1.5fr 1fr .8fr 1fr .9fr 120px";

function Page() {
  const { toast, show } = useToast();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Menu | null>(null);
  useEscape(() => setSel(null));
  const rows = MENUS.filter((m) => `${m.name} ${m.rest} ${m.source}`.toLowerCase().includes(q.toLowerCase()));
  const setStatus = (s: string) => { show(`${sel?.name} → ${s} (prototype)`); setSel(null); };

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Menu directory</h2><p>Every restaurant's live menu, its POS source and publish state. Prototype.</p></div>
        <button className="gold-button" onClick={() => show("Sync all menus queued (prototype)")}>Sync all</button>
      </section>

      <div className="member-kpis">
        <div><span>Menus</span><b>5</b><small>Live</small></div>
        <div><span>Published</span><b>3</b><small className="green">visible to diners</small></div>
        <div><span>Needs review</span><b>1</b></div>
        <div><span>Total items</span><b>816</b></div>
      </div>

      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menus, restaurants or source" /></div>
      </div>

      <div className="restaurant-table">
        <div className="restaurant-table-head" style={{ gridTemplateColumns: COLS, minWidth: 860 }}>
          <span>Menu</span><span>Source</span><span>Items</span><span>Sync health</span><span>Status</span><span />
        </div>
        {rows.length === 0 ? (
          <div className="empty-state"><h3>No menus found</h3><p>Try a different search.</p></div>
        ) : rows.map((m) => (
          <div className="restaurant-table-row" key={m.id} style={{ gridTemplateColumns: COLS, minWidth: 860 }}>
            <button className="restaurant-name" onClick={() => setSel(m)}>
              <span className="restaurant-logo">{m.rest[0]}</span>
              <span><b>{m.name}</b><small>{m.rest} · {m.categories} categories</small></span>
            </button>
            <span>{m.source}</span>
            <span>{m.items}</span>
            <span className={m.health === "Healthy" ? "healthy" : m.health === "Stale" ? "issue" : "offline"}>● {m.health}<small>{m.sync}</small></span>
            <span><span className={m.status === "Published" ? "status-pill live" : "status-pill"}>{m.status}</span></span>
            <span><button className="outline-button" onClick={() => setSel(m)}>Manage</button></span>
          </div>
        ))}
      </div>
      <div className="pagination"><span>Showing 1–{rows.length} of {MENUS.length}</span><div><button>‹</button><button>›</button></div></div>

      {sel && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="confirm-box">
            <button onClick={() => setSel(null)}>✕</button>
            <span className="panel-kicker">Menu · {sel.source}</span>
            <h3>{sel.name}</h3>
            <p>{sel.rest} · {sel.categories} categories · {sel.items} items · last synced {sel.sync}.</p>
            <div className="action-list">
              <button onClick={() => setStatus("Published")}>Publish <span>›</span></button>
              <button onClick={() => setStatus("Needs review")}>Mark needs review <span>›</span></button>
              <button onClick={() => setStatus("Draft")}>Move to draft <span>›</span></button>
              <button onClick={() => { show(`Re-synced ${sel.name} (prototype)`); setSel(null); }}>Re-sync from {sel.source} <span>›</span></button>
            </div>
            <button className="quiet" onClick={() => setSel(null)}>Cancel</button>
          </div>
        </div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
