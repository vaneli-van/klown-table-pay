import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/restaurants")({
  head: () => ({
    meta: [
      { title: "Klown Admin — restaurants" },
      { name: "description", content: "Klown staff console: restaurants." },
      { property: "og:title", content: "Klown Admin — restaurants" },
      { property: "og:description", content: "Klown staff console: restaurants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminRestaurants,
});

function AdminRestaurants() {
  return <div className="admin-placeholder" />;
}
