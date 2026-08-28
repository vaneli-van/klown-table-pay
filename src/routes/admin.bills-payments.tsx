import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bills-payments")({
  head: () => ({
    meta: [
      { title: "Klown Admin — bills-payments" },
      { name: "description", content: "Klown staff console: bills-payments." },
      { property: "og:title", content: "Klown Admin — bills-payments" },
      { property: "og:description", content: "Klown staff console: bills-payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminBillsPayments,
});

function AdminBillsPayments() {
  return <div className="admin-placeholder" />;
}
