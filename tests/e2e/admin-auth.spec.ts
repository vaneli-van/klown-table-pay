import { test, expect, type Page } from "@playwright/test";

// Authenticated Admin Central E2E, hermetic: we seed a Supabase session in
// localStorage and intercept every Supabase call with fixtures, so the real
// logged-in admin UI renders and can be driven without a live backend.

const REF = "wquezgzkidknryiyaguh";
const ADMIN_UID = "00000000-0000-4000-8000-000000000001";

function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString("base64url");
}
function fakeSession() {
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

const STAFF = { id: ADMIN_UID, email: "admin@test.klown", name: "E2E Admin", role: "super_admin", status: "active" };

const PAYMENTS = [
  { id: "pay-1", method: "momo", status: "captured", total_pesewas: 20000, amount_pesewas: 20000, tip_pesewas: 0, restaurant_name: "Naxos", table_label: "05", provider_ref: "e2e-aaa111", created_at: "2026-09-18T17:53:00Z" },
  { id: "pay-2", method: "momo", status: "captured", total_pesewas: 11500, amount_pesewas: 11500, tip_pesewas: 0, restaurant_name: "Naxos", table_label: "03", provider_ref: "e2e-bbb222", created_at: "2026-09-13T17:57:00Z" },
  { id: "pay-3", method: "card", status: "captured", total_pesewas: 13650, amount_pesewas: 13650, tip_pesewas: 0, restaurant_name: "Naxos", table_label: "01", provider_ref: "e2e-ccc333", created_at: "2026-09-08T15:46:00Z" },
];
const RESTAURANTS = [{ id: "r-1", name: "Naxos", city: "Accra", volume_pesewas: 45150, pos_status: "live" }];
const MEMBERS = [{ phone: "233553190058" }, { phone: "233201234567" }];
const MENUS = [{ items: 12 }];
const ACTIVITY = [{ actor_name: "E2E Admin", action: "signed in", record_label: "Admin Central", created_at: "2026-09-25T10:00:00Z" }];

// Intercept all Supabase traffic and answer with fixtures.
async function mockSupabase(page: Page) {
  await page.route(`**/${REF}.supabase.co/**`, async (route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/*" }, body: JSON.stringify(body) });

    if (url.includes("/auth/v1/token")) return json(fakeSession());
    if (url.includes("/auth/v1/user")) return json(fakeSession().user);
    if (url.includes("/rest/v1/staff")) return json(STAFF); // maybeSingle -> object
    if (url.includes("/rest/v1/admin_payment_feed")) return json(PAYMENTS);
    if (url.includes("/rest/v1/admin_restaurant_directory")) return json(RESTAURANTS);
    if (url.includes("/rest/v1/admin_member_directory")) return json(MEMBERS);
    if (url.includes("/rest/v1/admin_menu_directory")) return json(MENUS);
    if (url.includes("/rest/v1/activity_log")) return json(ACTIVITY);
    if (url.includes("/rest/v1/rpc/")) return json({});
    if (url.includes("/rest/v1/")) return json([]);
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

async function seedSession(page: Page) {
  await page.addInitScript(([key, val]) => {
    try { window.localStorage.setItem(key as string, val as string); } catch { /* ignore */ }
  }, [`sb-${REF}-auth-token`, JSON.stringify(fakeSession())]);
}

test.describe("Admin Central (authenticated)", () => {
  test("login screen shows the sign-in form", async ({ page }) => {
    await mockSupabase(page); // no session seeded -> AuthGate
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("sign-in flow lands on the Overview dashboard", async ({ page }) => {
    await mockSupabase(page); // start logged out, log in via the form
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill("admin@test.klown");
    await page.locator('input[type="password"]').fill("whatever");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText(/Signed in as/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("E2E Admin")).toBeVisible();
  });

  test("Overview renders admin metrics and restaurant list", async ({ page }) => {
    await seedSession(page);
    await mockSupabase(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Signed in as/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Captured volume")).toBeVisible();
    await expect(page.getByText("Klown revenue")).toBeVisible();
    await expect(page.getByText("Captured volume").locator("xpath=following-sibling::strong").first()).not.toHaveText("…");
    await expect(page.getByText("Naxos").first()).toBeVisible();
  });

  test("Bills & Payments lists the payment feed", async ({ page }) => {
    await seedSession(page);
    await mockSupabase(page);
    await page.goto("/admin/bills-payments", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Payments & reconciliation/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Naxos").first()).toBeVisible();
    await expect(page.getByText(/e2e-a|aaa111|#aa/i).first()).toBeVisible();
  });
});
