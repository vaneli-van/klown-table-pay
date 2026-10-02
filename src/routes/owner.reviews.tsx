import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerReviews, ownerReviewsSummary, relTime, type OwnerReview, type ReviewsSummary } from "@/lib/owner-api";

const TITLE = "Reviews";

export const Route = createFileRoute("/owner/reviews")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Guest feedback from your tables, with low ratings flagged for attention." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <ReviewsBody />
    </OwnerLayout>
  ),
});

function Stars({ n }: { n: number }) {
  return (
    <span className="own-stars" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? "on" : "off"}>★</span>
      ))}
    </span>
  );
}

function ratingClass(n: number) {
  if (n >= 4) return "status-badge status-success";
  if (n <= 2) return "status-badge status-danger";
  return "status-badge status-warning";
}

function ReviewsBody() {
  const { restaurantId } = useOwner();

  const { data: summary } = useQuery<ReviewsSummary>({
    queryKey: ["owner_reviews_summary", restaurantId],
    enabled: !!restaurantId,
    queryFn: () => ownerReviewsSummary(30),
  });
  const { data: reviews = [], isLoading } = useQuery<OwnerReview[]>({
    queryKey: ["owner_reviews", restaurantId],
    enabled: !!restaurantId,
    queryFn: () => ownerReviews(100),
  });

  const METRICS = [
    { label: "Avg rating · 30d", value: summary ? `${summary.avg_rating || 0}★` : "—", note: `${summary?.total ?? 0} reviews`, cls: "" },
    { label: "Needs attention", value: String(summary?.low_count ?? 0), note: "1–3 star", cls: "gold" },
    { label: "Happy guests", value: String(summary?.high_count ?? 0), note: "4–5 star", cls: "green" },
    { label: "Total · 30d", value: String(summary?.total ?? 0), note: "all ratings", cls: "" },
  ];

  const ordered = [...reviews].sort(
    (a, b) => a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Reviews</h2>
          <p>
            Guest feedback left after payment. Ratings of 1–3 stars are kept private and flagged here for your
            attention; 4–5 star guests are invited to post on Google.
          </p>
        </div>
      </section>

      <div className="metrics-grid own-metrics-4">
        {METRICS.map((m) => (
          <div className="metric-card" key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <small className={m.cls}>{m.note}</small>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Guest feedback</span>
            <h2>All reviews</h2>
          </div>
        </div>
        <div className="connection-list">
          {isLoading ? (
            <div className="empty-state"><h3>Loading…</h3></div>
          ) : reviews.length === 0 ? (
            <div className="empty-state"><h3>No reviews yet</h3><p>Guest ratings left after payment appear here.</p></div>
          ) : (
            ordered.map((r) => (
              <div key={r.id} className={r.rating < 4 ? "own-review is-low" : "own-review"}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b><Stars n={r.rating} /></b>
                  {r.comment ? (
                    <small className="own-review-comment">“{r.comment}”</small>
                  ) : (
                    <small>No comment left</small>
                  )}
                  <small>{r.table_label ? `Table ${r.table_label}` : "No table"} · {relTime(r.created_at)}</small>
                </span>
                <span className={ratingClass(r.rating)} style={{ flexGrow: 0, flexShrink: 0 }}>{r.rating}★</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
