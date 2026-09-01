import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const DEFAULT_ACCENT = "#f3c744";
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

export type Branding = {
  logo_url: string | null;
  hero_url: string | null;
  accent_color: string | null;
  tagline_top: string | null;
  tagline_bottom: string | null;
  welcome_copy: string | null;
};

const EMPTY: Branding = {
  logo_url: null, hero_url: null, accent_color: null,
  tagline_top: null, tagline_bottom: null, welcome_copy: null,
};

function ext(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

export default function BrandingEditor({
  restaurantId,
  restaurantName,
  show,
}: {
  restaurantId: string;
  restaurantName?: string;
  show: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Branding>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const heroInput = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["restaurant_branding", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<Branding> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("logo_url,hero_url,accent_color,tagline_top,tagline_bottom,welcome_copy")
        .eq("id", restaurantId)
        .maybeSingle();
      if (error) throw error;
      return { ...EMPTY, ...(data as Branding | null) };
    },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (kind: "logo" | "hero", file: File | undefined) => {
    if (!file) return;
    if (!OK_TYPES.includes(file.type)) { show("Use a PNG, JPG, WEBP, AVIF or SVG image"); return; }
    if (file.size > MAX_BYTES) { show("Image is larger than 5 MB"); return; }
    setUploading(kind);
    const path = `${restaurantId}/${kind}-${Date.now()}.${ext(file)}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    setUploading(null);
    if (error) { show("Upload failed: " + error.message); return; }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    set(kind === "logo" ? "logo_url" : "hero_url", pub.publicUrl);
    show(kind === "logo" ? "Logo uploaded — remember to save" : "Hero image uploaded — remember to save");
  };

  const save = async () => {
    const accent = (form.accent_color ?? "").trim();
    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) { show("Accent colour must be a #rrggbb hex value"); return; }
    setSaving(true);
    const { error } = await supabase.rpc("save_restaurant_branding", {
      p_restaurant_id: restaurantId,
      p_logo_url: form.logo_url,
      p_hero_url: form.hero_url,
      p_accent_color: accent || null,
      p_tagline_top: form.tagline_top,
      p_tagline_bottom: form.tagline_bottom,
      p_welcome_copy: form.welcome_copy,
    });
    setSaving(false);
    if (error) { show("Save failed: " + error.message); return; }
    show("Branding saved — the diner app picks it up on the next QR scan");
    qc.invalidateQueries({ queryKey: ["restaurant_branding", restaurantId] });
    qc.invalidateQueries({ queryKey: ["admin_restaurant_directory"] });
  };

  const reset = () => { setForm(data ?? EMPTY); show("Reverted to the saved values"); };
  const accent = (form.accent_color ?? "").trim() || DEFAULT_ACCENT;

  if (isLoading) return <div className="detail-note"><span>Loading branding…</span></div>;
  if (error) return <div className="detail-note"><span>Couldn't load branding: {(error as any).message}</span></div>;

  return (
    <div className="branding-editor">
      <div className="branding-form">
        <div className="branding-field">
          <label>Logo</label>
          <small>Shown at the top of the diner welcome screen. PNG with transparency works best.</small>
          <div className="branding-image-row">
            <span className="branding-thumb" style={{ background: "#171717" }}>
              {form.logo_url ? <img src={form.logo_url} alt="Logo" /> : <i>No logo</i>}
            </span>
            <div className="branding-image-actions">
              <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { upload("logo", e.target.files?.[0]); e.currentTarget.value = ""; }} />
              <button className="outline-button" onClick={() => logoInput.current?.click()} disabled={uploading === "logo"}>
                {uploading === "logo" ? "Uploading…" : form.logo_url ? "Replace logo" : "Upload logo"}
              </button>
              {form.logo_url && <button className="quiet" onClick={() => set("logo_url", null)}>Remove</button>}
            </div>
          </div>
        </div>

        <div className="branding-field">
          <label>Hero image</label>
          <small>The big photo at the top of the welcome screen. Landscape, at least 1200px wide.</small>
          <div className="branding-image-row">
            <span className="branding-thumb wide">
              {form.hero_url ? <img src={form.hero_url} alt="Hero" /> : <i>No hero image</i>}
            </span>
            <div className="branding-image-actions">
              <input ref={heroInput} type="file" accept="image/*" hidden onChange={(e) => { upload("hero", e.target.files?.[0]); e.currentTarget.value = ""; }} />
              <button className="outline-button" onClick={() => heroInput.current?.click()} disabled={uploading === "hero"}>
                {uploading === "hero" ? "Uploading…" : form.hero_url ? "Replace hero" : "Upload hero"}
              </button>
              {form.hero_url && <button className="quiet" onClick={() => set("hero_url", null)}>Remove</button>}
            </div>
          </div>
        </div>

        <div className="branding-field">
          <label>Accent colour</label>
          <small>Buttons and highlights in the diner app. Empty falls back to Kozo yellow {DEFAULT_ACCENT}.</small>
          <div className="branding-colour">
            <input type="color" value={accent} onChange={(e) => set("accent_color", e.target.value)} aria-label="Accent colour" />
            <input
              className="wide-input"
              style={{ margin: 0 }}
              value={form.accent_color ?? ""}
              placeholder={DEFAULT_ACCENT}
              onChange={(e) => set("accent_color", e.target.value || null)}
            />
            {form.accent_color && <button className="quiet" onClick={() => set("accent_color", null)}>Clear</button>}
          </div>
        </div>

        <div className="branding-field two">
          <label>Tagline</label>
          <small>Line 2 renders in serif italic on the welcome screen.</small>
          <div className="branding-two">
            <input className="wide-input" style={{ margin: 0 }} value={form.tagline_top ?? ""} placeholder="Good food." onChange={(e) => set("tagline_top", e.target.value || null)} />
            <input className="wide-input" style={{ margin: 0 }} value={form.tagline_bottom ?? ""} placeholder="Good company." onChange={(e) => set("tagline_bottom", e.target.value || null)} />
          </div>
        </div>

        <div className="branding-field">
          <label>Welcome copy</label>
          <small>The sentence after “You are at table X.” Empty falls back to the Klown default.</small>
          <textarea
            className="wide-input"
            style={{ margin: 0, minHeight: 90 }}
            value={form.welcome_copy ?? ""}
            maxLength={400}
            placeholder="Browse the menu, order and pay right from your phone."
            onChange={(e) => set("welcome_copy", e.target.value || null)}
          />
        </div>

        <div className="branding-actions">
          <button className="quiet" onClick={reset}>Reset</button>
          <button className="gold-button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save branding"}</button>
        </div>
      </div>

      <aside className="branding-preview">
        <span className="panel-kicker">Diner preview</span>
        <div className="diner-preview">
          <div className="diner-hero">
            {form.hero_url ? <img src={form.hero_url} alt="" /> : <i>Hero image</i>}
          </div>
          <div className="diner-body">
            {form.logo_url ? <img className="diner-logo" src={form.logo_url} alt="" /> : <b className="diner-logo-text">{restaurantName ?? "Restaurant"}</b>}
            <h4>
              {form.tagline_top ?? "Good food."}<br />
              <em>{form.tagline_bottom ?? "Good company."}</em>
            </h4>
            <p>You are at table 12. {form.welcome_copy ?? "Browse the menu, order and pay right from your phone."}</p>
            <button style={{ background: accent }}>View menu</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
