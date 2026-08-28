import { createFileRoute } from "@tanstack/react-router";
import AdminLayout, { AdminPlaceholder } from "@/components/AdminLayout";

const TITLE = "Bills & Payments";

export const Route = createFileRoute("/admin/bills-payments")({
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
