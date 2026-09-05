import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Toast, useToast } from "@/components/prototype";
import { ownerContext, titleCase, type OwnerContext as OwnerCtxData } from "@/lib/owner-api";
import "../owner.css";
import OwnerNotifications from "@/components/OwnerNotifications";

const NAV = [
  { to: "/owner", label: "Payments" },
  { to: "/owner/theme", label: "Theme" },
  { to: "/owner/menus", label: "Menu Studio" },
  { to: "/owner/integrations", label: "Integrations" },
  { to: "/owner/payouts", label: "Payouts" },
  { to: "/owner/bank", label: "Payout account" },
];
const BOTTOM = [{ to: "/owner/support", label: "Support" }];

const ROLE_LABEL: Record<string, string> = { owner: "Owner", manager: "Manager" };

type OwnerCtxValue = {
  restaurantId: string;
  name: string;
  city: string | null;
  role: string | null;
  googlePlaceId: string | null;
  show: (msg: string) => void;
};

const OwnerContextCtx = createContext<OwnerCtxValue | null>(null);

/** Access the signed-in owner's restaurant context and the toast helper.
 * Only valid inside a linked <OwnerLayout>. */
export function useOwner(): OwnerCtxValue {
  const v = useContext(OwnerContextCtx);
  if (!v) throw new Error("useOwner must be used inside OwnerLayout");
  return v;
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-prototype">
      <div className="auth-card">
        <span className="eyebrow" style={{ color: "var(--gold)" }}>KLOWN FOR RESTAURANTS</span>
        {children}
      </div>
    </div>
  );
}

function OwnerAuth() {
  const [mode, setMode] = useState<"signin" | "register" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          const { error: e2 } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (e2) throw e2;
        }
      } else {
        const redirectTo = typeof window !== "undefined" ? window.location.origin + "/owner" : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw error;
        setSent(true);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const go = (m: "signin" | "register" | "forgot") => { setMode(m); setErr(null); setSent(false); };

  if (mode === "forgot") {
    return (
      <AuthShell>
        <h1>Reset password</h1>
        {sent ? (
          <>
            <p>If <b>{email.trim()}</b> has an account, a reset link is on its way. Open it on this device and you'll be able to set a new password.</p>
            <button className="admin-secondary" type="button" onClick={() => go("signin")}>Back to sign in</button>
          </>
        ) : (
          <>
            <p>Enter your account email and we'll send you a link to set a new password.</p>
            <form onSubmit={submit}>
              <input type="email" required placeholder="you@restaurant.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              {err && <p style={{ color: "#e6a08c", fontSize: 12, margin: "4px 0 0" }} role="alert">{err}</p>}
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
            </form>
            <button className="admin-secondary" type="button" onClick={() => go("signin")}>Back to sign in</button>
          </>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1>{mode === "signin" ? "Owner sign in" : "Create account"}</h1>
      <p>
        {mode === "signin"
          ? "Sign in to manage your restaurant on Klown — payments, theme, payouts and support."
          : "Create your owner account with the email your restaurant was invited on."}
      </p>
      <form onSubmit={submit}>
        <input type="email" required placeholder="you@restaurant.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        {err && <p style={{ color: "#e6a08c", fontSize: 12, margin: "4px 0 0" }} role="alert">{err}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account & sign in"}
        </button>
      </form>
      {mode === "signin" && (
        <button className="admin-secondary" type="button" onClick={() => go("forgot")}>Forgot password?</button>
      )}
      <button className="admin-secondary" type="button" onClick={() => go(mode === "signin" ? "register" : "signin")}>
        {mode === "signin" ? "First time? Create your owner account" : "Have an account? Sign in"}
      </button>
    </AuthShell>
  );
}

function NotLinked({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <AuthShell>
      <h1>Not linked yet</h1>
      <p>
        {email ? <>The account <b>{email}</b> isn't linked to a restaurant yet.</> : "This account isn't linked to a restaurant yet."}{" "}
        Ask the Klown team to invite this email, then sign in again.
      </p>
      <button className="auth-submit" type="button" onClick={onSignOut}>Sign out</button>
    </AuthShell>
  );
}

export default function OwnerLayout({ title, children }: { title: string; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const { toast, show } = useToast();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const norm = pathname.replace(/\/$/, "") || "/owner";
  const isActive = (to: string) => norm === (to.replace(/\/$/, "") || "/owner");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const userId = session?.user?.id ?? null;
  const { data: ctx, isLoading: ctxLoading } = useQuery<OwnerCtxData>({
    queryKey: ["owner_context", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: ownerContext,
  });

  const signOut = async () => { await supabase.auth.signOut(); };

  if (session === undefined) {
    return <div className="ops-app"><div style={{ margin: "auto", color: "#77736c", fontSize: 13 }}>Loading…</div></div>;
  }
  if (!session) return <OwnerAuth />;
  if (ctxLoading) {
    return <div className="ops-app"><div style={{ margin: "auto", color: "#77736c", fontSize: 13 }}>Loading your restaurant…</div></div>;
  }
  if (!ctx) return <NotLinked email={session.user?.email ?? null} onSignOut={signOut} />;

  const value: OwnerCtxValue = {
    restaurantId: ctx.restaurant_id,
    name: ctx.name,
    city: ctx.city,
    role: ctx.role,
    googlePlaceId: ctx.google_place_id,
    show,
  };
  const roleText = ROLE_LABEL[ctx.role ?? ""] ?? titleCase(ctx.role);

  return (
    <OwnerContextCtx.Provider value={value}>
      <div className="ops-app">
        <aside className={open ? "ops-sidebar is-open" : "ops-sidebar"}>
          <div className="ops-brand">Klown<b>.</b><button aria-label="Close menu" onClick={() => setOpen(false)}>×</button></div>
          <nav>
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className={isActive(item.to) ? "active" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>
            ))}
          </nav>
          <div className="ops-sidebar-bottom">
            {BOTTOM.map((item) => (
              <Link key={item.to} to={item.to} className={isActive(item.to) ? "active" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>
            ))}
            <small>{ctx.name}<br />{session.user?.email} · {roleText}</small>
          </div>
        </aside>
        <main className="ops-main">
          <header className="ops-topbar">
            <button className="mobile-menu" aria-label="Open menu" onClick={() => setOpen((v) => !v)}>☰</button>
            <div><span className="ops-breadcrumb">{ctx.name}{ctx.city ? " · " + ctx.city : ""}</span><h1>{title}</h1></div>
            <div className="ops-top-actions">
              <OwnerNotifications restaurantId={ctx.restaurant_id} />
              <button className="gold-button">{roleText}</button>
              <button className="outline-button" onClick={signOut}>Sign out</button>
            </div>
          </header>
          {children}
        </main>
        <Toast text={toast} />
      </div>
    </OwnerContextCtx.Provider>
  );
}
