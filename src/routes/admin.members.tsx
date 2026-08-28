import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/members")({
  head: () => ({
    meta: [
      { title: "Klown Admin — members" },
      { name: "description", content: "Klown staff console: members." },
      { property: "og:title", content: "Klown Admin — members" },
      { property: "og:description", content: "Klown staff console: members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminMembers,
});

function AdminMembers() {
  return <div className="admin-placeholder" />;
}
