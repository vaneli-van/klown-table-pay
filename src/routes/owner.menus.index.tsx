import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import {
  studioMenusList, studioMenuCreate, studioMenuDuplicate, studioMenuDelete,
  type MenuListRow,
} from "@/lib/studio-api";
import { shortDate } from "@/lib/owner-api";
import "../owner-studio.css";

const TITLE = "Menu Studio";

export const Route = createFileRoute("/owner/menus/")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Build and theme your restaurant's menus." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <MenusBody />
    </OwnerLayout>
  ),
});

function MenusBody() {
  const { name, show } = useOwner();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<MenuListRow[]>({
    queryKey: ["studio_menus"],
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: studioMenusList,
  });

  const create = async () => {
    const nm = window.prompt("Name this menu (e.g. Food Menu, Drinks, Brunch):", "");
    if (nm == null) return;
    if (!nm.trim()) { show("Give the menu a name"); return; }
    setBusy(true);
    try {
      const tree = await studioMenuCreate(nm.trim());
      show("Menu created");
      navigate({ to: "/owner/menus/$menuId", params: { menuId: tree.menu.id } });
    } catch (e: any) {
      show("Could not create menu: " + (e?.message ?? "error"));
    } finally { setBusy(false); }
  };

  const duplicate = async (id: string) => {
    setBusy(true);
    try { await studioMenuDuplicate(id); show("Menu duplicated"); refetch(); }
    catch (e: any) { show("Could not duplicate: " + (e?.message ?? "error")); }
    finally { setBusy(false); }
  };

  const remove = async (m: MenuListRow) => {
    if (!window.confirm(`Delete "${m.name}"? This removes all its sections and items and cannot be undone.`)) return;
    setBusy(true);
    try { await studioMenuDelete(m.id); show("Menu deleted"); refetch(); }
    catch (e: any) { show("Could not delete: " + (e?.message ?? "error")); }
    finally { setBusy(false); }
  };

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Menus</h2>
          <p>Build and theme the menus your diners see at {name}. Each menu is hand-built or seeded from your POS, then styled and published.</p>
        </div>
        <button className="gold-button" onClick={create} disabled={busy}>New menu</button>
      </section>

      {isLoading ? (
        <div className="detail-note"><span>Loading menus…</span></div>
      ) : error ? (
        <div className="detail-note"><span>Couldn't load menus: {(error as any).message}</span></div>
      ) : !data || data.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: 40 }}>
          <h3 style={{ margin: "0 0 8px" }}>No menus yet</h3>
          <p style={{ color: "#8a857c", margin: "0 0 18px" }}>Create your first menu to start adding sections and dishes.</p>
          <button className="gold-button" onClick={create} disabled={busy}>Create a menu</button>
        </div>
      ) : (
        <div className="st-menus-grid">
          {data.map((m) => (
            <div className="st-menu-card" key={m.id}>
              <div className="st-badges">
                <span className={"st-badge " + (m.status === "live" ? "live" : "")}>{m.status === "live" ? "Live" : "Draft"}</span>
                {m.source === "pos" && <span className="st-badge pos">POS</span>}
              </div>
              <h3>{m.name}</h3>
              <span className="st-meta">{m.section_count} section{m.section_count === 1 ? "" : "s"} · {m.item_count} item{m.item_count === 1 ? "" : "s"} · updated {shortDate(m.updated_at)}</span>
              <div className="st-card-actions">
                <Link className="gold-button" to="/owner/menus/$menuId" params={{ menuId: m.id }}>Open editor</Link>
                <button className="outline-button" onClick={() => duplicate(m.id)} disabled={busy}>Duplicate</button>
                <button className="quiet" onClick={() => remove(m)} disabled={busy}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
