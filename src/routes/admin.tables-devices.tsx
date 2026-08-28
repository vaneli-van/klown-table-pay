import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/tables-devices")({
  head: () => ({
    meta: [
      { title: "Klown Admin — tables-devices" },
      { name: "description", content: "Klown staff console: tables-devices." },
      { property: "og:title", content: "Klown Admin — tables-devices" },
      { property: "og:description", content: "Klown staff console: tables-devices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminTablesDevices,
});

function AdminTablesDevices() {
  return <div className="admin-placeholder" />;
}
