import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { studioMenusList, studioMenuCreate, studioMenuDuplicate, studioMenuDelete, type MenuListRow } from "@/lib/studio-api";
import { shortDate } from "@/lib/owner-api";
import "../owner-studio.css";

const TITLE = "Menu Studio";

type RestaurantRow = { id: string; name: string; city: string | null };

export const Route = createFileRoute("/admin/menus/studio/")({
  validateSearch: (s: Record<string, unknown>): { restaurant?: string } => ({
    restaurant: typeof s.restaurant === "string" && s.restaurant ? s.restaurant : undefined,
  }),
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }] }),
  component: Page,
});

function Page() {
  const { restaurant } = Route.useSearch();
  return (
    <AdminLayout title={TITLE}>
      {restaurant ? <MenusForRestaurant restaurantId={restaurant} /> : <RestaurantPicker />}
    </AdminLayout>
  );
}

function RestaurantPicker() {
  const { staff } = useAuth();
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["studio_admin_restaurants", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<RestaurantRow[]> => {
      const { data, error } = await supabase.from("admin_restaurant_directory").select("id,name,city").order("name");
      if (error) throw error;
      return (data ?? []) as RestaurantRow[];
    },
  });
  const rows = (data ?? []).filter((r) => `${r.name} ${r.city ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Menu Studio</h2>
          <p>Pick a restaurant to build and theme the menu its diners see when they scan a table. Same builder the restaurant owner uses.</p>
        </div>
      </section>
      <div className="member-toolbar">
        <div className="search-field"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurants" /></div>
      </div>
      {isLoading ? (
        <div className="detail-note"><span>Loading restaurants…</span></div>
      ) : error ? (
        <div className="detail-note"><span>Couldn't load restaurants: {(error as any).message}</span></div>
      ) : rows.length === 0 ? (
        <div className="detail-note"><span>No restaurants found.</span></div>
      ) : (
        <div className="st-menus-grid">
          {rows.map((r) => (
            <Link key={r.id} className="st-menu-card" to="/admin/menus/studio" search={{ restaurant: r.id }} style={{ textDecoration: "none", color: "inherit" }}>
              <h3>{r.name}</h3>
              <span className="st-meta">{r.city ?? "—"}</span>
              <div className="st-card-actions"><span className="gold-button">Open Menu Studio</span></div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function MenusForRestaurant({ restaurantId }: { restaurantId: string }) {
  const { staff } = useAuth();
  const { toast, show } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const restaurantQ = useQuery({
    queryKey: ["studio_admin_restaurant_name", restaurantId, staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<RestaurantRow | null> => {
      const { data } = await supabase.from("admin_restaurant_directory").select("id,name,city").eq("id", restaurantId).maybeSingle();
      return (data ?? null) as RestaurantRow | null;
    },
  });
  const rname = restaurantQ.data?.name ?? "restaurant";

  const { data, isLoading, error, refetch } = useQuery<MenuListRow[]>({
    queryKey: ["studio_admin_menus", restaurantId],
    enabled: !!staff,
    refetchOnWindowFocus: false,
    queryFn: () => studioMenusList(restaurantId),
  });

  const create = async () => {
    const nm = window.prompt("Name this menu (e.g. Food Menu, Drinks, Brunch):", "");
    if (nm == null) return;
    if (!nm.trim()) { show("Give the menu a name"); return; }
    setBusy(true);
    try {
      const tree = await studioMenuCreate(nm.trim(), "manual", restaurantId);
      show("Menu created");
      navigate({ to: "/admin/menus/studio/$menuId", params: { menuId: tree.menu.id } });
    } catch (e: any) { show("Could not create menu: " + (e?.message ?? "error")); }
    finally { setBusy(false); }
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
          <h2>{rname} · Menus</h2>
          <p>Build and theme the menus diners see at {rname}. <Link to="/admin/menus/studio" search={{ restaurant: undefined }} style={{ textDecoration: "underline" }}>Change restaurant</Link></p>
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
          <p style={{ color: "#8a857c", margin: "0 0 18px" }}>Create the first menu for {rname} to start adding sections and dishes.</p>
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
                <Link className="gold-button" to="/admin/menus/studio/$menuId" params={{ menuId: m.id }}>Open editor</Link>
                <button className="outline-button" onClick={() => duplicate(m.id)} disabled={busy}>Duplicate</button>
                <button className="quiet" onClick={() => remove(m)} disabled={busy}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast text={toast} />
    </>
  );
}
