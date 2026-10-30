import { createFileRoute } from "@tanstack/react-router";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { StudioEditor } from "@/components/StudioEditor";

export const Route = createFileRoute("/owner/menus/$menuId")({
  head: () => ({ meta: [{ title: "Klown — Menu editor" }] }),
  component: EditorRoute,
});

function EditorRoute() {
  const { menuId } = Route.useParams();
  return (
    <OwnerLayout title="Menu editor">
      <EditorBody menuId={menuId} />
    </OwnerLayout>
  );
}

// useOwner() only works inside OwnerLayout, so it is read here, not in EditorRoute.
function EditorBody({ menuId }: { menuId: string }) {
  const { show } = useOwner();
  return <StudioEditor menuId={menuId} show={show} homeBase="/owner/menus" />;
}
