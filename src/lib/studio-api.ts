import { supabase } from "@/lib/supabase";

/**
 * Menu Studio API — typed wrappers over the owner-scoped SECURITY DEFINER
 * studio_* RPCs on the shared backend. Every mutation returns the fresh full
 * menu tree so the client re-syncs. The caller's restaurant is resolved
 * server-side; the client never sends a restaurant id. Money in integer pesewas.
 */

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args as any);
  if (error) throw error;
  return data as T;
}

// ---- types --------------------------------------------------------------

export type MenuListRow = {
  id: string;
  name: string;
  source: "manual" | "pos";
  status: "draft" | "live";
  currency: string;
  location: string | null;
  updated_at: string;
  section_count: number;
  item_count: number;
};

export type Modifier = { id: string; group_id: string; name: string; price_pesewas: number; available: boolean; sort: number };
export type ModifierGroup = { id: string; item_id: string; name: string; required: boolean; min_select: number; max_select: number; sort: number; modifiers: Modifier[] };

export type StudioItem = {
  id: string;
  section_id: string;
  restaurant_id: string;
  catalogue_item_id: string | null;
  name: string;
  description: string | null;
  extras: string | null;
  price_pesewas: number | null;
  price_display: string | null;
  sizes: { name: string; price_pesewas: number }[];
  available: boolean;
  sold_out: boolean;
  visible: boolean;
  tags: string[];
  symbols: string[];
  dietary_note: string | null;
  sku: string | null;
  pos_id: string | null;
  bin: string | null;
  image_url: string | null;
  alignment: "theme" | "left" | "center" | "right";
  span: boolean;
  price_beside: boolean;
  wrap: boolean;
  box_style: "none" | "soft" | "accent";
  box_accent_color: string | null;
  spacing: "theme" | "custom";
  before_space: number;
  after_space: number;
  prep_time: number | null;
  sort: number;
  modifier_groups: ModifierGroup[];
};

export type StudioSection = {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  nav_label: string | null;
  type: "Title" | "Standard" | "Alternate" | "Alternate 2" | "Subheading";
  columns: number;
  alignment: "theme" | "left" | "center" | "right";
  new_page: boolean;
  span: boolean;
  wrap: boolean;
  pin: boolean;
  accent: "none" | "line" | "fill";
  accent_color: string | null;
  span_accent: boolean;
  spacing: "theme" | "custom";
  before_space: number;
  after_space: number;
  visible: boolean;
  schedule: string | null;
  sort: number;
  items: StudioItem[];
};

export type StudioMenu = {
  id: string;
  restaurant_id: string;
  name: string;
  source: "manual" | "pos";
  status: "draft" | "live";
  currency: string;
  service_charge_pct: number;
  tax_pct: number;
  ordering_enabled: boolean;
  location: string | null;
  updated_at: string;
};

export type StudioTree = {
  menu: StudioMenu;
  theme: any | null;
  digital: any | null;
  sections: StudioSection[];
};

export type CatalogueItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  extras: string | null;
  price_pesewas: number | null;
  price_display: string | null;
  image_url: string | null;
  tags: string[];
  symbols: string[];
  dietary_note: string | null;
  sku: string | null;
  pos_id: string | null;
  used_in: number;
};

export type RevisionRow = { id: string; label: string | null; created_at: string; created_by: string | null };

// ---- menus --------------------------------------------------------------
export const studioMenusList = () => rpc<MenuListRow[]>("studio_menus_list");
export const studioMenuGet = (menuId: string) => rpc<StudioTree>("studio_menu_get", { p_menu_id: menuId });
export const studioMenuCreate = (name: string, source: "manual" | "pos" = "manual") =>
  rpc<StudioTree>("studio_menu_create", { p_name: name, p_source: source });
export const studioMenuUpdate = (menuId: string, patch: Record<string, unknown>) =>
  rpc<StudioTree>("studio_menu_update", { p_menu_id: menuId, p_patch: patch });
export const studioMenuDelete = (menuId: string) => rpc<{ ok: boolean; id: string }>("studio_menu_delete", { p_menu_id: menuId });
export const studioMenuDuplicate = (menuId: string) => rpc<StudioTree>("studio_menu_duplicate", { p_menu_id: menuId });

// ---- sections -----------------------------------------------------------
export const studioSectionUpsert = (menuId: string, section: Record<string, unknown>) =>
  rpc<StudioTree>("studio_section_upsert", { p_menu_id: menuId, p_section: section });
export const studioSectionDelete = (sectionId: string) => rpc<StudioTree>("studio_section_delete", { p_section_id: sectionId });
export const studioSectionsReorder = (menuId: string, ids: string[]) =>
  rpc<StudioTree>("studio_sections_reorder", { p_menu_id: menuId, p_ids: ids });

// ---- items --------------------------------------------------------------
export const studioItemUpsert = (sectionId: string, item: Record<string, unknown>) =>
  rpc<StudioTree>("studio_item_upsert", { p_section_id: sectionId, p_item: item });
export const studioItemDelete = (itemId: string) => rpc<StudioTree>("studio_item_delete", { p_item_id: itemId });
export const studioItemDuplicate = (itemId: string) => rpc<StudioTree>("studio_item_duplicate", { p_item_id: itemId });
export const studioItemsReorder = (sectionId: string, ids: string[]) =>
  rpc<StudioTree>("studio_items_reorder", { p_section_id: sectionId, p_ids: ids });
export const studioItemMove = (itemId: string, toSectionId: string, toIndex: number) =>
  rpc<StudioTree>("studio_item_move", { p_item_id: itemId, p_to_section_id: toSectionId, p_to_index: toIndex });

// ---- catalogue ----------------------------------------------------------
export const studioCatalogueList = () => rpc<CatalogueItem[]>("studio_catalogue_list");
export const studioCatalogueUpsert = (item: Record<string, unknown>) => rpc<CatalogueItem[]>("studio_catalogue_upsert", { p_item: item });
export const studioCatalogueDelete = (id: string) => rpc<CatalogueItem[]>("studio_catalogue_delete", { p_id: id });
export const studioPlaceCatalogueItem = (sectionId: string, catalogueItemId: string) =>
  rpc<StudioTree>("studio_place_catalogue_item", { p_section_id: sectionId, p_catalogue_item_id: catalogueItemId });

// ---- modifiers ----------------------------------------------------------
export const studioModifierGroupUpsert = (itemId: string, group: Record<string, unknown>) =>
  rpc<StudioTree>("studio_modifier_group_upsert", { p_item_id: itemId, p_group: group });
export const studioModifierGroupDelete = (groupId: string) => rpc<StudioTree>("studio_modifier_group_delete", { p_group_id: groupId });
export const studioModifierUpsert = (groupId: string, modifier: Record<string, unknown>) =>
  rpc<StudioTree>("studio_modifier_upsert", { p_group_id: groupId, p_modifier: modifier });
export const studioModifierDelete = (modId: string) => rpc<StudioTree>("studio_modifier_delete", { p_mod_id: modId });

// ---- revisions ----------------------------------------------------------
export const studioRevisionSave = (menuId: string, label?: string | null) =>
  rpc<{ ok: boolean; id: string }>("studio_revision_save", { p_menu_id: menuId, p_label: label ?? null });
export const studioRevisionsList = (menuId: string) => rpc<RevisionRow[]>("studio_revisions_list", { p_menu_id: menuId });
export const studioRevisionRestore = (menuId: string, revisionId: string) =>
  rpc<StudioTree>("studio_revision_restore", { p_menu_id: menuId, p_revision_id: revisionId });

// ---- helpers ------------------------------------------------------------
/** Price display: prefer the explicit display override, else the numeric pesewas as ₵, else blank. */
export function priceText(price_pesewas: number | null | undefined, price_display: string | null | undefined, currency = "GHS"): string {
  if (price_display && price_display.trim()) return price_display.trim();
  if (price_pesewas == null) return "";
  const v = price_pesewas / 100;
  const sym = currency === "GHS" ? "GH₵" : currency + " ";
  return `${sym}${v.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Parse a user-typed price. Returns {pesewas, display}: numeric -> pesewas; non-numeric ("Market") -> display. */
export function parsePrice(input: string): { price_pesewas: number | null; price_display: string | null } {
  const t = (input ?? "").trim();
  if (!t) return { price_pesewas: null, price_display: null };
  const cleaned = t.replace(/[^0-9.]/g, "");
  if (cleaned && /^[0-9]+(\.[0-9]{1,2})?$/.test(cleaned) && !/[a-zA-Z/]/.test(t)) {
    return { price_pesewas: Math.round(parseFloat(cleaned) * 100), price_display: null };
  }
  return { price_pesewas: null, price_display: t };
}

// ---- theme --------------------------------------------------------------
export type ThemeTokens = {
  fonts: { title: string; heading: string; item: string; body: string };
  colors: { ink: string; paper: string; accent: string; heading: string; price: string };
  layout: { columns: 1 | 2; price_leader: "dots" | "none"; item_photos: "none" | "small"; align: "left" | "center" };
};

export const studioThemeSave = (menuId: string, patch: { template_name?: string | null; tokens?: ThemeTokens }) =>
  rpc<StudioTree>("studio_theme_save", { p_menu_id: menuId, p_patch: patch });
export const studioThemeReset = (menuId: string) => rpc<StudioTree>("studio_theme_reset", { p_menu_id: menuId });

export const DEFAULT_TOKENS: ThemeTokens = {
  fonts: { title: "Georgia", heading: "Georgia", item: "Helvetica Neue", body: "Arial" },
  colors: { ink: "#171717", paper: "#f7f5f0", accent: "#f3c744", heading: "#171717", price: "#171717" },
  layout: { columns: 1, price_leader: "dots", item_photos: "small", align: "left" },
};

export const FONT_OPTIONS: { label: string; family: string; google?: string }[] = [
  { label: "Georgia (serif)", family: "Georgia, 'Times New Roman', serif" },
  { label: "Helvetica (sans)", family: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Arial (sans)", family: "Arial, sans-serif" },
  { label: "Playfair Display", family: "'Playfair Display', Georgia, serif", google: "Playfair Display:ital,wght@0,400;0,600;0,700;1,400" },
  { label: "Cormorant Garamond", family: "'Cormorant Garamond', Georgia, serif", google: "Cormorant Garamond:ital,wght@0,400;0,600;0,700;1,400" },
  { label: "EB Garamond", family: "'EB Garamond', Georgia, serif", google: "EB Garamond:ital,wght@0,400;0,600;1,400" },
  { label: "Lora", family: "'Lora', Georgia, serif", google: "Lora:ital,wght@0,400;0,600;1,400" },
  { label: "Fraunces", family: "'Fraunces', Georgia, serif", google: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400" },
  { label: "Inter", family: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;600;700" },
  { label: "Poppins", family: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;600;700" },
  { label: "Montserrat", family: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;600;700" },
  { label: "Space Grotesk", family: "'Space Grotesk', system-ui, sans-serif", google: "Space Grotesk:wght@400;500;700" },
];

export const THEME_TEMPLATES: { name: string; tokens: ThemeTokens }[] = [
  { name: "Klown", tokens: DEFAULT_TOKENS },
  { name: "Editorial", tokens: {
    fonts: { title: "'Playfair Display', Georgia, serif", heading: "'Playfair Display', Georgia, serif", item: "'Lora', Georgia, serif", body: "'Lora', Georgia, serif" },
    colors: { ink: "#2b2622", paper: "#f6f1e7", accent: "#9c6b3f", heading: "#2b2622", price: "#9c6b3f" },
    layout: { columns: 1, price_leader: "dots", item_photos: "small", align: "left" } } },
  { name: "Bistro", tokens: {
    fonts: { title: "'Cormorant Garamond', Georgia, serif", heading: "'Cormorant Garamond', Georgia, serif", item: "'Helvetica Neue', Arial, sans-serif", body: "Arial, sans-serif" },
    colors: { ink: "#1a1a1a", paper: "#ffffff", accent: "#c0392b", heading: "#c0392b", price: "#1a1a1a" },
    layout: { columns: 1, price_leader: "none", item_photos: "none", align: "center" } } },
  { name: "Garden", tokens: {
    fonts: { title: "'Fraunces', Georgia, serif", heading: "'Space Grotesk', system-ui, sans-serif", item: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
    colors: { ink: "#20302a", paper: "#ffffff", accent: "#3f6f4f", heading: "#20302a", price: "#20302a" },
    layout: { columns: 1, price_leader: "none", item_photos: "small", align: "left" } } },
  { name: "Minimal", tokens: {
    fonts: { title: "'Helvetica Neue', Arial, sans-serif", heading: "'Helvetica Neue', Arial, sans-serif", item: "'Helvetica Neue', Arial, sans-serif", body: "Arial, sans-serif" },
    colors: { ink: "#111111", paper: "#ffffff", accent: "#111111", heading: "#111111", price: "#111111" },
    layout: { columns: 1, price_leader: "none", item_photos: "none", align: "left" } } },
];

/** Merge stored tokens (possibly partial) onto defaults so the editor always has a full object. */
export function mergeTokens(t?: any): ThemeTokens {
  const d = DEFAULT_TOKENS;
  return {
    fonts: { ...d.fonts, ...(t?.fonts ?? {}) },
    colors: { ...d.colors, ...(t?.colors ?? {}) },
    layout: { ...d.layout, ...(t?.layout ?? {}) },
  };
}

/** Load the Google-font families used by the templates for accurate previews. */
export function studioFontLinkHref(): string {
  const fams = FONT_OPTIONS.filter((f) => f.google).map((f) => "family=" + encodeURIComponent(f.google!).replace(/%3A/g, ":").replace(/%40/g, "@").replace(/%3B/g, ";").replace(/%2C/g, ",").replace(/%20/g, "+"));
  return "https://fonts.googleapis.com/css2?" + fams.join("&") + "&display=swap";
}

// ---- assets -------------------------------------------------------------
/** Upload an item image to the shared branding bucket under <restaurant_id>/items/ (allowed by the owner storage policy). */
export async function uploadStudioImage(restaurantId: string, file: File): Promise<string> {
  const nameExt = file.name.split(".").pop();
  const ext = nameExt && nameExt.length <= 5 ? nameExt.toLowerCase() : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${restaurantId}/items/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("branding").getPublicUrl(path).data.publicUrl;
}

// ---- POS import (calls the diner-app endpoint that reaches Odoo) ---------
const DINER_API = "https://kozo-pay-guest-app.lovable.app";
export async function studioImportPos(menuId: string): Promise<{ ok: true; sections_added: number; items_added: number; skipped: number; total_products: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${DINER_API}/api/studio/import-pos`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, menuId }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) {
    const reason = j?.reason;
    throw new Error(reason === "no_pos" ? "This restaurant has no active POS connection yet." : (j?.message || reason || "Import failed"));
  }
  return j;
}
