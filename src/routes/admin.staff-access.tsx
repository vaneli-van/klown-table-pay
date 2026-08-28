import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/staff-access")({
  head: () => ({
    meta: [
      { title: "Klown Admin — staff-access" },
      { name: "description", content: "Klown staff console: staff-access." },
      { property: "og:title", content: "Klown Admin — staff-access" },
      { property: "og:description", content: "Klown staff console: staff-access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminStaffAccess,
});

function AdminStaffAccess() {
  return <div className="admin-placeholder" />;
}
