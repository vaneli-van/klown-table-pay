import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutGrid, CreditCard, ReceiptText, Star, BookOpen, Palette, Landmark, Wallet, Plug, Settings, LifeBuoy,
  Search, LogOut, Menu as MenuIcon, X, type LucideIcon,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Toast, useToast } from "@/components/prototype";
import { ownerContext, titleCase, type OwnerContext as OwnerCtxData } from "@/lib/owner-api";
import "../admin.css";
import "../owner.css";
import OwnerNotifications from "@/components/OwnerNotifications";

type NavItem = { to: string; label: string; icon: LucideIcon };
const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Restaurant", items: [
    { to: "/owner", label: "Overview", icon: LayoutGrid },
    { to: "/owner/payments", label: "Payments", icon: CreditCard },
    { to: "/owner/orders", label: "Orders", icon: ReceiptText },
    { to: "/owner/reviews", label: "Reviews", icon: Star },
  ] },
  { label: "Menu & brand", items: [
    { to: "/owner/menus", label: "Menu Studio", icon: BookOpen },
    { to: "/owner/theme", label: "Theme", icon: Palette },
  ] },
  { label: "Money", items: [
    { to: "/owner/payouts", label: "Settlement", icon: Landmark },
    { to: "/owner/bank", label: "Settlement account", icon: Wallet },
  ] },
  { label: "Setup", items: [
    { to: "/owner/integrations", label: "Integrations", icon: Plug },
    { to: "/owner/settings", label: "Settings", icon: Settings },
    { to: "/owner/support", label: "Support", icon: LifeBuoy },
  ] },
];

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="a-brand">
      <img className="a-brand-mark" src="/favicon.png" alt="" />
      <span><b>Klown</b><small>For restaurants</small></span>
      {onClose && <button className="a-icon-btn a-close" aria-label="Close menu" onClick={onClose}><X /></button>}
    </div>
  );
}

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
    <div className="auth-prototype admin-v2">
      <div className="auth-card">
        <Brand />
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
              {err && <p className="auth-error" role="alert">{err}</p>}
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
          ? "Sign in to manage your restaurant on Klown — payments, settlement, theme and support."
          : "Create your owner account with the email your restaurant was invited on."}
      </p>
      <form onSubmit={submit}>
        <input type="email" required placeholder="you@restaurant.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        {err && <p className="auth-error" role="alert">{err}</p>}
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

export default function OwnerLayout({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { toast, show } = useToast();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const norm = pathname.replace(/\/$/, "") || "/owner";
  const isActive = (to: string) => norm === to || (to !== "/owner" && norm.startsWith(to + "/"));

  // "/" jumps to the sidebar search, Escape closes the mobile menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing) { e.preventDefault(); if (window.innerWidth <= 860) setOpen(true); searchRef.current?.focus(); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    return <div className="ops-app admin-v2"><div style={{ margin: "auto", color: "var(--a-text-2)", fontSize: 14 }}>Loading…</div></div>;
  }
  if (!session) return <OwnerAuth />;
  if (ctxLoading) {
    return <div className="ops-app admin-v2"><div style={{ margin: "auto", color: "var(--a-text-2)", fontSize: 14 }}>Loading your restaurant…</div></div>;
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

  const needle = q.trim().toLowerCase();
  const groups = GROUPS.map((g) => ({ ...g, items: needle ? g.items.filter((i) => i.label.toLowerCase().includes(needle)) : g.items }))
    .filter((g) => g.items.length > 0);
  const email = session.user?.email ?? "";

  return (
    <OwnerContextCtx.Provider value={value}>
      <div className="ops-app admin-v2">
        {open && <button className="a-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
        <aside className={open ? "ops-sidebar is-open" : "ops-sidebar"}>
          <Brand onClose={() => setOpen(false)} />
          <label className="a-search">
            <Search size={16} aria-hidden="true" />
            <input ref={searchRef} type="search" placeholder="Jump to a page" aria-label="Jump to a page" value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && groups[0]?.items[0]) { (document.querySelector(".ops-sidebar nav a") as HTMLAnchorElement | null)?.click(); setQ(""); }
              }} />
            <kbd aria-hidden="true">/</kbd>
          </label>
          <nav aria-label="Owner">
            {groups.length === 0 && <div className="a-nav-empty">No page matches "{q}".</div>}
            {groups.map((g) => (
              <div key={g.label} style={{ display: "contents" }}>
                <div className="a-group">{g.label}</div>
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const on = isActive(it.to);
                  return (
                    <Link key={it.to} to={it.to} activeProps={{ className: "" }} activeOptions={{ exact: true }}
                      className={on ? "active" : undefined} aria-current={on ? "page" : undefined}
                      onClick={() => { setOpen(false); setQ(""); }}>
                      <Icon aria-hidden="true" />{it.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="a-user">
            <span className="a-avatar" aria-hidden="true">{(ctx.name || "?").trim().charAt(0).toUpperCase()}</span>
            <div><b title={ctx.name}>{ctx.name}</b><small title={email}>{roleText}{email ? ` · ${email}` : ""}</small></div>
            <button className="a-icon-btn" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut /></button>
          </div>
        </aside>
        <main className="ops-main">
          <header className="ops-topbar">
            <button className="a-icon-btn mobile-menu" aria-label="Open menu" onClick={() => setOpen(true)}><MenuIcon /></button>
            <div className="a-title">
              <h1>{title}</h1>
              <div className="a-sub">{ctx.name}{ctx.city ? ` · ${ctx.city}` : ""}</div>
            </div>
            <div className="ops-top-actions">
              {actions}
              <OwnerNotifications restaurantId={ctx.restaurant_id} />
            </div>
          </header>
          <div className="a-content">{children}</div>
        </main>
        <Toast text={toast} />
      </div>
    </OwnerContextCtx.Provider>
  );
}
