import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import BrandingEditor from "@/components/BrandingEditor";
import { Toast, useToast } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const TITLE = "Branding";

export const Route = createFileRoute("/admin/branding")({
  head: () => ({
    meta: [
      { title: `Klown Admin — ${TITLE}` },
      { name: "description", content: "Set each restaurant's logo, hero image, accent colour, tagline and welcome copy for the Klown diner app." },
      { property: "og:title", content: `Klown Admin — ${TITLE}` },
      { property: "og:description", content: "Per-restaurant branding and theme editor for the Klown diner app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const [id, setId] = useState("");

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["restaurants_min", staff?.id],
    enabled: !!staff,
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const selected = restaurants.find((r) => r.id === id);

  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro">
        <div>
          <h2>Restaurant branding</h2>
          <p>Logo, hero image, accent colour, tagline and welcome copy for the diner welcome screen. Empty fields fall back to the Klown defaults.</p>
        </div>
      </section>

      <section className="directory-toolbar">
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">{isLoading ? "Loading restaurants…" : "Select a restaurant"}</option>
          {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </section>

      {selected ? (
        <BrandingEditor restaurantId={selected.id} restaurantName={selected.name} show={show} />
      ) : (
        <div className="empty-state"><h3>Pick a restaurant</h3><p>Choose a restaurant above to edit its branding.</p></div>
      )}
      <Toast text={toast} />
    </AdminLayout>
  );
}
