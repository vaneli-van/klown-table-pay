import { test, expect } from "@playwright/test";

// Smoke tests: prove the build boots, routes serve, and nothing white-screens.
// Not business logic. Their job is to catch a broken build on every push.

test("marketing home renders", async ({ page }) => {
  const res = await page.goto("/");
  expect(res, "server should respond on /").toBeTruthy();
  expect(res!.status()).toBe(200);
  await expect(page).toHaveTitle(/Klown/i);
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.trim().length, "body should not be blank").toBeGreaterThan(0);
});

test("admin route is reachable, not a 5xx crash", async ({ page }) => {
  // Auth-gated: a redirect or a rendered login is fine. A 5xx is not.
  const res = await page.goto("/admin");
  expect(res).toBeTruthy();
  expect(res!.status(), `admin returned ${res!.status()}`).toBeLessThan(500);
});

test("owner portal route is reachable, not a 5xx crash", async ({ page }) => {
  const res = await page.goto("/owner");
  expect(res).toBeTruthy();
  expect(res!.status(), `owner returned ${res!.status()}`).toBeLessThan(500);
});

test("static asset is served", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
});
