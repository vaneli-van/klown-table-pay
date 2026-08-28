import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AdminLayout";

export const Route = createFileRoute("/admin/auth/$screen")({
  head: () => ({ meta: [{ title: "Klown Admin — Staff access" }] }),
  component: () => <AuthGate />,
});
