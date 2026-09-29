import { Fragment, useState } from "react";
import { cedis, methodLabel, titleCase } from "@/lib/owner-api";

export type SplitShare = {
  id?: string;
  name?: string | null;
  label?: string | null;
  amount_pesewas: number;
  status: string;
  method?: string | null;
  tip_pesewas?: number | null;
  provider_ref?: string | null;
  paid_at?: string | null;
};
export type SplitBill = {
  id?: string;
  split_id?: string;
  table_label?: string | null;
  restaurant_name?: string | null;
  mode: string;
  status: string;
  paid_pesewas: number;
  split_total_pesewas: number;
  paid_count: number;
  share_count: number;
  created_at: string;
  shares?: SplitShare[] | null;
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const isOutstanding = (s: SplitBill) => s.status === "open" && (s.paid_count ?? 0) < (s.share_count ?? 0);

export function sortSplits(list: SplitBill[]) {
  return [...list].sort((a, b) => {
    const d = Number(isOutstanding(b)) - Number(isOutstanding(a));
    return d || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

const shareBadge = (s: string) =>
  s === "paid" ? "status-badge status-success" : s === "paying" ? "status-badge status-warning" : "status-badge";

export default function SplitBillsTable({ splits, loading, error, showRestaurant }: {
  splits: SplitBill[]; loading: boolean; error?: unknown; showRestaurant?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const cols = showRestaurant ? "1fr 1.1fr .8fr 1fr 1.2fr .7fr 1fr" : "1fr .8fr 1fr 1.2fr .7fr 1fr";
  const shareCols = "1.2fr 1fr .8fr 1fr .8fr 1fr 1fr";
  const rows = sortSplits(splits);

  return (
    <div className="restaurant-table">
      <div className="restaurant-table-head" style={{ gridTemplateColumns: cols, minWidth: 820 }}>
        <span>Table</span>{showRestaurant && <span>Restaurant</span>}<span>Mode</span><span>Status</span><span>Paid</span><span>Shares</span><span>Created</span>
      </div>
      {loading ? <div className="empty-state"><h3>Loading split bills…</h3></div>
        : error ? <div className="empty-state"><h3>Couldn't load</h3><p>{(error as any)?.message ?? "Error"}</p></div>
        : rows.length === 0 ? <div className="empty-state"><h3>No split bills yet</h3><p>Bills diners split in the last 30 days appear here.</p></div>
        : rows.map((s, i) => {
          const key = s.id ?? s.split_id ?? String(i);
          const out = isOutstanding(s);
          const expanded = open === key;
          return (
            <Fragment key={key}>
              <button className="restaurant-table-row" onClick={() => setOpen(expanded ? null : key)}
                style={{ gridTemplateColumns: cols, minWidth: 820, width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #e7e2da", background: expanded ? "#f3f0e9" : "transparent", cursor: "pointer" }}>
                <span><b>{s.table_label ? "Table " + s.table_label : "—"}</b></span>
                {showRestaurant && <span>{s.restaurant_name ?? "—"}</span>}
                <span>{titleCase(s.mode)}</span>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className={s.status === "settled" ? "status-badge status-success" : "status-badge"}>{titleCase(s.status)}</span>
                  {out && <span className="status-badge status-warning">Outstanding</span>}
                </span>
                <span><b>{cedis(s.paid_pesewas)}</b> <small>of {cedis(s.split_total_pesewas)}</small></span>
                <span>{s.paid_count ?? 0} / {s.share_count ?? 0}</span>
                <span>{fmt(s.created_at)}</span>
              </button>
              {expanded && (
                <div style={{ background: "#fbfaf7", borderBottom: "1px solid #e7e2da", padding: "6px 15px 12px", minWidth: 820 }}>
                  <div className="restaurant-table-head" style={{ gridTemplateColumns: shareCols }}>
                    <span>Name</span><span>Amount</span><span>Status</span><span>Method</span><span>Tip</span><span>Ref</span><span>Paid at</span>
                  </div>
                  {(s.shares ?? []).length === 0 ? <div className="empty-state"><p>No shares recorded.</p></div>
                    : (s.shares ?? []).map((sh, j) => (
                      <div key={sh.id ?? j} className="restaurant-table-row" style={{ gridTemplateColumns: shareCols }}>
                        <span><b>{sh.name || sh.label || `Share ${j + 1}`}</b></span>
                        <span>{cedis(sh.amount_pesewas)}</span>
                        <span><span className={shareBadge(sh.status)}>{titleCase(sh.status)}</span></span>
                        <span>{sh.method ? methodLabel(sh.method) : "—"}</span>
                        <span>{sh.tip_pesewas ? cedis(sh.tip_pesewas) : "—"}</span>
                        <span>{sh.provider_ref ? "#" + sh.provider_ref.slice(-6) : "—"}</span>
                        <span>{fmt(sh.paid_at)}</span>
                      </div>
                    ))}
                </div>
              )}
            </Fragment>
          );
        })}
    </div>
  );
}
