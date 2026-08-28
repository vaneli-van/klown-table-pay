import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/tiers")({
  head: () => ({
    meta: [
      { title: "Klown Admin — tiers" },
      { name: "description", content: "Klown staff console: tiers." },
      { property: "og:title", content: "Klown Admin — tiers" },
      { property: "og:description", content: "Klown staff console: tiers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminTiers,
});

function AdminTiers() {
  return <div className="admin-placeholder" />;
}
