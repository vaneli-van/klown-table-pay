import { test, expect } from "@playwright/test";
import { seedSession, mockSupabase } from "./_admin-mock";

// Authenticated Admin Central E2E for the remaining areas: Restaurants,
// Analytics, Members, Menus, Staff & Access. Each seeds a mocked Supabase
// session, renders the real logged-in UI, and — for the pages that write —
// drives the mutation and asserts both the outgoing request and the toast.

test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await mockSupabase(page);
});

test.describe("Restaurants", () => {
  test("directory lists restaurants from the backend", async ({ page }) => {
    await page.goto("/admin/restaurants", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Restaurant directory" })).toBeVisible({ timeout: 15000 });
    // both fixture restaurants render, and the count is not the loading placeholder
    await expect(page.getByText("2 restaurants")).toBeVisible();
    await expect(page.getByText("Naxos").first()).toBeVisible();
    await expect(page.getByText("Baobab Bistro").first()).toBeVisible();
  });

  test("opening a restaurant shows its profile drawer", async ({ page }) => {
    await page.goto("/admin/restaurants", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("2 restaurants")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Naxos/ }).first().click();
    await expect(page.getByText("Restaurant profile")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Today at Naxos/i })).toBeVisible();
  });
});

test.describe("Analytics", () => {
  test("funnel and KPIs resolve from the analytics rpc", async ({ page }) => {
    await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Diner analytics" })).toBeVisible({ timeout: 15000 });
    // funnel only renders steps once the rpc payload resolved
    await expect(page.getByText("Where diners drop off")).toBeVisible();
    await expect(page.getByText("Visits (scanned)")).toBeVisible();
    // by-restaurant table shows the fixture row (scoped to the row, not the
    // hidden <option> of the same name in the restaurant filter)
    await expect(page.locator(".restaurant-table-row").filter({ hasText: "Naxos" }).first()).toBeVisible();
    // KPI resolved (not the "…" placeholder) — conversion is 33/120 = 28%
    await expect(page.getByText("28%")).toBeVisible();
  });
});

test.describe("Members", () => {
  test("directory renders members and KPIs", async ({ page }) => {
    await page.goto("/admin/members", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Member directory" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Yaw").first()).toBeVisible();
    await expect(page.getByText("233201234567").first()).toBeVisible();
  });

  test("changing a member's tier writes to member_profiles and toasts", async ({ page }) => {
    await page.goto("/admin/members", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Yaw").first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Yaw/ }).first().click();
    await expect(page.getByRole("heading", { name: "Change tier" })).toBeVisible();

    const patch = page.waitForRequest(
      (r) => r.url().includes("/rest/v1/member_profiles") && r.method() === "PATCH",
    );
    await page.getByRole("button", { name: /Set to Inner Circle/i }).click();
    await patch; // the update actually fired
    await expect(page.getByText(/Tier updated to Inner Circle/i)).toBeVisible();
  });
});

test.describe("Menus", () => {
  test("directory renders menus and KPIs", async ({ page }) => {
    await page.goto("/admin/menus", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Menu directory" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Naxos Dinner")).toBeVisible();
    await expect(page.getByText("Baobab Lunch")).toBeVisible();
  });

  test("publishing a menu writes to menus and toasts", async ({ page }) => {
    await page.goto("/admin/menus", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Naxos Dinner")).toBeVisible({ timeout: 15000 });
    // open the manage box for the first menu
    await page.getByRole("button", { name: /Naxos Dinner/ }).first().click();
    await expect(page.getByRole("button", { name: /^Publish/ })).toBeVisible();

    const patch = page.waitForRequest(
      (r) => r.url().includes("/rest/v1/menus") && r.method() === "PATCH",
    );
    await page.getByRole("button", { name: /^Publish/ }).click();
    await patch;
    await expect(page.getByText(/Menu set to Published/i)).toBeVisible();
  });
});

test.describe("Staff & Access", () => {
  test("lists staff and the role capability matrix", async ({ page }) => {
    await page.goto("/admin/staff-access", { waitUntil: "domcontentloaded" });
    // page h2 "Staff & access" — exact+level avoids the layout h1 "Staff & Access"
    await expect(page.getByRole("heading", { name: "Staff & access", exact: true, level: 2 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Ama Ops")).toBeVisible();
    await expect(page.getByText("Kofi Finance")).toBeVisible();
    await expect(page.getByText("Role capabilities")).toBeVisible();
  });

  test("inviting a staff member calls add_bootstrap and toasts", async ({ page }) => {
    await page.goto("/admin/staff-access", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Staff & access", exact: true, level: 2 })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Invite staff/i }).click();
    await expect(page.getByRole("heading", { name: "Invite staff" })).toBeVisible();

    await page.locator('input.wide-input').nth(1).fill("newhire@klown.com"); // Email field
    const rpc = page.waitForRequest(
      (r) => r.url().includes("/rest/v1/rpc/add_bootstrap") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Authorise email/i }).click();
    await rpc;
    await expect(page.getByText(/newhire@klown.com authorised/i)).toBeVisible();
  });
});
