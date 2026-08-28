import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

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

export default function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const norm = pathname.replace(/\/$/, "") || "/admin";
  const isActive = (to: string) => norm === to;

  return (
    <div className="ops-app">
      <aside className={open ? "ops-sidebar is-open" : "ops-sidebar"}>
        <div className="ops-brand">
          <b>k</b>
          <span>klown</span>
        </div>
        <nav>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={isActive(item.to) ? "active" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ops-sidebar-bottom">
          {BOTTOM.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={isActive(item.to) ? "active" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <small>© 2026 Klown Admin</small>
        </div>
      </aside>
      <main className="ops-main">
        <header className="ops-topbar">
          <button
            className="mobile-menu"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <div>
            <span className="ops-breadcrumb">Workspace</span>
            <h1>{title}</h1>
          </div>
          <div className="ops-top-actions">
            <button className="outline-button">Search</button>
            <button className="gold-button">Signed in as Samuel</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>{title}</h2>
          <p>This screen is being ported next. The navigation and layout are live.</p>
        </div>
      </section>
      <div className="empty-state">
        <h3>Screen coming next</h3>
        <p>Prototype — content for {title} will be added in the next step.</p>
      </div>
    </>
  );
}
