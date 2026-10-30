import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Download, Plus } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ghs, ghsCompact, titleCase, relTime } from "@/lib/format";

const TITLE = "Overview";
export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});

type Pay = {
  id: string; method: string | null; status: string; total_pesewas: number | null; amount_pesewas: number | null;
  restaurant_name: string | null; created_at: string; provider_ref: string | null; refund_status: string | null;
};
type Rest = {
  id: string; name: string; city: string | null; volume_pesewas: number | null; pos_status: string | null;
  pos_health: string | null; pos_provider: string | null; last_sync_at: string | null;
};

const RANGES = [
  { key: 1, label: "Today" },
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
] as const;
const DAY = 86400000;
const CAPTURED = new Set(["captured", "settled", "succeeded", "paid"]);
const isCaptured = (p: Pay) => CAPTURED.has((p.status || "").toLowerCase()) && !p.refund_status;
const accraDay = (d: Date) => new Date(d.getTime()).toISOString().slice(0, 10); // Accra is UTC+0
const startOfToday = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.getTime(); };
const methodKey = (m: string | null) => {
  const k = (m || "other").toLowerCase();
  if (k.includes("momo") || k.includes("mobile")) return "momo";
  if (k.includes("point")) return "points";
  if (k.includes("card") || k.includes("apple")) return "card";
  return "other";
};
const statusClass = (p: Pay) => {
  if (p.refund_status) return "status-badge";
  const s = (p.status || "").toLowerCase();
  if (s === "settled") return "status-badge status-info";
  if (CAPTURED.has(s)) return "status-badge status-success";
  if (s === "failed" || s === "cancelled" || s === "abandoned") return "status-badge status-danger";
  return "status-badge status-warning";
};
const ref = (p: Pay) => (p.provider_ref ? "#" + p.provider_ref.slice(-6) : "#" + p.id.slice(0, 6));
const sumCaptured = (xs: Pay[]) => xs.filter(isCaptured).reduce((s, p) => s + (p.total_pesewas || 0), 0);

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const [range, setRange] = useState<number>(7);

  const { data, isLoading, error } = useQuery({
    queryKey: ["overview-v2", staff?.id],
    enabled: !!staff,
    queryFn: async () => {
      const since = new Date(startOfToday() - 179 * DAY).toISOString(); // two 90-day windows
      const [pay, rest, mem, menus, acts] = await Promise.all([
        supabase.from("admin_payment_feed").select("id,method,status,total_pesewas,amount_pesewas,restaurant_name,created_at,provider_ref,refund_status")
          .gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
        supabase.from("admin_restaurant_directory").select("id,name,city,volume_pesewas,pos_status,pos_health,pos_provider,last_sync_at"),
        supabase.from("admin_member_directory").select("phone"),
        supabase.from("admin_menu_directory").select("items"),
        supabase.from("activity_log").select("actor_name,action,record_label,created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      if (pay.error) throw pay.error;
      return {
        payments: (pay.data ?? []) as Pay[],
        restaurants: (rest.data ?? []) as Rest[],
        members: (mem.data ?? []).length,
        items: (menus.data ?? []).reduce((s: number, m: any) => s + (m.items || 0), 0),
        activity: acts.data ?? [],
      };
    },
  });

  // ---- windows
  const now = Date.now();
  const winStart = range === 1 ? startOfToday() : startOfToday() - (range - 1) * DAY;
  const prevStart = winStart - (range === 1 ? DAY : range * DAY);
  const all = data?.payments ?? [];
  const inWin = all.filter((p) => new Date(p.created_at).getTime() >= winStart);
  const inPrev = all.filter((p) => { const t = new Date(p.created_at).getTime(); return t >= prevStart && t < winStart; });
  const captured = sumCaptured(inWin);
  const prevCaptured = sumCaptured(inPrev);
  const capturedCount = inWin.filter(isCaptured).length;
  const trend = prevCaptured > 0 ? Math.round(((captured - prevCaptured) / prevCaptured) * 100) : null;
  const avgBill = capturedCount ? Math.round(captured / capturedCount) : 0;
  const tips = inWin.filter(isCaptured).reduce((s, p) => s + Math.max(0, (p.total_pesewas || 0) - (p.amount_pesewas ?? p.total_pesewas ?? 0)), 0);

  // ---- daily chart: always the last 14 days
  const days = Array.from({ length: 14 }, (_, i) => new Date(startOfToday() - (13 - i) * DAY));
  const byDay = new Map<string, { cap: number; tip: number }>();
  days.forEach((d) => byDay.set(accraDay(d), { cap: 0, tip: 0 }));
  all.filter(isCaptured).forEach((p) => {
    const k = p.created_at.slice(0, 10);
    const b = byDay.get(k);
    if (!b) return;
    const tip = Math.max(0, (p.total_pesewas || 0) - (p.amount_pesewas ?? p.total_pesewas ?? 0));
    b.cap += (p.total_pesewas || 0) - tip; b.tip += tip;
  });
  const dayMax = Math.max(1, ...[...byDay.values()].map((b) => b.cap + b.tip));
  const niceMax = (() => { const v = dayMax / 100; const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const m = Math.ceil(v / p); return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * p * 100; })();
  const spark = days.map((d) => { const b = byDay.get(accraDay(d))!; return b.cap + b.tip; });

  // ---- methods
  const mt: Record<string, number> = { momo: 0, card: 0, points: 0, other: 0 };
  inWin.filter(isCaptured).forEach((p) => { mt[methodKey(p.method)] += p.total_pesewas || 0; });
  const mTot = mt.momo + mt.card + mt.points + mt.other;
  const pct = (n: number) => (mTot ? Math.round((n / mTot) * 100) : 0);

  // ---- restaurants
  const restaurants = (data?.restaurants ?? []).slice().sort((a, b) => (b.volume_pesewas || 0) - (a.volume_pesewas || 0));
  const live = restaurants.filter((r) => r.pos_status === "live").length;
  const topVol = Math.max(1, restaurants[0]?.volume_pesewas || 0);
  const attention = restaurants.flatMap((r) => {
    const out: { key: string; bad: boolean; title: string; note: string }[] = [];
    const health = (r.pos_health || "").toLowerCase();
    if (health === "offline" || health === "issue") out.push({ key: r.id + "h", bad: health === "offline", title: `${r.name}: POS ${health}`, note: `${titleCase(r.pos_provider) || "POS"} connection needs a look.` });
    if (r.last_sync_at && now - new Date(r.last_sync_at).getTime() > 7 * DAY && r.pos_status === "live") out.push({ key: r.id + "s", bad: false, title: `${r.name}: last synced ${relTime(r.last_sync_at)}`, note: "Check the connector token or POS credentials." });
    if (r.pos_status && r.pos_status !== "live" && r.pos_status !== "paused") out.push({ key: r.id + "o", bad: false, title: `${r.name}: still in ${titleCase(r.pos_status).toLowerCase()}`, note: "Not taking Klown payments yet." });
    return out;
  });
  const failedToday = all.filter((p) => new Date(p.created_at).getTime() >= startOfToday() && (p.status || "").toLowerCase() === "failed").length;
  if (failedToday > 0) attention.unshift({ key: "failed", bad: true, title: `${failedToday} failed payment${failedToday > 1 ? "s" : ""} today`, note: "Open Bills & payments to see what happened." });

  const rangeWord = range === 1 ? "yesterday" : `prior ${range}d`;
  const METRICS = [
    { label: "Captured volume", value: ghsCompact(captured) },
    { label: "Klown revenue", value: ghsCompact(Math.round(captured * 0.005)) },
    { label: "Payments", value: String(capturedCount) },
    { label: "Average bill", value: ghsCompact(avgBill) },
    { label: "Live restaurants", value: `${live} of ${restaurants.length}` },
    { label: "Members", value: String(data?.members ?? 0) },
  ];
  const v = (s: string) => (isLoading ? "…" : s);

  return (
    <AdminLayout
      title={TITLE}
      subtitle={<><span className="a-live-dot" aria-hidden="true" />Live from Klown Pay, all restaurants</>}
      actions={<>
        <div className="a-seg" role="group" aria-label="Date range">
          {RANGES.map((r) => <button key={r.key} className={range === r.key ? "on" : ""} aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</button>)}
        </div>
        <button className="outline-button" onClick={() => show(downloadCsv("overview.csv", METRICS.map((m) => ({ metric: m.label, value: m.value, range: RANGES.find((r) => r.key === range)?.label }))) ? "Exported overview.csv" : "Nothing to export yet")}><Download size={16} />Export</button>
        <Link to="/admin/restaurants" className="gold-button"><Plus size={16} />Add restaurant</Link>
      </>}
    >
      {error ? <div className="a-error">Couldn't load the overview: {String((error as any)?.message ?? error)}</div> : null}

      <div className="metrics-grid">
        <div className="metric-card">
          <span>Captured volume</span>
          <strong>{v(ghsCompact(captured))}</strong>
          <div className="a-kpi-foot">
            {trend == null ? <small>no {rangeWord} to compare</small> : (
              <span className={"a-trend " + (trend > 0 ? "up" : trend < 0 ? "down" : "flat")}>
                {trend > 0 ? <ArrowUpRight size={13} /> : trend < 0 ? <ArrowDownRight size={13} /> : null}{Math.abs(trend)}% vs {rangeWord}
              </span>
            )}
            <Sparkline values={spark} />
          </div>
        </div>
        <div className="metric-card"><span>Klown revenue</span><strong>{v(ghsCompact(Math.round(captured * 0.005)))}</strong><small>0.5% of captured volume</small></div>
        <div className="metric-card"><span>Payments</span><strong>{v(String(capturedCount))}</strong><small>{isLoading ? "" : `captured of ${inWin.length} attempts${inWin.length ? ` · ${Math.round((capturedCount / inWin.length) * 100)}%` : ""}`}</small></div>
        <div className="metric-card"><span>Average bill</span><strong>{v(ghsCompact(avgBill))}</strong><small>{isLoading ? "" : `${ghsCompact(tips)} in tips`}</small></div>
        <div className="metric-card"><span>Live restaurants</span><strong>{v(String(live))}<span style={{ fontSize: 15, fontWeight: 500, color: "var(--a-muted)" }}> of {restaurants.length}</span></strong><small>{restaurants.length - live > 0 ? `${restaurants.length - live} not live yet` : "all live"}</small></div>
        <div className="metric-card"><span>Members</span><strong>{v(String(data?.members ?? 0))}</strong><small>{isLoading ? "" : `${(data?.items ?? 0).toLocaleString("en-GH")} menu items`}</small></div>
      </div>

      <div className="a-grid-3" style={{ marginTop: 0 }}>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Daily volume</h2><p>Captured payments, last 14 days, all restaurants</p></div>
            <div className="a-legend">
              <span><i style={{ background: "var(--a-accent)" }} />Bills</span>
              <span><i style={{ background: "#c7d2fe" }} />Tips</span>
              <Link to="/admin/bills-payments" className="panel-link">View payments</Link>
            </div>
          </div>
          <div className="a-chart" role="img" aria-label={`Daily captured volume for the last 14 days, peak ${ghs(dayMax)}`}>
            <div className="a-chart-y" aria-hidden="true">
              {[4, 3, 2, 1, 0].map((i) => <span key={i}>{i === 0 ? "0" : ghsCompact((niceMax / 4) * i).replace("GH₵ ", "")}</span>)}
            </div>
            <div className="a-chart-body">
              <div className="a-bars" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                {days.map((d, i) => {
                  const b = byDay.get(accraDay(d))!;
                  return (
                    <div key={i} className={"a-bar" + (i === days.length - 1 ? " today" : "")} title={`${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${ghs(b.cap + b.tip)}`}>
                      {b.tip > 0 && <div className="tip" style={{ height: `${(b.tip / niceMax) * 100}%` }} />}
                      <div style={{ height: `${(b.cap / niceMax) * 100}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="a-bar-x" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                {days.map((d, i) => <span key={i}>{d.getUTCDate()}</span>)}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><h2>How diners pay</h2><p>Share of captured volume, {RANGES.find((r) => r.key === range)?.label.toLowerCase()}</p></div></div>
          <div className="a-donut">
            <Donut parts={[{ v: mt.momo, c: "var(--a-accent)" }, { v: mt.card, c: "var(--a-ink)" }, { v: mt.points + mt.other, c: "#c7cbd4" }]} big={`${pct(mt.momo)}%`} small="Mobile Money" />
            <div className="a-kv">
              <div><span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--a-accent)", marginRight: 8 }} />Mobile Money</span><span>{pct(mt.momo)}% · {ghsCompact(mt.momo)}</span></div>
              <div><span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--a-ink)", marginRight: 8 }} />Card and Apple Pay</span><span>{pct(mt.card)}% · {ghsCompact(mt.card)}</span></div>
              <div><span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#c7cbd4", marginRight: 8 }} />Points and other</span><span>{pct(mt.points + mt.other)}%</span></div>
            </div>
          </div>
          <div className="a-kv a-divider">
            <div><span>Average bill</span><span>{ghs(avgBill)}</span></div>
            <div><span>Tips collected</span><span>{ghs(tips)}</span></div>
            <div><span>Failed today</span><span>{failedToday}</span></div>
          </div>
        </section>
      </div>

      <div className="a-grid-3">
        <section className="panel">
          <div className="panel-heading"><div><h2>Recent payments</h2></div><Link to="/admin/bills-payments" className="panel-link">All bills and payments</Link></div>
          <div className="a-table-wrap">
            <table>
              <thead><tr><th>Bill</th><th>Restaurant</th><th>Method</th><th className="a-num">Amount</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={6} style={{ color: "var(--a-text-2)" }}>Loading…</td></tr>
                  : all.length === 0 ? <tr><td colSpan={6} style={{ color: "var(--a-text-2)" }}>No payments yet.</td></tr>
                  : all.slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td className="a-ref">{ref(p)}</td>
                      <td>{p.restaurant_name ?? "—"}</td>
                      <td>{titleCase(p.method) || "—"}</td>
                      <td className="a-num" style={{ fontWeight: 600 }}>{ghs(p.total_pesewas)}</td>
                      <td><span className={statusClass(p)}>{p.refund_status ? "Refunded" : titleCase(p.status)}</span></td>
                      <td style={{ color: "var(--a-text-2)", whiteSpace: "nowrap" }}>{relTime(p.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="a-stack">
          <section className="panel">
            <div className="panel-heading"><div><h2>Restaurants by volume</h2></div><Link to="/admin/restaurants" className="panel-link">All</Link></div>
            {restaurants.length === 0 && !isLoading ? <p className="a-note">No restaurants yet.</p> : restaurants.slice(0, 6).map((r) => (
              <div className="a-hbar" key={r.id}>
                <div className="a-hbar-top">
                  <span>{r.name}<span className={"status-pill a-mini-pill" + (r.pos_status === "live" ? " live" : "")}>{titleCase(r.pos_status) || "—"}</span></span>
                  <span>{ghsCompact(r.volume_pesewas)}</span>
                </div>
                <div className="a-track"><div style={{ width: `${Math.max(2, ((r.volume_pesewas || 0) / topVol) * 100)}%` }} /></div>
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><h2>Needs attention</h2></div>
              <span className={"status-badge " + (attention.length ? "status-warning" : "status-success")}>{attention.length ? `${attention.length} item${attention.length > 1 ? "s" : ""}` : "All clear"}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              {attention.length === 0 ? <p className="a-note">POS connections are healthy and nothing failed today.</p>
                : attention.slice(0, 5).map((a) => (
                  <div className="a-attn" key={a.key}><i className={a.bad ? "bad" : ""} /><span><b style={{ fontWeight: 600 }}>{a.title}</b><small>{a.note}</small></span></div>
                ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading"><div><h2>Recent activity</h2></div><Link to="/admin/activity-log" className="panel-link">Activity log</Link></div>
            <div className="activity-list">
              {(data?.activity ?? []).length === 0 ? <p className="a-note">Privileged actions will show here.</p> : (data?.activity ?? []).map((a: any, i: number) => (
                <div key={i}><span className="avatar avatar-small">{(a.actor_name || "?")[0]}</span><p><b>{a.actor_name}</b> {a.action}{a.record_label ? " · " + a.record_label : ""}<small>{relTime(a.created_at)}</small></p></div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 64},${18 - (v / max) * 16}`).join(" ");
  return (
    <svg viewBox="0 0 64 20" width="64" height="20" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--a-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Donut({ parts, big, small }: { parts: { v: number; c: string }[]; big: string; small: string }) {
  const total = parts.reduce((s, p) => s + p.v, 0);
  const C = 2 * Math.PI * 46;
  let off = 0;
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={`${small} ${big} of captured volume`}>
      <circle cx="60" cy="60" r="46" fill="none" stroke="var(--a-hair)" strokeWidth="16" />
      {total > 0 && parts.map((p, i) => {
        const len = (p.v / total) * C;
        const el = <circle key={i} cx="60" cy="60" r="46" fill="none" stroke={p.c} strokeWidth="16" strokeDasharray={`${len} ${C}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />;
        off += len;
        return el;
      })}
      <text x="60" y="58" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--a-ink)">{total ? big : "–"}</text>
      <text x="60" y="74" textAnchor="middle" fontSize="10" fill="var(--a-text-2)">{small}</text>
    </svg>
  );
}
