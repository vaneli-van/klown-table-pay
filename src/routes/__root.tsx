import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { reportLovableError } from "../lib/lovable-error-reporting";

/** Single password-recovery handler for the whole app (owner + admin). The
 * shared Supabase client has detectSessionInUrl:false, so we parse the recovery
 * tokens from the URL hash ourselves, open a session and let the user set a new
 * password — wherever the reset link happens to land. */
function RecoveryScreen({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setErr("Use at least 6 characters."); return; }
    if (pw !== pw2) { setErr("Those passwords don't match."); return; }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  };

  return (
    <div className="auth-prototype">
      <div className="auth-card">
        <span className="eyebrow" style={{ color: "var(--gold)" }}>KLOWN</span>
        <h1>Set a new password</h1>
        <p>Choose a new password for your Klown account, then you'll be signed in.</p>
        <form onSubmit={submit}>
          <input type="password" required placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <input type="password" required placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          {err && <p style={{ color: "#e6a08c", fontSize: 12, margin: "4px 0 0" }} role="alert">{err}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Set password & continue"}</button>
        </form>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Klown" },
      {
        name: "description",
        content:
          "Scan the Klown code at your table. View your bill, split it your way, pay with Mobile Money or card, and earn rewards for coming back.",
      },
      { name: "author", content: "Klown" },
      { property: "og:title", content: "Klown — A better way to dine" },
      {
        property: "og:description",
        content:
          "Scan the Klown code at your table. View your bill, split it your way, pay with Mobile Money or card, and earn rewards for coming back.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [recovery, setRecovery] = useState(false);

  // Catch a password-recovery link on any page (owner or admin). Parse the
  // recovery tokens from the URL hash, open a session, and show the set-password
  // screen; on success fall through to the normal app, now signed in.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash || "";
    if (!h.includes("type=recovery")) return;
    const params = new URLSearchParams(h.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (!error) setRecovery(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AuthProvider>
        {recovery ? <RecoveryScreen onDone={() => setRecovery(false)} /> : <Outlet />}
      </AuthProvider>
    </QueryClientProvider>
  );
}
