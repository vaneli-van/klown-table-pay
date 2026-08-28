import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/points")({
  head: () => ({
    meta: [
      { title: "Klown Admin — points" },
      { name: "description", content: "Klown staff console: points." },
      { property: "og:title", content: "Klown Admin — points" },
      { property: "og:description", content: "Klown staff console: points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPoints,
});

function AdminPoints() {
  return <div className="admin-placeholder" />;
}
