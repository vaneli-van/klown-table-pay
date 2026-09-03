import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { ownerBranding, ownerSaveBranding, uploadBrandingImage, type OwnerBranding } from "@/lib/owner-api";

const TITLE = "Theme";
const DEFAULT_ACCENT = "#c8a56b";
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

export const Route = createFileRoute("/owner/theme")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Set your diner app's logo, hero image, accent colour, tagline and welcome copy." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <ThemeBody />
    </OwnerLayout>
  ),
});

type Form = {
  logo_url: string | null;
  hero_url: string | null;
  accent_color: string | null;
  tagline_top: string | null;
  tagline_bottom: string | null;
  welcome_copy: string | null;
};
const EMPTY: Form = { logo_url: null, hero_url: null, accent_color: null, tagline_top: null, tagline_bottom: null, welcome_copy: null };

function ThemeBody() {
  const { restaurantId, name, show } = useOwner();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const loadedFor = useRef<string | null>(null);

  const { data, isLoading, error } = useQuery<OwnerBranding>({
    queryKey: ["owner_branding", restaurantId],
    enabled: !!restaurantId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    queryFn: ownerBranding,
  });

  useEffect(() => {
    if (data && loadedFor.current !== restaurantId) {
      setForm({
        logo_url: data.logo_url, hero_url: data.hero_url, accent_color: data.accent_color,
        tagline_top: data.tagline_top, tagline_bottom: data.tagline_bottom, welcome_copy: data.welcome_copy,
      });
      loadedFor.current = restaurantId;
    }
  }, [data, restaurantId]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (kind: "logo" | "hero", file: File | undefined) => {
    if (!file) return;
    if (!OK_TYPES.includes(file.type)) { show("Use a PNG, JPG, WEBP, AVIF or SVG image"); return; }
    if (file.size > MAX_BYTES) { show("Image is larger than 5 MB"); return; }
    setUploading(kind);
    try {
      const url = await uploadBrandingImage(restaurantId, kind, file);
      set(kind === "logo" ? "logo_url" : "hero_url", url);
      show(kind === "logo" ? "Logo uploaded — remember to save" : "Hero image uploaded — remember to save");
    } catch (e: any) {
      show("Upload failed: " + (e?.message ?? "unknown error"));
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    const accent = (form.accent_color ?? "").trim();
    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) { show("Accent colour must be a #rrggbb hex value"); return; }
    setSaving(true);
    try {
      await ownerSaveBranding({
        logo_url: form.logo_url,
        hero_url: form.hero_url,
        accent_color: accent || null,
        tagline_top: form.tagline_top,
        tagline_bottom: form.tagline_bottom,
        welcome_copy: form.welcome_copy,
      });
      show("Theme saved — the diner app picks it up on the next QR scan");
      qc.invalidateQueries({ queryKey: ["owner_branding", restaurantId] });
    } catch (e: any) {
      show("Save failed: " + (e?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (data) setForm({ logo_url: data.logo_url, hero_url: data.hero_url, accent_color: data.accent_color, tagline_top: data.tagline_top, tagline_bottom: data.tagline_bottom, welcome_copy: data.welcome_copy });
    show("Reverted to the saved values");
  };

  const accent = (form.accent_color ?? "").trim() || DEFAULT_ACCENT;

  return (
    <>
      <section className="ops-intro">
        <div>
          <h2>Diner theme</h2>
          <p>Logo, hero image, accent colour, tagline and welcome copy for the {name} diner screen. Empty fields fall back to the Klown defaults.</p>
        </div>
        <button className="gold-button" onClick={save} disabled={saving || isLoading}>{saving ? "Saving…" : "Save theme"}</button>
      </section>

      {isLoading ? (
        <div className="detail-note"><span>Loading theme…</span></div>
      ) : error ? (
        <div className="detail-note"><span>Couldn't load theme: {(error as any).message}</span></div>
      ) : (
        <div className="own-theme-grid">
          <div className="panel">
            <div className="own-field">
              <label>Logo</label>
              <small>Shown on the diner welcome screen. PNG with transparency works best.</small>
              <div className="own-image-row">
                <span className="own-thumb" style={{ background: "#171717" }}>{form.logo_url ? <img src={form.logo_url} alt="Logo" /> : <i>No logo</i>}</span>
                <div className="own-image-actions">
                  <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { upload("logo", e.target.files?.[0]); e.currentTarget.value = ""; }} />
                  <button className="outline-button" onClick={() => logoInput.current?.click()} disabled={uploading === "logo"}>{uploading === "logo" ? "Uploading…" : form.logo_url ? "Replace logo" : "Upload logo"}</button>
                  {form.logo_url && <button className="quiet" onClick={() => set("logo_url", null)}>Remove</button>}
                </div>
              </div>
            </div>

            <div className="own-field">
              <label>Hero image</label>
              <small>The big photo at the top of the welcome screen. Landscape, at least 1200px wide.</small>
              <div className="own-image-row">
                <span className="own-thumb wide">{form.hero_url ? <img src={form.hero_url} alt="Hero" /> : <i>No hero image</i>}</span>
                <div className="own-image-actions">
                  <input ref={heroInput} type="file" accept="image/*" hidden onChange={(e) => { upload("hero", e.target.files?.[0]); e.currentTarget.value = ""; }} />
                  <button className="outline-button" onClick={() => heroInput.current?.click()} disabled={uploading === "hero"}>{uploading === "hero" ? "Uploading…" : form.hero_url ? "Replace hero" : "Upload hero"}</button>
                  {form.hero_url && <button className="quiet" onClick={() => set("hero_url", null)}>Remove</button>}
                </div>
              </div>
            </div>

            <div className="own-field">
              <label>Accent colour</label>
              <small>Buttons and highlights in the diner app. Empty falls back to Klown gold {DEFAULT_ACCENT}.</small>
              <div className="own-colour">
                <input type="color" value={accent} onChange={(e) => set("accent_color", e.target.value)} aria-label="Accent colour" />
                <input className="wide-input" style={{ margin: 0 }} value={form.accent_color ?? ""} placeholder={DEFAULT_ACCENT} onChange={(e) => set("accent_color", e.target.value || null)} />
                {form.accent_color && <button className="quiet" onClick={() => set("accent_color", null)}>Clear</button>}
              </div>
            </div>

            <div className="own-field">
              <label>Tagline</label>
              <small>Line 2 renders in serif italic on the welcome screen.</small>
              <div className="own-two">
                <input className="wide-input" style={{ margin: 0 }} value={form.tagline_top ?? ""} placeholder="Good food." onChange={(e) => set("tagline_top", e.target.value || null)} />
                <input className="wide-input" style={{ margin: 0 }} value={form.tagline_bottom ?? ""} placeholder="Good company." onChange={(e) => set("tagline_bottom", e.target.value || null)} />
              </div>
            </div>

            <div className="own-field">
              <label>Welcome copy</label>
              <small>The sentence after “You are at table X.” Empty falls back to the Klown default.</small>
              <textarea className="wide-input" style={{ margin: 0, minHeight: 90 }} maxLength={400} value={form.welcome_copy ?? ""} placeholder="Browse the menu, order and pay right from your phone." onChange={(e) => set("welcome_copy", e.target.value || null)} />
            </div>

            <div className="own-actions">
              <button className="quiet" onClick={reset}>Reset</button>
              <button className="gold-button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save theme"}</button>
            </div>
          </div>

          <aside className="panel own-preview-panel">
            <span className="panel-kicker">Diner preview</span>
            <div className="own-phone">
              <div className="own-phone-hero">{form.hero_url ? <img src={form.hero_url} alt="" /> : <i>Hero image</i>}</div>
              <div className="own-phone-body">
                {form.logo_url ? <img className="own-phone-logo" src={form.logo_url} alt="" /> : <b className="own-phone-logo-text">{name}</b>}
                <h4>{form.tagline_top ?? "Good food."}<br /><em>{form.tagline_bottom ?? "Good company."}</em></h4>
                <p>You are at table 12. {form.welcome_copy ?? "Browse the menu, order and pay right from your phone."}</p>
                <button style={{ background: accent }}>View menu</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
