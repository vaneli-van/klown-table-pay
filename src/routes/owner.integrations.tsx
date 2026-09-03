import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerIntegrations, relTime, titleCase, type Integrations } from "@/lib/owner-api";

const TITLE = "Integrations";

export const Route = createFileRoute("/owner/integrations")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Your restaurant's POS connections, on-prem connectors and reviews link on Klown." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <IntegrationsBody />
    </OwnerLayout>
  ),
});

function IntegrationsBody() {
  const { restaurantId, name } = useOwner();
  const { data, isLoading } = useQuery<Integrations>({
    queryKey: ["owner_integrations", restaurantId],
    enabled: !!restaurantId,
    queryFn: ownerIntegrations,
  });

  const pos = data?.pos ?? [];
  const connectors = data?.connectors ?? [];

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Integrations</h2>
          <p>How {name} connects to Klown: your point-of-sale, any on-prem connectors and your Google reviews link.</p>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">Point of sale</span><h2>POS connections</h2></div></div>
          <div className="connection-list">
            {isLoading ? (
              <div className="empty-state"><h3>Loading…</h3></div>
            ) : pos.length === 0 ? (
              <div className="empty-state"><h3>No POS connected</h3><p>Klown links your POS so orders flow into the diner app automatically.</p></div>
            ) : (
              pos.map((p, i) => (
                <div key={i}>
                  <span className="restaurant-logo">{(p.provider || "?")[0].toUpperCase()}</span>
                  <span>
                    <b>{titleCase(p.provider)}{p.branch ? " · " + p.branch : ""}</b>
                    <small><span className={"health-dot" + (p.health === "healthy" ? "" : " warn")} />{titleCase(p.health) || "Unknown"} · synced {relTime(p.last_sync_at)}</small>
                  </span>
                  <span className={p.status === "live" ? "status-pill live" : "status-pill"}>{titleCase(p.status)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><div><span className="panel-kicker">On-prem</span><h2>Connectors</h2></div></div>
          <div className="connection-list">
            {isLoading ? (
              <div className="empty-state"><h3>Loading…</h3></div>
            ) : connectors.length === 0 ? (
              <div className="empty-state"><h3>No connectors</h3><p>On-prem connectors (e.g. SambaPOS) show here when installed.</p></div>
            ) : (
              connectors.map((c, i) => (
                <div key={i}>
                  <span className="restaurant-logo">{(c.provider || "?")[0].toUpperCase()}</span>
                  <span>
                    <b>{c.name || titleCase(c.provider)}</b>
                    <small><span className={"health-dot" + (c.active ? "" : " warn")} />{c.active ? "Active" : "Inactive"} · seen {relTime(c.last_seen_at)}</small>
                  </span>
                  <span className={c.active ? "status-pill live" : "status-pill"}>{c.active ? "Live" : "Offline"}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-heading"><div><span className="panel-kicker">Reviews</span><h2>Google reviews link</h2></div></div>
        {data?.google_place_id ? (
          <div className="location-card">
            <span>Google Place ID</span>
            <b style={{ fontWeight: 400, wordBreak: "break-all" }}>{data.google_place_id}</b>
            <small>Diners are invited to leave a Google review after paying.</small>
          </div>
        ) : (
          <div className="empty-state"><h3>No reviews link yet</h3><p>Ask the Klown team to add your Google Place ID to enable post-payment review invites.</p></div>
        )}
      </div>

      <div className="detail-note">
        <span>Integrations are provisioned and maintained by the Klown team. To connect a new POS, add a connector or change your reviews link, contact support.</span>
      </div>
    </>
  );
}
