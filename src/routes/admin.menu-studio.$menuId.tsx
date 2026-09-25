import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";
import { StudioEditor } from "@/components/StudioEditor";

export const Route = createFileRoute("/admin/menu-studio/$menuId")({
  head: () => ({ meta: [{ title: "Klown Admin — Menu editor" }] }),
  component: Page,
});

function Page() {
  const { menuId } = Route.useParams();
  const { toast, show } = useToast();
  return (
    <AdminLayout title="Menu Studio">
      <StudioEditor menuId={menuId} show={show} homeBase="/admin/menu-studio" />
      <Toast text={toast} />
    </AdminLayout>
  );
}
