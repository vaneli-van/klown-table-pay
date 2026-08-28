import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Klown Admin — notifications" },
      { name: "description", content: "Klown staff console: notifications." },
      { property: "og:title", content: "Klown Admin — notifications" },
      { property: "og:description", content: "Klown staff console: notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminNotifications,
});

function AdminNotifications() {
  return <div className="admin-placeholder" />;
}
