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
