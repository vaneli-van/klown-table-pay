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

export type PayoutSettings = {
  restaurant_id: string;
  schedule: string;
  min_payout_pesewas: number | null;
  available_pesewas: number | null;
  pending_pesewas: number | null;
  payout_fee_pesewas: number | null;
  updated_at: string | null;
} | null;

export type PayoutAccount = {
  id: string;
  destination_type: string;
  provider: string | null;
  account_number: string | null;
  account_name: string | null;
  branch: string | null;
  masked: string | null;
  is_default: boolean;
  verification_status: string | null;
};

export type Payout = {
  reference: string;
  amount_pesewas: number;
  destination: string | null;
  status: string;
  scheduled_for: string | null;
  paid_at: string | null;
  created_at: string;
};

export type Payouts = {
  settings: PayoutSettings;
  accounts: PayoutAccount[];
  payouts: Payout[];
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
export const ownerIntegrations = () => rpc<Integrations>("owner_integrations");
export const ownerBranding = () => rpc<OwnerBranding>("owner_branding");
export const ownerPayouts = () => rpc<Payouts>("owner_payouts");
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

export const ownerSaveBank = (a: {
  destination_type: string;
  provider: string | null;
  account_number: string | null;
  account_name: string | null;
  branch: string | null;
}) =>
  rpc<Payouts>("owner_save_bank", {
    p_destination_type: a.destination_type,
    p_provider: a.provider,
    p_account_number: a.account_number,
    p_account_name: a.account_name,
    p_branch: a.branch,
  });

export const ownerSetSchedule = (schedule: string) => rpc<Payouts>("owner_set_schedule", { p_schedule: schedule });

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
