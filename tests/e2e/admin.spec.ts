import { test, expect } from "@playwright/test";

// Admin Central structural E2E: load every admin route and prove it renders
// its SSR shell, sets its title, is not a 5xx, and does not throw an uncaught
// client exception (a failed data load must degrade gracefully, not white-screen).

const ADMIN_ROUTES = [
  "/admin",
  "/admin/analytics",
  "/admin/bills-payments",
  "/admin/restaurants",
  "/admin/members",
  "/admin/staff-access",
  "/admin/tables-devices",
  "/admin/pos-integrations",
  "/admin/menus",
  "/admin/rewards",
  "/admin/points",
  "/admin/tiers",
  "/admin/subscribers",
  "/admin/notifications",
  "/admin/branding",
  "/admin/settings",
  "/admin/activity-log",
  "/admin/support",
  "/admin/auth/login",
];

for (const path of ADMIN_ROUTES) {
  test(`admin ${path} renders without crashing`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    const res = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(res, "server responded").toBeTruthy();
    expect(res!.status(), `HTTP status for ${path}`).toBeLessThan(500);

    await expect(page, `title for ${path}`).toHaveTitle(/Klown/i);

    const body = (await page.locator("body").innerText()).trim();
    expect(body.length, `body not blank for ${path}`).toBeGreaterThan(0);

    expect(
      pageErrors,
      `uncaught page errors on ${path}: ${pageErrors.join(" | ")}`,
    ).toEqual([]);
  });
}
