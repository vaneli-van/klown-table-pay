import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/auth/$screen")({
  head: () => ({
    meta: [
      { title: "Klown Admin — Access" },
      { name: "description", content: "Klown staff access screens." },
      { property: "og:title", content: "Klown Admin — Access" },
      { property: "og:description", content: "Klown staff access screens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAuthScreen,
});

function AdminAuthScreen() {
  return <div className="admin-placeholder" />;
}
