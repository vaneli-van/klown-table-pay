import { test, expect } from "@playwright/test";
import { seedSession } from "./_admin-mock";
import { mockOwner } from "./_owner-mock";

// Authenticated Owner-portal E2E, hermetic. The portal gates on a seeded
// Supabase session + the owner_context rpc; every page is RPC-driven, so the
// mock answers each /rpc/<fn> with a fixture. Covers the reads across the
// portal and the write actions (save alert numbers, set payout schedule,
// invite team member, create support ticket) — asserting the request fired
// and the confirmation toast.
//
// Note: OwnerLayout renders the page name as both the topbar <h1> and the body
// <h2>, so where a page's title is generic we assert on a unique inner heading
// (e.g. "Daily volume") instead of the ambiguous page title.

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockOwner(page);
});

test.describe("Owner · reads", () => {
  test("login screen shows when no session is seeded", async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => { try { window.localStorage.clear(); } catch { /* ignore */ } });
    await page.goto("/owner", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Owner sign in/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("Overview renders the restaurant context and payment snapshot", async ({ page }) => {
    await page.goto("/owner", { waitUntil: "domcontentloaded" });
    // breadcrumb proves owner_context resolved
    await expect(page.getByText("Naxos · Accra")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Daily volume" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How diners pay" })).toBeVisible();
    // a recent payment row rendered
    await expect(page.getByText("Table 05").first()).toBeVisible();
  });

  test("Payments shows metrics, method split and recent activity", async ({ page }) => {
    await page.goto("/owner/payments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "SMS payment alerts" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Daily volume" })).toBeVisible();
    await expect(page.getByText("Mobile Money").first()).toBeVisible();
  });

  test("Orders lists Klown orders and expands item detail", async ({ page }) => {
    await page.goto("/owner/orders", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "All Klown orders" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Main floor").first()).toBeVisible();
    // expand the order to reveal its items
    await page.getByText("Main floor").first().click();
    await expect(page.getByText(/Jollof & Chicken/i)).toBeVisible();
  });

  test("Payouts shows balance, schedule and history", async ({ page }) => {
    await page.goto("/owner/payouts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "When you get paid" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Available balance")).toBeVisible();
    await expect(page.getByText("PO-1001")).toBeVisible();
  });

  test("Integrations shows POS, connectors and reviews link", async ({ page }) => {
    await page.goto("/owner/integrations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "POS connections" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("SambaPOS Bridge")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Google reviews link" })).toBeVisible();
  });

  test("Settings shows the team roster", async ({ page }) => {
    await page.goto("/owner/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Owners & managers" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("manager@naxos.com")).toBeVisible();
  });

  test("Support shows the ticket form and history", async ({ page }) => {
    await page.goto("/owner/support", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Contact Klown" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Your tickets" })).toBeVisible();
    await expect(page.getByText("Existing ticket")).toBeVisible();
  });
});

test.describe("Owner · writes", () => {
  test("saving SMS alert numbers calls owner_save_notify_phones and toasts", async ({ page }) => {
    await page.goto("/owner/payments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "SMS payment alerts" })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder("024 000 0000").first().fill("0241111111");
    const rpc = page.waitForRequest(
      (r) => r.url().includes("/rpc/owner_save_notify_phones") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Save alert numbers/i }).click();
    await rpc;
    await expect(page.getByText(/Saved 1 alert number/i)).toBeVisible();
  });

  test("changing payout schedule calls owner_set_schedule and toasts", async ({ page }) => {
    await page.goto("/owner/payouts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "When you get paid" })).toBeVisible({ timeout: 15000 });
    // current schedule is weekly (disabled); switch to daily
    const rpc = page.waitForRequest(
      (r) => r.url().includes("/rpc/owner_set_schedule") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Daily/ }).click();
    await rpc;
    await expect(page.getByText(/Payout schedule set to daily/i)).toBeVisible();
  });

  test("inviting a team member calls owner_invite_member and toasts", async ({ page }) => {
    await page.goto("/owner/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Owners & managers" })).toBeVisible({ timeout: 15000 });
    await page.locator('input[type="email"]').fill("new-owner@naxos.com");
    const rpc = page.waitForRequest(
      (r) => r.url().includes("/rpc/owner_invite_member") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Send invite/i }).click();
    await rpc;
    await expect(page.getByText(/Invited new-owner@naxos\.com/i)).toBeVisible();
  });

  test("raising a support ticket calls owner_create_ticket and toasts", async ({ page }) => {
    await page.goto("/owner/support", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Contact Klown" })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder("Short summary").fill("Payout didn't arrive");
    const rpc = page.waitForRequest(
      (r) => r.url().includes("/rpc/owner_create_ticket") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Send request/i }).click();
    await rpc;
    await expect(page.getByText(/Ticket KL-1042 created/i)).toBeVisible();
  });
});
