import { supabase } from "@/lib/supabase";

/**
 * Owner portal API — thin typed wrappers over the owner-scoped SECURITY DEFINER
 * RPCs on the shared Klown Pay backend. Every RPC resolves the caller's
 * restaurant server-side from the signed-in session (owner_primary_restaurant()),
 * so the client never sends a restaurant id. Money is in integer pesewas.
 */

// ---- formatting helpers -------------------------------------------------

export function cedis(pesewas?: number | null): string {
  const v = (pesewas ?? 0) / 100;
  return `GH₵${v.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function cedisShort(pesewas?: number | null): string {
  const v = (pesewas ?? 0) / 100;
  if (Math.abs(v) >= 1000) return `GH₵${(v / 1000).toLocaleString("en-GH", { maximumFractionDigits: 1 })}k`;
  return `GH₵${v.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
}

export function titleCase(s?: string | null): string {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function methodLabel(m?: string | null): string {
  const key = (m ?? "").toLowerCase();
  const map: Record<string, string> = {
    momo: "Mobile Money",
    mobile_money: "Mobile Money",
    card: "Card",
    klown_points: "Klown Points",
    points: "Klown Points",
    cash: "Cash",
  };
  return map[key] ?? titleCase(m);
}

export function relTime(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

export function shortDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

// ---- types --------------------------------------------------------------

export type OwnerContext = {
  restaurant_id: string;
  name: string;
  city: string | null;
  role: string | null;
  google_place_id: string | null;
} | null;

export type OwnerBranding = {
  restaurant_id: string;
  name: string;
  logo_url: string | null;
  hero_url: string | null;
  accent_color: string | null;
  tagline_top: string | null;
  tagline_bottom: string | null;
  welcome_copy: string | null;
};

export type PaymentsSummary = {
  days: number;
  volume_pesewas: number;
  tips_pesewas: number;
  txn_count: number;
  avg_bill_pesewas: number;
  by_method: { method: string; pesewas: number; count: number }[];
  daily: { day: string; pesewas: number }[];
} | null;

export type RecentPayment = {
  created_at: string;
  table_label: string | null;
  method: string | null;
  status: string | null;
  provider_ref: string | null;
  amount_pesewas: number;
  tip_pesewas: number;
  total_pesewas: number;
};

export type Integrations = {
  google_place_id: string | null;
  pos: { provider: string; status: string | null; health: string | null; last_sync_at: string | null; branch: string | null }[];
  connectors: { provider: string; name: string | null; active: boolean; last_seen_at: string | null }[];
} | null;

export type SettledPayment = {
  id: string;
  reference: string | null;
  method: string | null;
  table_label: string | null;
  amount_pesewas: number;
  tip_pesewas: number;
  total_pesewas: number;
  created_at: string;
};

export type Settlement = {
  connected: boolean;
  bank_name: string | null;
  account_name: string | null;
  masked: string | null;
  fee_bps: number;
  settled_30d_pesewas: number;
  payments_30d: number;
  settled_all_pesewas: number;
  last_payment_at: string | null;
  recent: SettledPayment[];
} | null;

export type Ticket = {
  ref: string;
  category: string;
  priority: string;
  subject: string;
  status: string;
  created_at: string;
};

// ---- rpc plumbing -------------------------------------------------------

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args as any);
  if (error) throw error;
  return data as T;
}

export const ownerContext = () => rpc<OwnerContext>("owner_context");
export const ownerPaymentsSummary = (days = 14) => rpc<PaymentsSummary>("owner_payments_summary", { p_days: days });
export const ownerRecentPayments = (limit = 12) => rpc<RecentPayment[]>("owner_recent_payments", { p_limit: limit });
export const ownerSplitBills = (days = 30) => rpc<any[]>("owner_split_bills", { p_days: days }).then((d) => d ?? []);
export const adminSplitBills = (restaurantId: string | null, days = 30) =>
  rpc<any[]>("admin_split_bills", { p_days: days, p_restaurant_id: restaurantId }).then((d) => d ?? []);

export type OrderItem = { name: string; qty: number; pesewas: number };
export type OwnerOrder = {
  created_at: string;
  restaurant: string;
  location: string;
  server: string | null;
  method: string | null;
  status: string;
  ref: string | null;
  amount_pesewas: number;
  tip_pesewas: number;
  total_pesewas: number;
  klown_fee_pesewas: number | null;
  items: OrderItem[];
};
export const ownerOrders = (from?: string | null, to?: string | null, limit = 500) =>
  rpc<OwnerOrder[]>("owner_orders", { p_from: from ?? null, p_to: to ?? null, p_limit: limit });
export const ownerIntegrations = () => rpc<Integrations>("owner_integrations");
export const ownerBranding = () => rpc<OwnerBranding>("owner_branding");
export const ownerSettlement = () => rpc<Settlement>("owner_settlement");
export const ownerTickets = () => rpc<Ticket[]>("owner_tickets");

export const ownerSaveBranding = (b: {
  logo_url: string | null;
  hero_url: string | null;
  accent_color: string | null;
  tagline_top: string | null;
  tagline_bottom: string | null;
  welcome_copy: string | null;
}) =>
  rpc<OwnerBranding>("owner_save_branding", {
    p_logo_url: b.logo_url,
    p_hero_url: b.hero_url,
    p_accent_color: b.accent_color,
    p_tagline_top: b.tagline_top,
    p_tagline_bottom: b.tagline_bottom,
    p_welcome_copy: b.welcome_copy,
  });

export const ownerNotifyPhones = () => rpc<{ phones: string[] }>("owner_notify_phones");
export const ownerSaveNotifyPhones = (phones: string[]) => rpc<{ phones: string[] }>("owner_save_notify_phones", { p_phones: phones });

// ---- Settings: profile + team ----
export type OwnerProfile = { restaurant_id: string; name: string; city: string | null; contact_phone: string | null; address: string | null };
export const ownerProfile = () => rpc<OwnerProfile>("owner_profile");
export const ownerSaveProfile = (p: { name: string; city: string; contact_phone: string; address: string }) =>
  rpc<OwnerProfile>("owner_save_profile", { p_name: p.name, p_city: p.city, p_contact_phone: p.contact_phone, p_address: p.address });

export type TeamMember = { email: string; role: string; status: "active" | "invited"; linked: boolean; created_at: string; is_self: boolean };
export const ownerTeam = () => rpc<TeamMember[]>("owner_team");
export const ownerInviteMember = (email: string, role = "owner") =>
  rpc<{ ok: boolean; status: string; email?: string; role?: string }>("owner_invite_member", { p_email: email, p_role: role });
export const ownerRemoveMember = (email: string) => rpc<{ ok: boolean }>("owner_remove_member", { p_email: email });

export const ownerCreateTicket = (t: { category: string; priority: string; subject: string; body: string }) =>
  rpc<{ ref: string; status: string }>("owner_create_ticket", {
    p_category: t.category,
    p_priority: t.priority,
    p_subject: t.subject,
    p_body: t.body,
  });

/** Upload a branding image to the shared `branding` bucket under the owner's
 * restaurant folder (the storage RLS policy only allows this path). Returns the
 * public URL. */
export async function uploadBrandingImage(restaurantId: string, kind: "logo" | "hero", file: File): Promise<string> {
  const nameExt = file.name.split(".").pop();
  const ext = nameExt && nameExt.length <= 5 ? nameExt.toLowerCase() : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/svg+xml" ? "svg" : "jpg";
  const path = `${restaurantId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("branding").getPublicUrl(path);
  return data.publicUrl;
}


// ---- reviews / guest feedback -------------------------------------------

export type OwnerReview = {
  id: string;
  rating: number;
  comment: string | null;
  sentiment: string | null;
  created_at: string;
  table_label: string | null;
};
export type ReviewsSummary = {
  days: number;
  total: number;
  avg_rating: number;
  low_count: number;
  high_count: number;
};
export const ownerReviews = (limit = 100) =>
  rpc<OwnerReview[]>("owner_reviews", { p_limit: limit }).then((d) => d ?? []);
export const ownerReviewsSummary = (days = 30) =>
  rpc<ReviewsSummary>("owner_reviews_summary", { p_days: days });
