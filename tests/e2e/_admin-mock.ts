import type { Page } from "@playwright/test";

// Shared hermetic-auth helpers for the authenticated Admin Central E2E specs.
// Seed a Supabase session in localStorage and intercept every Supabase call
// with fixtures, so the real logged-in admin UI renders without a live backend.
// admin-auth.spec.ts keeps its own inline copy (it is committed + green); this
// module is the reusable version the area specs build on.

export const REF = "wquezgzkidknryiyaguh";
export const ADMIN_UID = "00000000-0000-4000-8000-000000000001";

function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString("base64url");
}
export function fakeSession() {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days out
  const jwt = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: ADMIN_UID, role: "authenticated", aud: "authenticated", exp })}.sig`;
  return {
    access_token: jwt,
    token_type: "bearer",
    expires_in: 604800,
    expires_at: exp,
    refresh_token: "e2e-refresh",
    user: {
      id: ADMIN_UID,
      aud: "authenticated",
      role: "authenticated",
      email: "admin@test.klown",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}

export const STAFF_SELF = { id: ADMIN_UID, email: "admin@test.klown", name: "E2E Admin", role: "super_admin", status: "active" };

// staff table listing (Staff & Access) — the self row plus two teammates.
export const STAFF_LIST = [
  STAFF_SELF,
  { id: "s-2", email: "ops@test.klown", name: "Ama Ops", role: "operations_admin", status: "active", last_sign_in_at: "2026-09-24T09:00:00Z" },
  { id: "s-3", email: "fin@test.klown", name: "Kofi Finance", role: "finance_admin", status: "invited", last_sign_in_at: null },
];

export const RESTAURANTS = [
  { id: "a7d871e8-cea8-4e1b-bacb-00217239087a", name: "Naxos", city: "Accra", branches: 1, tables: 14, members: 320, volume_pesewas: 66150, pos_provider: "odoo", pos_health: "healthy", pos_status: "live", last_sync_at: "2026-09-25T09:30:00Z" },
  { id: "r-2", name: "Baobab Bistro", city: "Kumasi", branches: 2, tables: 22, members: 140, volume_pesewas: 24000, pos_provider: "sambapos", pos_health: "issue", pos_status: "testing", last_sync_at: "2026-09-20T12:00:00Z" },
];

export const MEMBERS = [
  { phone: "233553190058", first_name: "Yaw", tier: "inner_circle", points: 4200, visits: 18, last_seen: "2026-09-25T08:00:00Z", restaurant_name: "Naxos", created_at: "2026-02-01T00:00:00Z" },
  { phone: "233201234567", first_name: "Efua", tier: "member", points: 320, visits: 3, last_seen: "2026-09-19T20:00:00Z", restaurant_name: "Naxos", created_at: "2026-08-10T00:00:00Z" },
];

export const MENUS = [
  { id: "m-1", name: "Naxos Dinner", pos_source: "Odoo", sync_health: "healthy", status: "published", last_synced_at: "2026-09-25T09:00:00Z", restaurant_name: "Naxos", restaurant_id: "a7d871e8-cea8-4e1b-bacb-00217239087a", city: "Accra", categories: 6, items: 48 },
  { id: "m-2", name: "Baobab Lunch", pos_source: "Sambapos", sync_health: "issue", status: "needs_review", last_synced_at: "2026-09-20T10:00:00Z", restaurant_name: "Baobab Bistro", restaurant_id: "r-2", city: "Kumasi", categories: 4, items: 20 },
];

export const PAYMENTS = [
  { id: "pay-1", method: "momo", status: "captured", total_pesewas: 20000, amount_pesewas: 20000, tip_pesewas: 0, restaurant_name: "Naxos", restaurant_id: "a7d871e8-cea8-4e1b-bacb-00217239087a", table_label: "05", provider_ref: "e2e-aaa111", created_at: "2026-09-18T17:53:00Z" },
];

export const ANALYTICS = {
  range: { from: "2026-09-18", to: "2026-09-25", days: 7 },
  funnel: { visits: 120, viewed_menu: 100, viewed_bill: 70, reached_checkout: 55, payments_started: 40, payments_succeeded: 33, revenue_pesewas: 450000 },
  by_restaurant: [
    { restaurant: "Naxos", visits: 120, viewed_menu: 100, viewed_bill: 70, reached_checkout: 55, payments_started: 40, payments_succeeded: 33, revenue_pesewas: 450000 },
  ],
  daily: [{ day: "2026-09-24", visits: 20, payments: 6, revenue_pesewas: 80000 }],
  by_hour: Array.from({ length: 24 }, (_, h) => ({ hour: h, visits: h === 19 ? 30 : 2, payments: h === 19 ? 8 : 0 })),
  by_table: [{ table_label: "05", visits: 40, payments: 12, revenue_pesewas: 150000 }],
  time_on_screen: [
    { screen: "menu", avg_seconds: 45, views: 100 },
    { screen: "bill", avg_seconds: 30, views: 70 },
  ],
  avg_time_to_pay_seconds: 210,
  split_usage: { sessions_total: 40, sessions_split: 8, pct: 20 },
  tip: { total_tips_pesewas: 22000, avg_pct: 6 },
  repeat: { total_visitors: 90, returning_visitors: 27, pct: 30 },
  method_split: [
    { method: "momo", count: 25, revenue_pesewas: 300000 },
    { method: "card", count: 8, revenue_pesewas: 150000 },
  ],
};

// Intercept all Supabase traffic and answer with fixtures. Reads return arrays
// (or the maybeSingle object for /staff); the admin_analytics rpc returns the
// full analytics payload; every other write/rpc succeeds with an empty 200 so
// the mutations' onSuccess path runs (toasts, invalidation) without a backend.
export async function mockSupabase(page: Page) {
  await page.route(`**/${REF}.supabase.co/**`, async (route) => {
    const url = route.request().url();
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/*" }, body: JSON.stringify(body) });

    if (url.includes("/auth/v1/token")) return json(fakeSession());
    if (url.includes("/auth/v1/user")) return json(fakeSession().user);

    // Writes (PATCH/POST/PUT/DELETE) to a table succeed with an empty result.
    if (url.includes("/rest/v1/rpc/admin_analytics")) return json(ANALYTICS);
    if (url.includes("/rest/v1/rpc/")) return json({}); // add_bootstrap etc.

    // Reads (and any table write returns [] which is fine for .update()).
    // /staff serves two callers: the AdminLayout gate does .eq("id",uid).maybeSingle()
    // (URL carries id=eq.<uid>, wants ONE object) and the Staff & Access table does
    // .order("created_at") (wants the array). Branch on the filter to serve both.
    if (url.includes("/rest/v1/staff")) return json(url.includes("id=eq.") ? STAFF_SELF : STAFF_LIST);
    if (url.includes("/rest/v1/admin_payment_feed")) return json(PAYMENTS);
    if (url.includes("/rest/v1/admin_restaurant_directory")) return json(RESTAURANTS);
    if (url.includes("/rest/v1/admin_member_directory")) return json(MEMBERS);
    if (url.includes("/rest/v1/admin_menu_directory")) return json(MENUS);
    if (url.includes("/rest/v1/member_profiles")) return json([]); // tier update
    if (url.includes("/rest/v1/menus")) return json([]); // status update
    if (url.includes("/rest/v1/")) return json([]);
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

export async function seedSession(page: Page) {
  await page.addInitScript(([key, val]) => {
    try {
      window.localStorage.setItem(key as string, val as string);
    } catch {
      /* ignore */
    }
  }, [`sb-${REF}-auth-token`, JSON.stringify(fakeSession())]);
}
