import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerSettlement, type Settlement } from "@/lib/owner-api";

const TITLE = "Settlement account";

export const Route = createFileRoute("/owner/bank")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "The bank account your Klown payments settle to." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <BankBody />
    </OwnerLayout>
  ),
});

function BankBody() {
  const { restaurantId } = useOwner();
  const { data, isLoading } = useQuery<Settlement>({
    queryKey: ["owner_settlement", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerSettlement,
  });
  const connected = !!data?.connected;

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Settlement account</h2>
          <p>The bank account that receives your Klown payments. Changes go through our team so nobody can redirect your money from a logged-in browser.</p>
        </div>
        <Link to="/owner/payouts" className="gold-button">Back to settlement</Link>
      </section>

      <div className="own-theme-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">On file</span><h2>Your account</h2></div></div>
          {isLoading ? (
            <div className="empty-state"><h3>Loading…</h3></div>
          ) : connected ? (
            <div className="detail-list">
              <div className="detail-row"><span>Bank</span><b>{data?.bank_name || "Bank account"}</b></div>
              <div className="detail-row"><span>Account number</span><b>{data?.masked || "—"}</b></div>
              <div className="detail-row"><span>Account name</span><b>{data?.account_name || "—"}</b></div>
              <div className="detail-row"><span>Status</span><b><span className="status-badge status-success">Connected</span></b></div>
            </div>
          ) : (
            <div className="empty-state"><h3>No account connected</h3><p>Until your bank account is connected, Klown collects your payments and transfers them to you manually.</p></div>
          )}
        </div>

        <aside className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Changes</span><h2>{connected ? "Change your account" : "Connect your account"}</h2></div></div>
          <div className="detail-list">
            <div className="detail-row"><span>1</span><b>Send us the bank name, account number and the registered account name.</b></div>
            <div className="detail-row"><span>2</span><b>We verify the account with the bank and connect it to your Klown settlement.</b></div>
            <div className="detail-row"><span>3</span><b>From the next payment on, money settles straight to the new account.</b></div>
          </div>
          <div className="own-actions" style={{ marginTop: 16 }}>
            <Link to="/owner/support" className="gold-button">Send bank details to support</Link>
          </div>
          <div className="detail-note"><span>For your safety, never share your bank details over chat or email with anyone claiming to be Klown. Use the support page here.</span></div>
        </aside>
      </div>
    </>
  );
}
