import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "Klown Admin — support" },
      { name: "description", content: "Klown staff console: support." },
      { property: "og:title", content: "Klown Admin — support" },
      { property: "og:description", content: "Klown staff console: support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSupport,
});

function AdminSupport() {
  return <div className="admin-placeholder" />;
}
