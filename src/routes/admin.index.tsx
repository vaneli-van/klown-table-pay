import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Klown Admin — Admin" },
      { name: "description", content: "Klown staff console: Admin." },
      { property: "og:title", content: "Klown Admin — Admin" },
      { property: "og:description", content: "Klown staff console: Admin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminIndex,
});

function AdminIndex() {
  return <div className="admin-placeholder" />;
}
