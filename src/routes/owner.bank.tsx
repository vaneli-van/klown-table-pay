import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerPayouts, ownerSaveBank, titleCase, type Payouts } from "@/lib/owner-api";

const TITLE = "Payout account";
const MOMO_PROVIDERS = ["MTN MoMo", "Telecel Cash", "AirtelTigo Money"];
const BANKS = ["GCB Bank", "Absa Bank Ghana", "Ecobank Ghana", "Stanbic Bank", "Fidelity Bank", "Zenith Bank", "Cal Bank", "Access Bank"];

export const Route = createFileRoute("/owner/bank")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Add or update the Mobile Money or bank account Klown pays your settlements to." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <BankBody />
    </OwnerLayout>
  ),
});

function BankBody() {
  const { restaurantId, show } = useOwner();
  const qc = useQueryClient();
  const [dest, setDest] = useState<"momo" | "bank">("momo");
  const [provider, setProvider] = useState("");
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [branch, setBranch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery<Payouts>({
    queryKey: ["owner_payouts", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerPayouts,
  });
  const accounts = data?.accounts ?? [];

  const providerList = dest === "momo" ? MOMO_PROVIDERS : BANKS;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) { show(dest === "momo" ? "Enter the Mobile Money number" : "Enter the account number"); return; }
    if (!holder.trim()) { show("Enter the account name"); return; }
    setSaving(true);
    try {
      await ownerSaveBank({
        destination_type: dest,
        provider: provider.trim() || null,
        account_number: number.trim(),
        account_name: holder.trim(),
        branch: dest === "bank" ? branch.trim() || null : null,
      });
      show("Payout account saved — it'll be verified before your next payout");
      setNumber(""); setHolder(""); setBranch(""); setProvider("");
      qc.invalidateQueries({ queryKey: ["owner_payouts", restaurantId] });
    } catch (e: any) {
      show("Couldn't save account: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Payout account</h2>
          <p>The Mobile Money or bank account Klown settles your payouts to. The newest account becomes your default.</p>
        </div>
      </section>

      <div className="own-theme-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Add account</span><h2>New payout account</h2></div></div>
          <form className="own-form" onSubmit={save}>
            <div className="own-field">
              <label>Type</label>
              <div className="own-seg">
                <button type="button" className={dest === "momo" ? "is-on" : ""} onClick={() => { setDest("momo"); setProvider(""); }}>Mobile Money</button>
                <button type="button" className={dest === "bank" ? "is-on" : ""} onClick={() => { setDest("bank"); setProvider(""); }}>Bank account</button>
              </div>
            </div>
            <div className="own-field">
              <label>{dest === "momo" ? "Network" : "Bank"}</label>
              <select className="wide-input" style={{ margin: 0 }} value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="">{dest === "momo" ? "Select network" : "Select bank"}</option>
                {providerList.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="own-field">
              <label>{dest === "momo" ? "Mobile Money number" : "Account number"}</label>
              <input className="wide-input" style={{ margin: 0 }} value={number} inputMode="numeric" placeholder={dest === "momo" ? "024 000 0000" : "0123456789"} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="own-field">
              <label>Account name</label>
              <input className="wide-input" style={{ margin: 0 }} value={holder} placeholder="Registered account name" onChange={(e) => setHolder(e.target.value)} />
            </div>
            {dest === "bank" && (
              <div className="own-field">
                <label>Branch</label>
                <input className="wide-input" style={{ margin: 0 }} value={branch} placeholder="Branch (optional)" onChange={(e) => setBranch(e.target.value)} />
              </div>
            )}
            <div className="own-actions">
              <button className="gold-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save payout account"}</button>
            </div>
          </form>
        </div>

        <aside className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">On file</span><h2>Your accounts</h2></div></div>
          <div className="connection-list">
            {accounts.length === 0 ? (
              <div className="empty-state"><h3>No accounts yet</h3><p>Add your first payout account on the left.</p></div>
            ) : (
              accounts.map((a) => (
                <div key={a.id}>
                  <span className="restaurant-logo">{(a.provider || a.destination_type || "?")[0].toUpperCase()}</span>
                  <span>
                    <b>{a.provider || titleCase(a.destination_type)} · {a.masked}</b>
                    <small>{a.account_name || "—"}{a.branch ? " · " + a.branch : ""}</small>
                  </span>
                  <span>
                    {a.is_default && <span className="status-pill live" style={{ marginRight: 6 }}>Default</span>}
                    <span className={a.verification_status === "verified" ? "status-badge status-success" : "status-badge status-warning"}>{titleCase(a.verification_status)}</span>
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="detail-note"><span>New accounts start as pending and are verified before your next payout. Adding an account makes it your default.</span></div>
        </aside>
      </div>
    </>
  );
}
