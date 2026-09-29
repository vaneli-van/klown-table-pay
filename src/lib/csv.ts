// Real CSV export for admin tables. Builds a CSV from the rows already loaded
// on the page and triggers a browser download. Returns false when there is
// nothing to export so callers can show an honest message instead of a fake success.
function esc(v: unknown): string {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: object[]): string {
  if (!rows.length) return "";
  const cols: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  const lines = rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(","));
  return [cols.join(","), ...lines].join("\r\n");
}

export function downloadCsv(filename: string, rows: object[]): boolean {
  if (!rows.length) return false;
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
