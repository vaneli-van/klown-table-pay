import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/rewards")({
  head: () => ({
    meta: [
      { title: "Klown Admin — rewards" },
      { name: "description", content: "Klown staff console: rewards." },
      { property: "og:title", content: "Klown Admin — rewards" },
      { property: "og:description", content: "Klown staff console: rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminRewards,
});

function AdminRewards() {
  return <div className="admin-placeholder" />;
}
