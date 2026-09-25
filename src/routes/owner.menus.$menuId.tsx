import { createFileRoute } from "@tanstack/react-router";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { StudioEditor } from "@/components/StudioEditor";

export const Route = createFileRoute("/owner/menus/$menuId")({
  head: () => ({ meta: [{ title: "Klown — Menu editor" }] }),
  component: EditorRoute,
});

function EditorRoute() {
  const { menuId } = Route.useParams();
  const { show } = useOwner();
  return (
    <OwnerLayout title="Menu editor">
      <StudioEditor menuId={menuId} show={show} homeBase="/owner/menus" />
    </OwnerLayout>
  );
}
