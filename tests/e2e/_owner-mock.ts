import type { Page } from "@playwright/test";
import { REF, fakeSession } from "./_admin-mock";

// Owner-portal hermetic mock. The portal is 100% RPC-driven (SECURITY DEFINER
// functions that resolve the caller's restaurant server-side), gated by
// owner_context. We reuse the admin helper's session seeding (same Supabase
// client + localStorage key) and answer every /rest/v1/rpc/<fn> with a fixture.

const RID = "a7d871e8-cea8-4e1b-bacb-00217239087a";

export const CTX = { restaurant_id: RID, name: "Naxos", city: "Accra", role: "owner", google_place_id: "ChIJ_naxos_place_id" };

export const SUMMARY = {
  days: 14,
  volume_pesewas: 450000,
  tips_pesewas: 22000,
  txn_count: 33,
  avg_bill_pesewas: 13636,
  by_method: [
    { method: "momo", pesewas: 300000, count: 25 },
    { method: "card", pesewas: 150000, count: 8 },
  ],
  daily: [
    { day: "Sep 20", pesewas: 80000 },
    { day: "Sep 21", pesewas: 60000 },
    { day: "Sep 22", pesewas: 90000 },
    { day: "Sep 23", pesewas: 120000 },
    { day: "Sep 24", pesewas: 100000 },
  ],
};

export const RECENT = [
  { created_at: "2026-09-24T18:00:00Z", table_label: "05", method: "momo", status: "captured", provider_ref: "e2e-aaa111", amount_pesewas: 20000, tip_pesewas: 1000, total_pesewas: 21000 },
  { created_at: "2026-09-23T19:30:00Z", table_label: "03", method: "card", status: "captured", provider_ref: "e2e-bbb222", amount_pesewas: 11500, tip_pesewas: 0, total_pesewas: 11500 },
];

export const ORDERS = [
  {
    created_at: "2026-09-24T18:00:00Z", restaurant: "Naxos", location: "Main floor", server: "Ama",
    method: "momo", status: "captured", ref: "e2e-aaa111",
    amount_pesewas: 20000, tip_pesewas: 1000, total_pesewas: 21000, klown_fee_pesewas: 105,
    items: [
      { name: "Jollof & Chicken", qty: 2, pesewas: 12000 },
      { name: "Sobolo", qty: 1, pesewas: 2000 },
    ],
  },
];

export const PAYOUTS = {
  settings: { restaurant_id: RID, schedule: "weekly", min_payout_pesewas: 5000, available_pesewas: 120000, pending_pesewas: 30000, payout_fee_pesewas: 200, updated_at: "2026-09-24T00:00:00Z" },
  accounts: [
    { id: "acc-1", destination_type: "bank", provider: "GT Bank", account_number: "3202001005562", account_name: "Naxos Hospitality Ltd", branch: "Airport", masked: "••••5562", is_default: true, verification_status: "verified" },
  ],
  payouts: [
    { reference: "PO-1001", amount_pesewas: 100000, destination: "GT Bank ••••5562", status: "paid", scheduled_for: null, paid_at: "2026-09-20T00:00:00Z", created_at: "2026-09-19T00:00:00Z" },
  ],
};

export const INTEGRATIONS = {
  google_place_id: "ChIJ_naxos_place_id",
  pos: [{ provider: "odoo", status: "live", health: "healthy", last_sync_at: "2026-09-25T09:00:00Z", branch: "Main" }],
  connectors: [{ provider: "sambapos", name: "SambaPOS Bridge", active: true, last_seen_at: "2026-09-25T09:00:00Z" }],
};

export const TICKETS = [
  { ref: "KL-1001", category: "Payments", priority: "normal", subject: "Existing ticket", status: "open", created_at: "2026-09-22T00:00:00Z" },
];

export const PROFILE = { restaurant_id: RID, name: "Naxos", city: "Accra", contact_phone: "0244000000", address: "Airport, Accra" };

export const TEAM = [
  { email: "admin@test.klown", role: "owner", status: "active", linked: true, created_at: "2026-01-01T00:00:00Z", is_self: true },
  { email: "manager@naxos.com", role: "manager", status: "invited", linked: false, created_at: "2026-09-01T00:00:00Z", is_self: false },
];

export const NOTIFY = { phones: ["233553190058"] };

// Route every Supabase call. RPC reads return their fixture; the write RPCs
// return the shape the client reads for its toast; unknown rpc -> {}.
export async function mockOwner(page: Page) {
  await page.route(`**/${REF}.supabase.co/**`, async (route) => {
    const url = route.request().url();
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/*" }, body: JSON.stringify(body) });

    if (url.includes("/auth/v1/token")) return json(fakeSession());
    if (url.includes("/auth/v1/user")) return json(fakeSession().user);

    // ---- reads ----
    if (url.includes("/rpc/owner_context")) return json(CTX);
    if (url.includes("/rpc/owner_payments_summary")) return json(SUMMARY);
    if (url.includes("/rpc/owner_recent_payments")) return json(RECENT);
    if (url.includes("/rpc/owner_orders")) return json(ORDERS);
    if (url.includes("/rpc/owner_payouts")) return json(PAYOUTS);
    if (url.includes("/rpc/owner_integrations")) return json(INTEGRATIONS);
    if (url.includes("/rpc/owner_tickets")) return json(TICKETS);
    if (url.includes("/rpc/owner_profile")) return json(PROFILE);
    if (url.includes("/rpc/owner_team")) return json(TEAM);
    if (url.includes("/rpc/owner_notify_phones")) return json(NOTIFY);

    // ---- writes (return the shape each caller reads for its toast) ----
    if (url.includes("/rpc/owner_save_notify_phones")) return json({ phones: ["0241111111"] });
    if (url.includes("/rpc/owner_invite_member")) return json({ ok: true, status: "invited", email: "new-owner@naxos.com", role: "owner" });
    if (url.includes("/rpc/owner_create_ticket")) return json({ ref: "KL-1042", status: "open" });
    if (url.includes("/rpc/owner_set_schedule")) return json(PAYOUTS);
    if (url.includes("/rpc/owner_save_profile")) return json(PROFILE);

    if (url.includes("/rest/v1/rpc/")) return json({});
    if (url.includes("/rest/v1/")) return json([]);
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}
