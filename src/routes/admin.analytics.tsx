import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
const GOLD = "#c8a56b";
const TRACK = "#e9e2d4";

function fmtDur(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function Bar({ label, value, pct, note }: { label: string; value: string; pct: number; note?: string }) {
  return (
    <div style={{ margin: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span><b>{value}</b>
      </div>
      <div style={{ height: 8, background: TRACK }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: GOLD }} />
      </div>
      {note ? <small style={{ color: "var(--muted)", fontSize: 11 }}>{note}</small> : null}
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

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div><h2>Diner analytics</h2><p>Funnel, drop-off and behaviour across all restaurants. Last {days} days.</p></div>
      </section>

      <div className="member-toolbar">
        <select value={rid} onChange={(e) => setRid(e.target.value)}>
          <option value="">All restaurants</option>
          {rests.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map((d) => (
            <button key={d} className={d === days ? "gold-button" : "outline-button"} onClick={() => setDays(d)}>{d}d</button>
          ))}
        </div>
      </div>

      {error ? <div className="restaurant-table" style={{ padding: 16 }}>Could not load analytics. {String((error as any)?.message ?? "")}</div> : null}

      {!isLoading && !hasBrowsing && (
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 12px" }}>
          Browsing steps (visits, menu, bill, time-on-screen, repeat visitors) start filling from when diner tracking went live. Payment figures below are complete.
        </p>
      )}

      <div className="member-kpis">
        <div><span>Revenue</span><b>{data ? ghsCompact(f!.revenue_pesewas) : "…"}</b><small className="green">completed</small></div>
        <div><span>Payments completed</span><b>{data ? f!.payments_succeeded : "…"}</b><small>{data ? `${f!.payments_started} started` : ""}</small></div>
        <div><span>Conversion</span><b>{data ? `${conv}%` : "…"}</b><small>{hasBrowsing ? "of visits" : "of started"}</small></div>
        <div><span>Repeat visitors</span><b>{data ? `${data.repeat.pct}%` : "…"}</b><small>{data ? `${data.repeat.returning_visitors}/${data.repeat.total_visitors}` : ""}</small></div>
      </div>
      <div className="member-kpis">
        <div><span>Avg time to pay</span><b>{data ? fmtDur(data.avg_time_to_pay_seconds) : "…"}</b><small>scan to paid</small></div>
        <div><span>Avg tip</span><b>{data ? `${data.tip.avg_pct}%` : "…"}</b><small>{data ? `${ghs(data.tip.total_tips_pesewas)} total` : ""}</small></div>
        <div><span>Split-bill usage</span><b>{data ? `${data.split_usage.pct}%` : "…"}</b><small>{data ? `${data.split_usage.sessions_split}/${data.split_usage.sessions_total} sessions` : ""}</small></div>
        <div><span>Tips collected</span><b>{data ? ghsCompact(data.tip.total_tips_pesewas) : "…"}</b><small>in period</small></div>
      </div>

      <div className="restaurant-table" style={{ padding: "16px 18px", marginTop: 8 }}>
        <h3 style={{ margin: "0 0 6px" }}>Where diners drop off</h3>
        {steps.length === 0 ? <p style={{ color: "var(--muted)" }}>No data yet.</p> : steps.map((st, i) => {
          const prev = i > 0 ? steps[i - 1].value : null;
          const drop = prev && prev > 0 ? Math.round((1 - st.value / prev) * 100) : null;
          return <Bar key={st.label} label={st.label} value={String(st.value)} pct={(st.value / denom) * 100} note={drop != null ? `${drop}% drop from previous` : "top of funnel"} />;
        })}
      </div>

      <div className="restaurant-table" style={{ marginTop: 16 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: "1.4fr .8fr .8fr .8fr 1fr", minWidth: 720 }}>
          <span>Restaurant</span><span>Visits</span><span>Started</span><span>Completed</span><span>Revenue</span>
        </div>
        {byRest.length === 0 ? <div style={{ padding: 16, color: "var(--muted)" }}>No activity yet.</div> :
          byRest.map((r) => (
            <div className="restaurant-table-row" key={r.restaurant} style={{ gridTemplateColumns: "1.4fr .8fr .8fr .8fr 1fr", minWidth: 720 }}>
              <span><b>{r.restaurant}</b></span><span>{r.visits}</span><span>{r.payments_started}</span><span>{r.payments_succeeded}</span><span><b>{ghs(r.revenue_pesewas)}</b></span>
            </div>
          ))}
      </div>

      <div className="restaurant-table" style={{ marginTop: 16 }}>
        <div className="restaurant-table-head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1.2fr", minWidth: 560 }}>
          <span>Table</span><span>Visits</span><span>Payments</span><span>Revenue</span>
        </div>
        {byTable.length === 0 ? <div style={{ padding: 16, color: "var(--muted)" }}>No table activity yet.</div> :
          byTable.slice(0, 30).map((t) => (
            <div className="restaurant-table-row" key={t.table_label} style={{ gridTemplateColumns: "1fr 1fr 1fr 1.2fr", minWidth: 560 }}>
              <span><b>Table {t.table_label}</b></span><span>{t.visits}</span><span>{t.payments}</span><span><b>{ghs(t.revenue_pesewas)}</b></span>
            </div>
          ))}
      </div>

      <div className="restaurant-table" style={{ padding: "16px 18px", marginTop: 16 }}>
        <h3 style={{ margin: "0 0 10px" }}>Busiest hours (Accra)</h3>
        {byHour.every((h) => h.visits === 0 && h.payments === 0) ? <p style={{ color: "var(--muted)" }}>No activity yet.</p> : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110 }}>
            {byHour.map((h) => (
              <div key={h.hour} title={`${h.hour}:00 — ${h.visits} visits, ${h.payments} payments`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ height: `${((h.visits + h.payments) / maxHour) * 100}%`, minHeight: h.visits + h.payments ? 2 : 0, background: GOLD }} />
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 11, marginTop: 4 }}><span>00:00</span><span>12:00</span><span>23:00</span></div>
      </div>

      <div className="restaurant-table" style={{ padding: "16px 18px", marginTop: 16 }}>
        <h3 style={{ margin: "0 0 6px" }}>Time on each screen</h3>
        {tos.length === 0 ? <p style={{ color: "var(--muted)" }}>Collecting data.</p> :
          tos.slice(0, 10).map((t) => <Bar key={t.screen} label={scr(t.screen)} value={fmtDur(t.avg_seconds)} pct={(t.avg_seconds / maxTos) * 100} note={`${t.views} views`} />)}
      </div>

      <div className="restaurant-table" style={{ padding: "16px 18px", marginTop: 16, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 6px" }}>How diners pay</h3>
        {methods.length === 0 ? <p style={{ color: "var(--muted)" }}>No payments yet.</p> :
          methods.map((m) => {
            const pct = Math.round((m.revenue_pesewas / methodTotal) * 100);
            return <Bar key={m.method} label={titleCase(m.method)} value={`${pct}%`} pct={pct} note={`${ghs(m.revenue_pesewas)} · ${m.count} txns`} />;
          })}
      </div>

      {isLoading && <p style={{ color: "var(--muted)" }}>Loading analytics…</p>}
    </AdminLayout>
  );
}
