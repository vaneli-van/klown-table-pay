import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ghs, ghsCompact, titleCase } from "@/lib/format";

const TITLE = "Analytics";
export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: "Klown staff console: diner funnel and behaviour analytics across all restaurants." }] }),
  component: Page,
});

type Analytics = {
  range: { from: string; to: string; days: number };
  funnel: { visits: number; viewed_menu: number; viewed_bill: number; reached_checkout: number; payments_started: number; payments_succeeded: number; revenue_pesewas: number };
  by_restaurant: { restaurant: string; visits: number; viewed_menu: number; viewed_bill: number; reached_checkout: number; payments_started: number; payments_succeeded: number; revenue_pesewas: number }[];
  daily: { day: string; visits: number; payments: number; revenue_pesewas: number }[];
  by_hour: { hour: number; visits: number; payments: number }[];
  by_table: { table_label: string; visits: number; payments: number; revenue_pesewas: number }[];
  time_on_screen: { screen: string; avg_seconds: number; views: number }[];
  avg_time_to_pay_seconds: number | null;
  split_usage: { sessions_total: number; sessions_split: number; pct: number };
  tip: { total_tips_pesewas: number; avg_pct: number };
  repeat: { total_visitors: number; returning_visitors: number; pct: number };
  method_split: { method: string; count: number; revenue_pesewas: number }[];
};

const SCREEN_LABEL: Record<string, string> = {
  welcome: "Welcome", menu: "Menu", category: "Menu category", dish: "Dish detail", bill: "Bill",
  "bill-ready": "Bill (ready)", pay: "Pay", "full-check": "Full bill", recommendation: "Recommendation",
  split: "Split bill", "split-items": "Split by item", "split-lobby": "Split lobby", "split-share": "Split share",
  tip: "Tip", review: "Review", method: "Payment method", momo: "Mobile money", authorise: "Authorise",
  processing: "Processing", success: "Success", "receipt-choice": "Receipt", feedback: "Feedback",
};
const scr = (s: string) => SCREEN_LABEL[s] || s;
function fmtDur(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function HBar({ label, value, pct, note, ink }: { label: string; value: string; pct: number; note?: string; ink?: boolean }) {
  return (
    <div className="a-hbar">
      <div className="a-hbar-top"><span>{label}</span><span><b style={{ color: "var(--a-ink)" }}>{value}</b>{note ? ` · ${note}` : ""}</span></div>
      <div className={"a-track" + (ink ? " ink" : "")}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
    </div>
  );
}

function Page() {
  const { staff } = useAuth();
  const [days, setDays] = useState(7);
  const [rid, setRid] = useState<string>("");

  const { data: rests = [] } = useQuery({
    queryKey: ["admin_rest_dir", staff?.id],
    enabled: !!staff,
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const { data, error } = await supabase.from("admin_restaurant_directory").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_analytics", staff?.id, days, rid],
    enabled: !!staff,
    queryFn: async (): Promise<Analytics> => {
      const { data, error } = await supabase.rpc("admin_analytics", { p_days: days, p_restaurant_id: rid || null });
      if (error) throw error;
      return data as Analytics;
    },
  });

  const f = data?.funnel;
  const hasBrowsing = (f?.visits ?? 0) > 0;
  const denom = Math.max(1, f?.visits ?? 0, f?.payments_started ?? 0);
  const conv = f && f.visits > 0 ? Math.round((f.payments_succeeded / f.visits) * 100)
    : f && f.payments_started > 0 ? Math.round((f.payments_succeeded / f.payments_started) * 100) : 0;

  const steps = f ? [
    { label: "Visits (scanned)", value: f.visits },
    { label: "Viewed menu", value: f.viewed_menu },
    { label: "Viewed bill", value: f.viewed_bill },
    { label: "Reached checkout", value: f.reached_checkout },
    { label: "Payment started", value: f.payments_started },
    { label: "Payment completed", value: f.payments_succeeded },
  ] : [];

  const byRest = data?.by_restaurant ?? [];
  const byTable = data?.by_table ?? [];
  const byHour = data?.by_hour ?? [];
  const maxHour = Math.max(1, ...byHour.map((h) => h.visits + h.payments));
  const tos = data?.time_on_screen ?? [];
  const maxTos = Math.max(1, ...tos.map((t) => t.avg_seconds));
  const methods = data?.method_split ?? [];
  const methodTotal = Math.max(1, methods.reduce((s, m) => s + m.revenue_pesewas, 0));

  // "Viewed menu" is optional (diners can go straight to the bill), so it is
  // shown against visits but left out of the step-to-step chain.
  const prevOf = (i: number) => (i === 0 ? -1 : i === 1 || i === 2 ? 0 : i - 1);
  const drops = steps.map((st, i) => {
    const pi = prevOf(i);
    const prev = pi >= 0 ? steps[pi].value : null;
    return prev && prev > 0 ? Math.round(((st.value - prev) / prev) * 100) : null;
  });
  let worst = -1;
  drops.forEach((d, i) => { if (i !== 1 && d != null && d < 0 && (worst < 0 || d < (drops[worst] ?? 0))) worst = i; });
  const peakHour = byHour.reduce((best, h) => (h.visits + h.payments > (best?.visits ?? -1) + (best?.payments ?? 0) ? h : best), byHour[0]);
  const restName = rid ? rests.find((r) => r.id === rid)?.name ?? "One restaurant" : "All restaurants";
  const v = (s: string) => (data ? s : "…");

  return (
    <AdminLayout
      title={TITLE}
      subtitle={<>Diner funnel, drop-off and behaviour · {restName} · last {days} days</>}
      actions={<>
        <select aria-label="Restaurant" value={rid} onChange={(e) => setRid(e.target.value)}>
          <option value="">All restaurants</option>
          {rests.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div className="a-seg" role="group" aria-label="Date range">
          {[7, 30, 90].map((d) => <button key={d} className={d === days ? "on" : ""} aria-pressed={d === days} onClick={() => setDays(d)}>{d} days</button>)}
        </div>
        <button className="outline-button" disabled={!data} onClick={() => data && downloadCsv(`analytics-${days}d.csv`, byRest)}><Download size={16} />Export</button>
      </>}
    >
      {error ? <div className="a-error">Could not load analytics. {String((error as any)?.message ?? "")}</div> : null}
      {!isLoading && data && !hasBrowsing && (
        <div className="detail-note" style={{ marginBottom: 16 }}>
          Browsing steps (visits, menu, bill, time on screen, repeat visitors) fill from when diner tracking went live. Payment figures are complete.
        </div>
      )}

      <div className="member-kpis">
        <div><span>Revenue</span><b>{v(ghsCompact(f?.revenue_pesewas))}</b><small>from completed payments</small></div>
        <div><span>Payments completed</span><b>{v(String(f?.payments_succeeded ?? 0))}</b><small>{f ? `of ${f.payments_started} started${f.payments_started ? ` · ${Math.round((f.payments_succeeded / f.payments_started) * 100)}%` : ""}` : ""}</small></div>
        <div><span>Conversion</span><b>{v(`${conv}%`)}</b><small>{hasBrowsing ? `of ${f?.visits ?? 0} visits` : "of payments started"}</small></div>
        <div><span>Repeat visitors</span><b>{v(`${data?.repeat.pct ?? 0}%`)}</b><small>{data ? `${data.repeat.returning_visitors} of ${data.repeat.total_visitors} devices` : ""}</small></div>
        <div><span>Time to pay</span><b>{v(fmtDur(data?.avg_time_to_pay_seconds))}</b><small>average, scan to paid</small></div>
        <div><span>Average tip</span><b>{v(`${data?.tip.avg_pct ?? 0}%`)}</b><small>{data ? `${ghsCompact(data.tip.total_tips_pesewas)} collected` : ""}</small></div>
        <div><span>Split bills</span><b>{v(`${data?.split_usage.pct ?? 0}%`)}</b><small>{data ? `${data.split_usage.sessions_split} of ${data.split_usage.sessions_total} sessions` : ""}</small></div>
        <div><span>Sessions</span><b>{v(String(data?.split_usage.sessions_total ?? 0))}</b><small>table sessions opened</small></div>
      </div>

      <div className="a-grid-3" style={{ marginTop: 0 }}>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Where diners drop off</h2><p>Bars are a share of visits; the right column is the change from the step before (menu is optional, so the bill is compared with visits)</p></div>
            {worst > 0 && <span className="status-badge status-danger">Biggest loss: {steps[prevOf(worst)].label.toLowerCase()} to {steps[worst].label.toLowerCase()}, {drops[worst]}%</span>}
          </div>
          {steps.length === 0 ? <p className="a-note">{isLoading ? "Loading…" : "No data yet."}</p> : steps.map((st, i) => {
            const d = drops[i];
            const cls = i === 1 || d == null ? "" : d <= -50 ? "bad" : d < 0 ? "warn" : "good";
            return (
              <div key={st.label} className={"a-funnel-row" + (i === steps.length - 1 ? " last" : "")}>
                <span>{st.label}</span>
                <div className="a-funnel-track"><div style={{ width: `${Math.max(0, Math.min(100, (st.value / denom) * 100))}%` }} /></div>
                <b className="a-num">{st.value.toLocaleString("en-GH")}</b>
                <span className={"a-drop " + cls}>{i === 0 ? "top" : i === 1 ? "optional" : d == null ? "—" : `${d > 0 ? "+" : ""}${d}%`}</span>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <div className="panel-heading"><div><h2>Busiest hours</h2><p>Visits and payments by hour, Accra time</p></div></div>
          {byHour.every((h) => h.visits === 0 && h.payments === 0) ? <p className="a-note">{isLoading ? "Loading…" : "No activity yet."}</p> : (<>
            <div className="a-hours" role="img" aria-label={`Activity by hour; busiest is ${peakHour?.hour}:00`}>
              {Array.from({ length: 24 }, (_, hr) => {
                const h = byHour.find((x) => x.hour === hr);
                const n = h ? h.visits + h.payments : 0;
                return <div key={hr} className={h && h === peakHour ? "peak" : ""} title={`${String(hr).padStart(2, "0")}:00 · ${h?.visits ?? 0} visits, ${h?.payments ?? 0} payments`} style={{ height: `${(n / maxHour) * 100}%`, minHeight: n ? 2 : 0 }} />;
              })}
            </div>
            <div className="a-hours-x"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
            {peakHour && <p className="a-note">Busiest around {String(peakHour.hour).padStart(2, "0")}:00.</p>}
          </>)}
        </section>
      </div>

      <div className="a-grid-3">
        <section className="panel">
          <div className="panel-heading"><div><h2>By restaurant</h2></div></div>
          <div className="a-table-wrap">
            <table>
              <thead><tr><th>Restaurant</th><th className="a-num">Visits</th><th className="a-num">Viewed bill</th><th className="a-num">Started</th><th className="a-num">Completed</th><th>Scan to pay</th><th className="a-num">Revenue</th></tr></thead>
              <tbody>
                {byRest.length === 0 ? <tr><td colSpan={7} style={{ color: "var(--a-text-2)" }}>{isLoading ? "Loading…" : "No activity yet."}</td></tr> : byRest.map((r) => {
                  const c = r.visits > 0 ? Math.round((r.payments_succeeded / r.visits) * 1000) / 10 : 0;
                  return (
                    <tr key={r.restaurant}>
                      <td style={{ fontWeight: 600 }}>{r.restaurant}</td>
                      <td className="a-num">{r.visits}</td><td className="a-num">{r.viewed_bill}</td><td className="a-num">{r.payments_started}</td><td className="a-num">{r.payments_succeeded}</td>
                      <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="a-track" style={{ width: 80 }}><div style={{ width: `${Math.min(100, c)}%` }} /></div><span style={{ fontSize: 12, color: "var(--a-text-2)" }}>{r.visits > 0 ? `${c}%` : "—"}</span></div></td>
                      <td className="a-num" style={{ fontWeight: 600 }}>{ghs(r.revenue_pesewas)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="a-stack">
          <section className="panel">
            <div className="panel-heading"><div><h2>Time on screen</h2><p>Average per diner screen</p></div></div>
            {tos.length === 0 ? <p className="a-note">Collecting data.</p> :
              tos.slice(0, 8).map((t) => <HBar key={t.screen} ink label={scr(t.screen)} value={fmtDur(t.avg_seconds)} note={`${t.views} views`} pct={(t.avg_seconds / maxTos) * 100} />)}
          </section>
          <section className="panel">
            <div className="panel-heading"><div><h2>How diners pay</h2></div></div>
            {methods.length === 0 ? <p className="a-note">No payments yet.</p> :
              methods.map((m) => {
                const pct = Math.round((m.revenue_pesewas / methodTotal) * 100);
                return <HBar key={m.method} label={titleCase(m.method)} value={`${pct}%`} note={`${ghsCompact(m.revenue_pesewas)} · ${m.count} payments`} pct={pct} />;
              })}
          </section>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-heading"><div><h2>By table</h2><p>Top 30 tables by activity</p></div></div>
        <div className="a-table-wrap">
          <table>
            <thead><tr><th>Table</th><th className="a-num">Visits</th><th className="a-num">Payments</th><th className="a-num">Revenue</th></tr></thead>
            <tbody>
              {byTable.length === 0 ? <tr><td colSpan={4} style={{ color: "var(--a-text-2)" }}>No table activity yet.</td></tr> : byTable.slice(0, 30).map((t) => (
                <tr key={t.table_label}><td style={{ fontWeight: 600 }}>Table {t.table_label}</td><td className="a-num">{t.visits}</td><td className="a-num">{t.payments}</td><td className="a-num" style={{ fontWeight: 600 }}>{ghs(t.revenue_pesewas)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
