import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/activity-log")({
  head: () => ({
    meta: [
      { title: "Klown Admin — activity-log" },
      { name: "description", content: "Klown staff console: activity-log." },
      { property: "og:title", content: "Klown Admin — activity-log" },
      { property: "og:description", content: "Klown staff console: activity-log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminActivityLog,
});

function AdminActivityLog() {
  return <div className="admin-placeholder" />;
}
