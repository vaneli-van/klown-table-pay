import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Klown Admin — settings" },
      { name: "description", content: "Klown staff console: settings." },
      { property: "og:title", content: "Klown Admin — settings" },
      { property: "og:description", content: "Klown staff console: settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  return <div className="admin-placeholder" />;
}
