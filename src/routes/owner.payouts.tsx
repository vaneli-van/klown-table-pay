import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerPayouts, ownerSetSchedule, cedis, cedisShort, shortDate, titleCase, type Payouts } from "@/lib/owner-api";

const TITLE = "Payouts";
const SCHEDULES = ["daily", "weekly", "manual"];

export const Route = createFileRoute("/owner/payouts")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Your available balance, payout schedule and payout history on Klown." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <PayoutsBody />
    </OwnerLayout>
  ),
});

function statusClass(s: string) {
  const k = (s || "").toLowerCase();
  if (k === "paid") return "status-badge status-success";
  if (k === "failed" || k === "cancelled") return "status-badge status-danger";
  return "status-badge status-warning";
}

function PayoutsBody() {
  const { restaurantId, show } = useOwner();
  const qc = useQueryClient();
  const [savingSchedule, setSavingSchedule] = useState(false);

  const { data, isLoading } = useQuery<Payouts>({
    queryKey: ["owner_payouts", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerPayouts,
  });

  const settings = data?.settings ?? null;
  const accounts = data?.accounts ?? [];
  const payouts = data?.payouts ?? [];
  const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0] ?? null;

  const setSchedule = async (schedule: string) => {
    setSavingSchedule(true);
    try {
      await ownerSetSchedule(schedule);
      show(`Payout schedule set to ${schedule}`);
      qc.invalidateQueries({ queryKey: ["owner_payouts", restaurantId] });
    } catch (e: any) {
      show("Couldn't update schedule: " + (e?.message ?? "unknown error"));
    } finally {
      setSavingSchedule(false);
    }
  };

  const METRICS = [
    { label: "Available balance", value: settings ? cedisShort(settings.available_pesewas) : "…", note: "ready to pay out", cls: "green" },
    { label: "Pending", value: settings ? cedisShort(settings.pending_pesewas) : "…", note: "clearing", cls: "gold" },
    { label: "Payout fee", value: settings ? cedis(settings.payout_fee_pesewas) : "…", note: "per payout", cls: "gold" },
    { label: "Minimum payout", value: settings ? cedis(settings.min_payout_pesewas) : "…", note: "threshold", cls: "gold" },
  ];

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Payouts</h2>
          <p>Your balance, payout schedule and history. Payouts settle to your default payout account.</p>
        </div>
        <Link to="/owner/bank" className="gold-button">Manage payout account</Link>
      </section>

      <div className="metrics-grid own-metrics-4">
        {METRICS.map((m) => (
          <div className="metric-card" key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small className={m.cls}>{m.note}</small></div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Schedule</span><h2>When you get paid</h2></div></div>
          <div className="own-schedule">
            {SCHEDULES.map((s) => (
              <button
                key={s}
                className={settings?.schedule === s ? "own-schedule-opt is-on" : "own-schedule-opt"}
                onClick={() => setSchedule(s)}
                disabled={savingSchedule || settings?.schedule === s}
              >
                <b>{titleCase(s)}</b>
                <small>{s === "daily" ? "Every working day" : s === "weekly" ? "Once a week" : "You request each payout"}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Destination</span><h2>Default account</h2></div><Link to="/owner/bank" className="panel-link">Change ›</Link></div>
          {defaultAccount ? (
            <div className="location-card">
              <b style={{ fontWeight: 400 }}>{defaultAccount.provider || titleCase(defaultAccount.destination_type)} · {defaultAccount.masked}</b>
              <span>{defaultAccount.account_name || "—"}{defaultAccount.branch ? " · " + defaultAccount.branch : ""}</span>
              <small>
                <span className={defaultAccount.verification_status === "verified" ? "status-badge status-success" : "status-badge status-warning"}>{titleCase(defaultAccount.verification_status)}</span>
              </small>
            </div>
          ) : (
            <div className="empty-state"><h3>No payout account</h3><p>Add a Mobile Money or bank account so Klown can pay you.</p></div>
          )}
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-heading"><div><span className="panel-kicker">History</span><h2>Payouts</h2></div></div>
        <div className="admin-table">
          <div className="table-row own-payout-row table-head"><span>Reference</span><span>Destination</span><span>Amount</span><span>Status</span><span>Date</span></div>
          {isLoading ? (
            <div className="empty-state"><h3>Loading…</h3></div>
          ) : payouts.length === 0 ? (
            <div className="empty-state"><h3>No payouts yet</h3><p>Your payouts appear here once you start getting paid.</p></div>
          ) : (
            payouts.map((p) => (
              <div className="table-row own-payout-row" key={p.reference}>
                <span><b>{p.reference}</b></span>
                <span>{p.destination || "—"}</span>
                <span><b>{cedis(p.amount_pesewas)}</b></span>
                <span><span className={statusClass(p.status)}>{titleCase(p.status)}</span></span>
                <span>{p.paid_at ? shortDate(p.paid_at) : p.scheduled_for ? "Due " + shortDate(p.scheduled_for) : shortDate(p.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="detail-note">
        <span>Balances and payouts shown here are placeholders while your live payout provider is being connected. Once it's live, these figures come straight from settlements.</span>
      </div>
    </>
  );
}
