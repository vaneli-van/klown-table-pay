# Tests (Playwright smoke)

These smoke tests run in GitHub Actions on every push (`.github/workflows/ci.yml`)
and gate every build. They check that the app builds, the dev server boots, and
the marketing home plus the admin and owner routes serve without a 5xx crash.
They are not business-logic tests.

## Run locally

    bun add -d @playwright/test        # once, if not already installed
    bunx playwright install chromium   # once
    bunx playwright test               # boots `bun run dev` for you

## Secrets

The marketing home is static and needs no secrets. If later smoke tests exercise
Supabase-backed admin/owner data, add the same publishable client values used by
the diner app as GitHub repo secrets (Settings > Secrets and variables > Actions):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Playwright is not committed as a dependency

To keep Lovable's own install and build untouched, `@playwright/test` is NOT in
`package.json`. CI installs it at runtime; locally you install it yourself. This
keeps `bun.lock` in sync with what Lovable builds.
