import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutGrid, Store, MonitorSmartphone, BookOpen, QrCode, CreditCard, BarChart3, Users, Award, Coins, Gift,
  Mail, LifeBuoy, Bell, ShieldCheck, History, Settings, Search, LogOut, Menu as MenuIcon, X, type LucideIcon,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import PaymentAlerts from "@/components/PaymentAlerts";
import "../admin.css";

type NavItem = { to: string; label: string; icon: LucideIcon; also?: string[] };
const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Network", items: [
    { to: "/admin", label: "Overview", icon: LayoutGrid },
    { to: "/admin/restaurants", label: "Restaurants", icon: Store, also: ["/admin/branding"] },
    { to: "/admin/pos-integrations", label: "POS integrations", icon: MonitorSmartphone },
    { to: "/admin/menus", label: "Menus", icon: BookOpen, also: ["/admin/menu-studio"] },
    { to: "/admin/tables-devices", label: "Tables & devices", icon: QrCode },
  ] },
  { label: "Money", items: [
    { to: "/admin/bills-payments", label: "Bills & payments", icon: CreditCard },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ] },
  { label: "Loyalty", items: [
    { to: "/admin/members", label: "Members", icon: Users },
    { to: "/admin/tiers", label: "Tiers", icon: Award },
    { to: "/admin/points", label: "Points", icon: Coins },
    { to: "/admin/rewards", label: "Rewards", icon: Gift },
    { to: "/admin/subscribers", label: "Subscribers", icon: Mail },
  ] },
  { label: "Operations", items: [
    { to: "/admin/support", label: "Support", icon: LifeBuoy },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/admin/staff-access", label: "Staff & access", icon: ShieldCheck },
    { to: "/admin/activity-log", label: "Activity log", icon: History },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ] },
];

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="a-brand">
      <img className="a-brand-mark" src="/favicon.png" alt="" />
      <span><b>Klown</b><small>Admin Central</small></span>
      {onClose && <button className="a-icon-btn a-close" aria-label="Close menu" onClick={onClose}><X /></button>}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  operations_admin: "Operations Admin",
  finance_admin: "Finance Admin",
  read_only: "Read-Only Analyst",
};

export function AuthGate() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "register" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    if (mode === "forgot") {
      const redirectTo = typeof window !== "undefined" ? window.location.origin + "/admin" : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      setBusy(false);
      if (error) { setErr(error.message); return; }
      setSent(true);
      return;
    }
    const r = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (!r.ok) setErr(r.message ?? "Something went wrong.");
  };

  const go = (m: "signin" | "register" | "forgot") => { setMode(m); setErr(null); setSent(false); };

  if (mode === "forgot") {
    return (
      <div className="auth-prototype admin-v2">
        <div className="auth-card">
          <Brand />
          <h1>Reset password</h1>
          {sent ? (
            <>
              <p>If <b>{email.trim()}</b> is an authorised admin, a reset link is on its way. Open it on this device to set a new password.</p>
              <button className="admin-secondary" type="button" onClick={() => go("signin")}>Back to sign in</button>
            </>
          ) : (
            <>
              <p>Enter your admin email and we'll send you a link to set a new password.</p>
              <form onSubmit={submit}>
                <input type="email" required placeholder="you@klown.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                {err && <p className="auth-error" role="alert">{err}</p>}
                <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
              </form>
              <button className="admin-secondary" type="button" onClick={() => go("signin")}>Back to sign in</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-prototype admin-v2">
      <div className="auth-card">
        <Brand />
        <h1>Staff access</h1>
        <p>{mode === "signin" ? "Sign in to manage the Klown network." : "Create your admin account with an authorised email."}</p>
        <form onSubmit={submit}>
          <input type="email" required placeholder="you@klown.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          {err && <p className="auth-error" role="alert">{err}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account & sign in"}
          </button>
        </form>
        {mode === "signin" && (
          <button className="admin-secondary" type="button" onClick={() => go("forgot")}>Forgot password?</button>
        )}
        <button className="admin-secondary" type="button" onClick={() => { setMode(mode === "signin" ? "register" : "signin"); setErr(null); }}>
          {mode === "signin" ? "First time? Create your admin account" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { ready, staff, loadingStaff, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const norm = pathname.replace(/\/$/, "") || "/admin";
  const isActive = (it: NavItem) =>
    norm === it.to || (it.to !== "/admin" && norm.startsWith(it.to + "/")) || (it.also ?? []).some((p) => norm === p || norm.startsWith(p + "/"));

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

  if (!ready || loadingStaff) {
    return <div className="ops-app admin-v2"><div style={{ margin: "auto", color: "var(--a-text-2)", fontSize: 14 }}>Loading…</div></div>;
  }
  if (!staff) return <AuthGate />;

  const needle = q.trim().toLowerCase();
  const groups = GROUPS.map((g) => ({ ...g, items: needle ? g.items.filter((i) => i.label.toLowerCase().includes(needle)) : g.items }))
    .filter((g) => g.items.length > 0);
  const name = staff.name || staff.email;
  const role = ROLE_LABEL[staff.role] ?? staff.role;

  return (
    <div className="ops-app admin-v2">
      <PaymentAlerts />
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
        <nav aria-label="Admin">
          {groups.length === 0 && <div className="a-nav-empty">No page matches "{q}".</div>}
          {groups.map((g) => (
            <div key={g.label} style={{ display: "contents" }}>
              <div className="a-group">{g.label}</div>
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link key={it.to} to={it.to} className={isActive(it) ? "active" : undefined} aria-current={isActive(it) ? "page" : undefined}
                    onClick={() => { setOpen(false); setQ(""); }}>
                    <Icon aria-hidden="true" />{it.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="a-user">
          <span className="a-avatar" aria-hidden="true">{(name || "?").trim().charAt(0).toUpperCase()}</span>
          <div><b title={staff.email}>{name}</b><small>{role}</small></div>
          <button className="a-icon-btn" aria-label="Sign out" title="Sign out" onClick={() => signOut()}><LogOut /></button>
        </div>
      </aside>
      <main className="ops-main">
        <header className="ops-topbar">
          <button className="a-icon-btn mobile-menu" aria-label="Open menu" onClick={() => setOpen(true)}><MenuIcon /></button>
          <div className="a-title">
            <h1>{title}</h1>
            {subtitle ? <div className="a-sub">{subtitle}</div> : null}
          </div>
          {actions ? <div className="ops-top-actions">{actions}</div> : null}
        </header>
        <div className="a-content">{children}</div>
      </main>
    </div>
  );
}
