export const ghs = (pesewas?: number | null) =>
  "GH₵ " + ((pesewas ?? 0) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const ghsCompact = (pesewas?: number | null) => {
  const v = (pesewas ?? 0) / 100;
  if (v >= 1000) return "GH₵ " + (v / 1000).toFixed(1) + "k";
  return "GH₵ " + v.toFixed(0);
};
export const titleCase = (s?: string | null) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const relTime = (iso?: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " hr ago";
  return Math.floor(h / 24) + " days ago";
};
