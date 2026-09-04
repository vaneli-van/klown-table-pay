import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import PaymentAlerts from "@/components/PaymentAlerts";

const NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/restaurants", label: "Restaurants" },
  { to: "/admin/pos-integrations", label: "POS Integrations" },
  { to: "/admin/menus", label: "Menus" },
  { to: "/admin/tables-devices", label: "Tables & Devices" },
  { to: "/admin/bills-payments", label: "Bills & Payments" },
  { to: "/admin/members", label: "Members" },
  { to: "/admin/tiers", label: "Tiers" },
  { to: "/admin/points", label: "Points" },
  { to: "/admin/rewards", label: "Rewards" },
  { to: "/admin/subscribers", label: "Subscribers" },
  { to: "/admin/support", label: "Support" },
  { to: "/admin/staff-access", label: "Staff & Access" },
  { to: "/admin/notifications", label: "Notifications" },
];
const BOTTOM = [
  { to: "/admin/activity-log", label: "Activity log" },
  { to: "/admin/settings", label: "Settings" },
];

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
      <div className="auth-prototype">
        <div className="auth-card">
          <span className="eyebrow" style={{ color: "var(--gold)" }}>KLOWN ADMIN CENTRAL</span>
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
                {err && <p style={{ color: "#e6a08c", fontSize: 12, margin: "4px 0 0" }} role="alert">{err}</p>}
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
    <div className="auth-prototype">
      <div className="auth-card">
        <span className="eyebrow" style={{ color: "var(--gold)" }}>KLOWN ADMIN CENTRAL</span>
        <h1>Staff access</h1>
        <p>{mode === "signin" ? "Sign in to manage the Klown network." : "Create your admin account with an authorised email."}</p>
        <form onSubmit={submit}>
          <input type="email" required placeholder="you@klown.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          {err && <p style={{ color: "#e6a08c", fontSize: 12, margin: "4px 0 0" }} role="alert">{err}</p>}
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

export default function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { ready, staff, loadingStaff, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const norm = pathname.replace(/\/$/, "") || "/admin";
  const isActive = (to: string) => norm === to;

  if (!ready || loadingStaff) {
    return <div className="ops-app"><div style={{ margin: "auto", color: "#77736c", fontSize: 13 }}>Loading…</div></div>;
  }
  if (!staff) return <AuthGate />;

  return (
    <div className="ops-app">
      <PaymentAlerts />
      <aside className={open ? "ops-sidebar is-open" : "ops-sidebar"}>
        <div className="ops-brand" style={{ paddingTop: 2 }}><img src="/blackbird-logo.png" alt="Klown" style={{ height: 20, width: "auto" }} /></div>
        <nav>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className={isActive(item.to) ? "active" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>
          ))}
        </nav>
        <div className="ops-sidebar-bottom">
          {BOTTOM.map((item) => (
            <Link key={item.to} to={item.to} className={isActive(item.to) ? "active" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>
          ))}
          <small>Signed in as {staff.name || staff.email} · {ROLE_LABEL[staff.role] ?? staff.role}</small>
        </div>
      </aside>
      <main className="ops-main">
        <header className="ops-topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setOpen((v) => !v)}>☰</button>
          <div><span className="ops-breadcrumb">Workspace</span><h1>{title}</h1></div>
          <div className="ops-top-actions">
            <button className="gold-button">{ROLE_LABEL[staff.role] ?? staff.role}</button>
            <button className="outline-button" onClick={() => signOut()}>Sign out</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
