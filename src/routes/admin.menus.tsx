import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/menus")({
  head: () => ({
    meta: [
      { title: "Klown Admin — menus" },
      { name: "description", content: "Klown staff console: menus." },
      { property: "og:title", content: "Klown Admin — menus" },
      { property: "og:description", content: "Klown staff console: menus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminMenus,
});

function AdminMenus() {
  return <div className="admin-placeholder" />;
}
