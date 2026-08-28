import { createFileRoute } from "@tanstack/react-router";
import AdminLayout, { AdminPlaceholder } from "@/components/AdminLayout";

const TITLE = "Tables & Devices";

export const Route = createFileRoute("/admin/tables-devices")({
  head: () => ({
    meta: [
      { title: `Klown Admin — ${TITLE}` },
      { name: "description", content: `Klown staff console: ${TITLE}.` },
      { property: "og:title", content: `Klown Admin — ${TITLE}` },
      { property: "og:description", content: `Klown staff console: ${TITLE}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AdminLayout title={TITLE}>
      <AdminPlaceholder title={TITLE} />
    </AdminLayout>
  );
}
