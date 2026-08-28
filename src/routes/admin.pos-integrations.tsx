import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/pos-integrations")({
  head: () => ({
    meta: [
      { title: "Klown Admin — pos-integrations" },
      { name: "description", content: "Klown staff console: pos-integrations." },
      { property: "og:title", content: "Klown Admin — pos-integrations" },
      { property: "og:description", content: "Klown staff console: pos-integrations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPosIntegrations,
});

function AdminPosIntegrations() {
  return <div className="admin-placeholder" />;
}
