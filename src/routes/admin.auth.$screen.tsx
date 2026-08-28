import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/auth/$screen")({
  head: () => ({
    meta: [
      { title: "Klown Admin — Staff access" },
      { name: "description", content: "Klown staff access prototype screens." },
      { property: "og:title", content: "Klown Admin — Staff access" },
      { property: "og:description", content: "Klown staff access prototype screens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAuthScreen,
});

function AdminAuthScreen() {
  return (
    <div className="auth-prototype">
      <div className="auth-card">
        <h1>Staff access</h1>
        <p>Authentication prototype — coming next.</p>
      </div>
    </div>
  );
}
