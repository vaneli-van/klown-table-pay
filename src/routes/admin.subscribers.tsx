import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/subscribers")({
  head: () => ({
    meta: [
      { title: "Klown Admin — subscribers" },
      { name: "description", content: "Klown staff console: subscribers." },
      { property: "og:title", content: "Klown Admin — subscribers" },
      { property: "og:description", content: "Klown staff console: subscribers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSubscribers,
});

function AdminSubscribers() {
  return <div className="admin-placeholder" />;
}
