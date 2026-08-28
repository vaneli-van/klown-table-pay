import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Toast, useToast } from "@/components/prototype";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const TITLE = "Tiers";
export const Route = createFileRoute("/admin/tiers")({
  head: () => ({ meta: [{ title: `Klown Admin — ${TITLE}` }, { name: "description", content: `Klown staff console: ${TITLE}.` }] }),
  component: Page,
});
const TIERS = [
  { key: "member", name: "Member", earn: "1× points", threshold: "Join Klown", perks: "Digital receipts, member offers" },
  { key: "regular", name: "Regular", earn: "1.5× points", threshold: "8 visits / 90 days", perks: "Everything in Member + early access" },
  { key: "inner_circle", name: "Inner Circle", earn: "2× points", threshold: "20 visits / 90 days", perks: "Highest earn rate, priority experiences" },
];

function Page() {
  const { toast, show } = useToast();
  const { staff } = useAuth();
  const { data } = useQuery({
    queryKey: ["tier_counts", staff?.id], enabled: !!staff,
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_member_directory").select("tier");
      if (error) throw error;
      const c: Record<string, number> = {};
      (data ?? []).forEach((m: any) => { const t = m.tier || "member"; c[t] = (c[t] || 0) + 1; });
      return c;
    },
  });
  const counts = data ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <AdminLayout title={TITLE}>
      <section className="ops-intro"><div><h2>Membership tiers</h2><p>The Klown Club ladder — live member counts per tier.</p></div><button className="gold-button" onClick={() => show("Tier rules saved")}>Save rules</button></section>
      <div className="member-kpis">
        <div><span>Total members</span><b>{total}</b></div>
        <div><span>Member</span><b>{counts["member"] || 0}</b></div>
        <div><span>Regular</span><b>{counts["regular"] || 0}</b></div>
        <div><span>Inner Circle</span><b>{counts["inner_circle"] || 0}</b></div>
      </div>
      <div className="tier-admin-grid">
        {TIERS.map((t) => (
          <div className="tier-admin-card" key={t.key}>
            <span className="panel-kicker">{counts[t.key] || 0} members</span>
            <h3>{t.name}</h3><p>{t.perks}</p>
            <div className="tier-rule"><span>Earn rate</span><b>{t.earn}</b></div>
            <div className="tier-rule"><span>Threshold</span><b>{t.threshold}</b></div>
            <button className="outline-button" onClick={() => show(`Edit ${t.name} tier`)}>Edit tier</button>
          </div>
        ))}
      </div>
      <Toast text={toast} />
    </AdminLayout>
  );
}
