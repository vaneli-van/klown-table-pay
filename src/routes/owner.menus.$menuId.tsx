import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { useEscape } from "@/components/prototype";
import {
  studioMenuGet, studioMenuUpdate,
  studioSectionUpsert, studioSectionDelete, studioSectionsReorder,
  studioItemUpsert, studioItemDelete, studioItemDuplicate, studioItemsReorder,
  studioCatalogueList, studioCatalogueUpsert, studioPlaceCatalogueItem, studioImportPos,
  studioRevisionSave, studioRevisionsList, studioRevisionRestore,
  studioThemeSave, studioThemeReset, uploadStudioImage,
  THEME_TEMPLATES, DEFAULT_TOKENS, FONT_OPTIONS, mergeTokens, studioFontLinkHref,
  priceText, parsePrice,
  type StudioTree, type StudioSection, type StudioItem, type CatalogueItem, type RevisionRow, type ThemeTokens,
} from "@/lib/studio-api";
import { relTime } from "@/lib/owner-api";
import "../owner-studio.css";

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

const SECTION_TYPES = ["Title", "Standard", "Alternate", "Alternate 2", "Subheading"];

type ItemDialogState = { open: boolean; sectionId: string | null; item: StudioItem | null; catalogue: boolean };
type SectionDialogState = { open: boolean; section: StudioSection | null };

function EditorBody({ menuId }: { menuId: string }) {
  const { show } = useOwner();
  const [tree, setTree] = useState<StudioTree | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [saving, setSaving] = useState(0);
  const [itemDlg, setItemDlg] = useState<ItemDialogState>({ open: false, sectionId: null, item: null, catalogue: false });
  const [sectionDlg, setSectionDlg] = useState<SectionDialogState>({ open: false, section: null });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [catSearch, setCatSearch] = useState("");
  const [dragCat, setDragCat] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const { isLoading, error } = useQuery({
    queryKey: ["studio_menu", menuId],
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    queryFn: async () => {
      const t = await studioMenuGet(menuId);
      const c = await studioCatalogueList();
      if (loadedFor.current !== menuId) { setTree(t); setCatalogue(c); loadedFor.current = menuId; }
      return t;
    },
  });

  async function run<T>(p: Promise<T>, opts?: { tree?: boolean; ok?: string }): Promise<T | undefined> {
    setSaving((n) => n + 1);
    try {
      const r = await p;
      if (opts?.tree !== false && r && (r as any).menu) setTree(r as any);
      if (opts?.ok) show(opts.ok);
      return r;
    } catch (e: any) {
      show((e?.message ?? "Something went wrong") + "");
      return undefined;
    } finally {
      setSaving((n) => n - 1);
    }
  }

  const sections = tree?.sections ?? [];
  const currency = tree?.menu.currency ?? "GHS";
  const savingText = saving > 0 ? "Saving…" : "Saved";

  // ---- menu-level ----
  const onName = (v: string) => { if (tree && v.trim() && v !== tree.menu.name) run(studioMenuUpdate(menuId, { name: v.trim() })); };
  const toggleStatus = () => { if (tree) run(studioMenuUpdate(menuId, { status: tree.menu.status === "live" ? "draft" : "live" }), { ok: tree.menu.status === "live" ? "Set to draft" : "Menu is live" }); };

  // ---- sections ----
  const moveSection = (idx: number, dir: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    const j = idx + dir; if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    run(studioSectionsReorder(menuId, ids));
  };
  const deleteSection = (s: StudioSection) => { if (window.confirm(`Delete section "${s.name || "Untitled"}" and its items?`)) run(studioSectionDelete(s.id)); };

  // ---- items ----
  const moveItem = (s: StudioSection, idx: number, dir: -1 | 1) => {
    const ids = s.items.map((i) => i.id);
    const j = idx + dir; if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    run(studioItemsReorder(s.id, ids));
  };
  const toggleAvail = (it: StudioItem) => run(studioItemUpsert(it.section_id, { id: it.id, available: !it.available }));
  const deleteItem = (it: StudioItem) => { if (window.confirm(`Remove "${it.name}" from this menu?`)) run(studioItemDelete(it.id)); };

  // ---- catalogue drag/drop ----
  const onDropOnSection = (sectionId: string) => {
    setDragOver(null);
    const catId = dragCat; setDragCat(null);
    if (!catId) return;
    run(studioPlaceCatalogueItem(sectionId, catId), { ok: "Added to menu" });
  };
  const refreshCatalogue = async () => { try { setCatalogue(await studioCatalogueList()); } catch { /* noop */ } };
  const importPos = async () => {
    if (!window.confirm("Import items from your POS into this menu? Existing items stay; new POS items are added, grouped by category.")) return;
    setSaving((n) => n + 1);
    try {
      const r = await studioImportPos(menuId);
      setTree(await studioMenuGet(menuId));
      setCatalogue(await studioCatalogueList());
      show(`Imported ${r.items_added} item${r.items_added === 1 ? "" : "s"} across ${r.sections_added} section${r.sections_added === 1 ? "" : "s"}` + (r.skipped ? ` \u00b7 ${r.skipped} already present` : ""));
    } catch (e: any) {
      show("Import failed: " + (e?.message ?? "error"));
    } finally {
      setSaving((n) => n - 1);
    }
  };

  // ---- history ----
  const openHistory = async () => {
    setHistoryOpen(true);
    try { setRevisions(await studioRevisionsList(menuId)); } catch (e: any) { show("Couldn't load history"); }
  };
  const saveVersion = async () => {
    const label = window.prompt("Name this version (optional):", "") ?? null;
    const r = await run(studioRevisionSave(menuId, label || null), { tree: false, ok: "Version saved" });
    if (r) { try { setRevisions(await studioRevisionsList(menuId)); } catch { /* noop */ } }
  };
  const restore = async (rev: RevisionRow) => {
    if (!window.confirm("Restore this version? It replaces the current sections and items.")) return;
    await run(studioRevisionRestore(menuId, rev.id), { ok: "Version restored" });
  };

  const filteredCat = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return q ? catalogue.filter((c) => c.name.toLowerCase().includes(q)) : catalogue;
  }, [catalogue, catSearch]);

  if (isLoading) return <div className="detail-note"><span>Loading menu…</span></div>;
  if (error) return <div className="detail-note"><span>Couldn't load menu: {(error as any).message}</span></div>;
  if (!tree) return <div className="detail-note"><span>Menu not found.</span></div>;

  return (
    <>
      <div className="st-toolbar">
        <Link className="quiet" to="/owner/menus">← Menus</Link>
        <input className="st-name-input" key={tree.menu.id} defaultValue={tree.menu.name} onBlur={(e) => onName(e.target.value)} aria-label="Menu name" />
        <span className={"st-badge " + (tree.menu.status === "live" ? "live" : "")} onClick={toggleStatus} style={{ cursor: "pointer" }} title="Click to toggle">{tree.menu.status === "live" ? "Live" : "Draft"}</span>
        {tree.menu.source === "pos" && <span className="st-badge pos">POS</span>}
        <span className="st-spacer" />
        <span className={"st-save-status " + (saving > 0 ? "saving" : "")}>{savingText}</span>
        <button className="outline-button" onClick={importPos}>Import from POS</button>
        <button className="outline-button" onClick={() => setThemeOpen(true)}>Theme</button>
        <button className="outline-button" onClick={saveVersion}>Save version</button>
        <button className="outline-button" onClick={openHistory}>History</button>
      </div>

      <div className="st-editor">
        {/* catalogue rail */}
        <aside className="st-rail">
          <h4>Food items</h4>
          <p className="st-rail-hint">Drag an item onto a section to add it. These are reusable across menus.</p>
          <input className="st-rail-search" placeholder="Find food item" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} />
          <button className="outline-button" style={{ width: "100%", marginBottom: 12 }} onClick={() => setItemDlg({ open: true, sectionId: null, item: null, catalogue: true })}>＋ New food item</button>
          {filteredCat.length === 0 ? (
            <div className="st-cat-empty">{catSearch ? "No matches." : "No saved items yet. Create one, or add items directly to a section."}</div>
          ) : filteredCat.map((c) => (
            <div className="st-cat-item" key={c.id} draggable onDragStart={() => setDragCat(c.id)} onDragEnd={() => setDragCat(null)} title="Drag onto a section">
              <span className="st-drag">⋮⋮</span>
              <strong>{c.name}</strong>
              <small>{priceText(c.price_pesewas, c.price_display, currency)}</small>
            </div>
          ))}
        </aside>

        {/* canvas */}
        <div className="st-canvas">
          {sections.length === 0 && (
            <div className="st-section-empty">No sections yet. Add your first section to start building the menu.</div>
          )}
          {sections.map((s, si) => (
            <section
              key={s.id}
              className={"st-section" + (dragOver === s.id ? " dragover" : "")}
              onDragOver={(e) => { if (dragCat) { e.preventDefault(); setDragOver(s.id); } }}
              onDragLeave={() => setDragOver((v) => (v === s.id ? null : v))}
              onDrop={(e) => { e.preventDefault(); onDropOnSection(s.id); }}
            >
              <div className="st-section-head">
                <h3>{s.name || "Untitled section"}</h3>
                <span className="st-section-type">{s.type}{!s.visible ? " · hidden" : ""}</span>
                <div className="st-row-actions">
                  <button className="st-icon-btn" title="Move up" onClick={() => moveSection(si, -1)} disabled={si === 0}>↑</button>
                  <button className="st-icon-btn" title="Move down" onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1}>↓</button>
                  <button className="st-icon-btn" title="Edit section" onClick={() => setSectionDlg({ open: true, section: s })}>✎</button>
                  <button className="st-icon-btn" title="Delete section" onClick={() => deleteSection(s)}>🗑</button>
                </div>
              </div>
              <div className="st-section-body">
                {s.items.length === 0 && <div className="st-section-empty">Drag a food item here, or add one.</div>}
                {s.items.map((it, ii) => (
                  <div className={"st-item-row" + (!it.available || it.sold_out ? " dim" : "")} key={it.id}>
                    <div className="st-item-main">
                      <div className="st-item-name">{it.name}{it.sold_out && <span className="st-soldout"> · Sold out</span>}</div>
                      {it.description && <div className="st-item-desc">{it.description}</div>}
                      {it.tags.length > 0 && <div className="st-item-tags">{it.tags.map((t) => <span className="st-tag" key={t}>{t}</span>)}</div>}
                    </div>
                    <span className="st-item-price">{priceText(it.price_pesewas, it.price_display, currency)}</span>
                    <div className="st-row-actions">
                      <button className="st-icon-btn" title={it.available ? "Mark unavailable" : "Mark available"} onClick={() => toggleAvail(it)}>{it.available ? "◉" : "○"}</button>
                      <button className="st-icon-btn" title="Move up" onClick={() => moveItem(s, ii, -1)} disabled={ii === 0}>↑</button>
                      <button className="st-icon-btn" title="Move down" onClick={() => moveItem(s, ii, 1)} disabled={ii === s.items.length - 1}>↓</button>
                      <button className="st-icon-btn" title="Edit" onClick={() => setItemDlg({ open: true, sectionId: s.id, item: it, catalogue: false })}>✎</button>
                      <button className="st-icon-btn" title="Duplicate" onClick={() => run(studioItemDuplicate(it.id))}>⧉</button>
                      <button className="st-icon-btn" title="Delete" onClick={() => deleteItem(it)}>🗑</button>
                    </div>
                  </div>
                ))}
                <div className="st-add-row">
                  <button className="outline-button" onClick={() => setItemDlg({ open: true, sectionId: s.id, item: null, catalogue: false })}>＋ Add item</button>
                </div>
              </div>
            </section>
          ))}

          <div className="st-add-row">
            <button className="gold-button" onClick={() => setSectionDlg({ open: true, section: null })}>＋ Add section</button>
          </div>

          {historyOpen && (
            <div className="st-history">
              <h4>Version history</h4>
              {revisions.length === 0 ? (
                <p style={{ fontSize: 12, color: "#a29d93", margin: 0 }}>No saved versions yet. Use “Save version” to create a restore point.</p>
              ) : revisions.map((r) => (
                <div className="st-rev" key={r.id}>
                  <b>{r.label || "Version"}</b>
                  <span className="st-rev-when">{relTime(r.created_at)}</span>
                  <button className="outline-button" onClick={() => restore(r)}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {itemDlg.open && (
        <ItemDialog
          state={itemDlg}
          currency={currency}
          onClose={() => setItemDlg({ open: false, sectionId: null, item: null, catalogue: false })}
          onSaved={(t, catRefresh) => { if (t) setTree(t); if (catRefresh) refreshCatalogue(); setItemDlg({ open: false, sectionId: null, item: null, catalogue: false }); }}
          run={run}
        />
      )}
      {sectionDlg.open && (
        <SectionDialog
          menuId={menuId}
          section={sectionDlg.section}
          onClose={() => setSectionDlg({ open: false, section: null })}
          onSaved={(t) => { if (t) setTree(t); setSectionDlg({ open: false, section: null }); }}
          run={run}
        />
      )}
      {themeOpen && (
        <ThemeDialog tree={tree} onClose={() => setThemeOpen(false)} onSaved={(t) => { if (t) setTree(t); }} run={run} />
      )}
    </>
  );
}

// ---------- Item dialog ----------
function ItemDialog({ state, currency, onClose, onSaved, run }: {
  state: ItemDialogState; currency: string; onClose: () => void;
  onSaved: (tree: StudioTree | undefined, catRefresh: boolean) => void;
  run: <T>(p: Promise<T>, opts?: { tree?: boolean; ok?: string }) => Promise<T | undefined>;
}) {
  useEscape(onClose);
  const { restaurantId, show } = useOwner();
  const it = state.item;
  const [name, setName] = useState(it?.name ?? "");
  const [price, setPrice] = useState(priceText(it?.price_pesewas, it?.price_display, currency).replace(/^GH₵/, "") || (it?.price_display ?? ""));
  const [description, setDescription] = useState(it?.description ?? "");
  const [extras, setExtras] = useState(it?.extras ?? "");
  const [tags, setTags] = useState((it?.tags ?? []).join(", "));
  const [available, setAvailable] = useState(it?.available ?? true);
  const [soldOut, setSoldOut] = useState(it?.sold_out ?? false);
  const [visible, setVisible] = useState(it?.visible ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(it?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImg = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { setImageUrl(await uploadStudioImage(restaurantId, file)); }
    catch (e: any) { show("Upload failed: " + (e?.message ?? "error")); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!name.trim()) return;
    const parsed = parsePrice(price);
    const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload: Record<string, unknown> = {
      ...(it ? { id: it.id } : {}),
      name: name.trim(), description: description || null, extras: extras || null,
      price_pesewas: parsed.price_pesewas, price_display: parsed.price_display,
      tags: tagArr, available, sold_out: soldOut, visible, image_url: imageUrl,
    };
    if (state.catalogue) {
      await run(studioCatalogueUpsert(payload), { tree: false, ok: "Saved to food items" });
      onSaved(undefined, true);
    } else if (state.sectionId) {
      const t = await run(studioItemUpsert(state.sectionId, payload), { ok: it ? "Item updated" : "Item added" });
      onSaved(t as any, false);
    }
  };

  return (
    <div className="st-dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st-dialog">
        <h3>{state.catalogue ? (it ? "Edit food item" : "New food item") : it ? "Edit item" : "Add item"}</h3>
        <div className="st-two">
          <div className="st-field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Jollof arancini" /></div>
          <div className="st-field"><label>Price</label><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="70  ·  or “Market”" /></div>
        </div>
        <div className="st-field"><label>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Smoked tomato rice, mozzarella, green pepper relish." /></div>
        <div className="st-field"><label>Extras</label><input value={extras} onChange={(e) => setExtras(e.target.value)} placeholder="Add prawns +25" /></div>
        <div className="st-field"><label>Photo</label>
          <div className="own-image-row">
            <span className="own-thumb" style={{ background: "#171717" }}>{imageUrl ? <img src={imageUrl} alt="" /> : <i>No photo</i>}</span>
            <div className="own-image-actions">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { uploadImg(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              <button className="outline-button" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : imageUrl ? "Replace photo" : "Upload photo"}</button>
              {imageUrl && <button className="quiet" type="button" onClick={() => setImageUrl(null)}>Remove</button>}
            </div>
          </div>
        </div>
        <div className="st-field"><label>Tags (comma separated)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Vegetarian, Popular" /></div>
        {!state.catalogue && (
          <div className="st-checks">
            <label className="st-check"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> Available</label>
            <label className="st-check"><input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} /> Sold out</label>
            <label className="st-check"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Visible</label>
          </div>
        )}
        <div className="st-dialog-actions">
          <span className="st-spacer" />
          <button className="quiet" onClick={onClose}>Cancel</button>
          <button className="gold-button" onClick={save} disabled={!name.trim()}>{it ? "Save" : "Add"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Section dialog ----------
function SectionDialog({ menuId, section, onClose, onSaved, run }: {
  menuId: string; section: StudioSection | null; onClose: () => void;
  onSaved: (tree: StudioTree | undefined) => void;
  run: <T>(p: Promise<T>, opts?: { tree?: boolean; ok?: string }) => Promise<T | undefined>;
}) {
  useEscape(onClose);
  const [name, setName] = useState(section?.name ?? "");
  const [type, setType] = useState(section?.type ?? "Standard");
  const [columns, setColumns] = useState(section?.columns ?? 1);
  const [alignment, setAlignment] = useState(section?.alignment ?? "theme");
  const [accent, setAccent] = useState(section?.accent ?? "none");
  const [visible, setVisible] = useState(section?.visible ?? true);

  const save = async () => {
    if (!name.trim() && type !== "Title") { /* allow */ }
    const payload: Record<string, unknown> = {
      ...(section ? { id: section.id } : {}),
      name: name.trim(), type, columns, alignment, accent, visible,
    };
    const t = await run(studioSectionUpsert(menuId, payload), { ok: section ? "Section updated" : "Section added" });
    onSaved(t as any);
  };
  const del = async () => {
    if (!section) return;
    if (!window.confirm("Delete this section and its items?")) return;
    const t = await run(studioSectionDelete(section.id), { ok: "Section deleted" });
    onSaved(t as any);
  };

  return (
    <div className="st-dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st-dialog">
        <h3>{section ? "Edit section" : "Add section"}</h3>
        <div className="st-field"><label>Heading</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Starters" /></div>
        <div className="st-two">
          <div className="st-field"><label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}>{SECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div className="st-field"><label>Columns</label>
            <select value={columns} onChange={(e) => setColumns(Number(e.target.value))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </div>
        </div>
        <div className="st-two">
          <div className="st-field"><label>Alignment</label>
            <select value={alignment} onChange={(e) => setAlignment(e.target.value as any)}>{["theme", "left", "center", "right"].map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </div>
          <div className="st-field"><label>Accent</label>
            <select value={accent} onChange={(e) => setAccent(e.target.value as any)}>{["none", "line", "fill"].map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </div>
        </div>
        <div className="st-checks">
          <label className="st-check"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Visible on menu</label>
        </div>
        <div className="st-dialog-actions">
          {section && <button className="quiet" style={{ color: "#b0553f" }} onClick={del}>Delete</button>}
          <span className="st-spacer" />
          <button className="quiet" onClick={onClose}>Cancel</button>
          <button className="gold-button" onClick={save}>{section ? "Save" : "Add"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Theme dialog ----------
function ThemeDialog({ tree, onClose, onSaved, run }: {
  tree: StudioTree; onClose: () => void;
  onSaved: (tree: StudioTree | undefined) => void;
  run: <T>(p: Promise<T>, opts?: { tree?: boolean; ok?: string }) => Promise<T | undefined>;
}) {
  useEscape(onClose);
  const [tokens, setTokens] = useState<ThemeTokens>(mergeTokens(tree.theme?.tokens));
  const [templateName, setTemplateName] = useState<string | null>(tree.theme?.template_name ?? null);

  useEffect(() => {
    const id = "studio-fonts";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet"; l.href = studioFontLinkHref();
      document.head.appendChild(l);
    }
  }, []);

  const setFont = (k: keyof ThemeTokens["fonts"], v: string) => setTokens((t) => ({ ...t, fonts: { ...t.fonts, [k]: v } }));
  const setColor = (k: keyof ThemeTokens["colors"], v: string) => setTokens((t) => ({ ...t, colors: { ...t.colors, [k]: v } }));
  const setLayout = (k: keyof ThemeTokens["layout"], v: any) => setTokens((t) => ({ ...t, layout: { ...t.layout, [k]: v } }));
  const applyTemplate = (name: string) => { const tpl = THEME_TEMPLATES.find((t) => t.name === name); if (tpl) { setTokens(JSON.parse(JSON.stringify(tpl.tokens))); setTemplateName(name); } };

  const save = async () => { const t = await run(studioThemeSave(tree.menu.id, { template_name: templateName, tokens }), { ok: "Theme saved" }); onSaved(t as any); };
  const reset = async () => { if (!window.confirm("Reset this menu's theme to the Klown default?")) return; const t = await run(studioThemeReset(tree.menu.id), { ok: "Theme reset" }); onSaved(t as any); onClose(); };

  const previewSections = tree.sections.length ? tree.sections.slice(0, 2) : [{ id: "s", name: "Starters", items: [
    { id: "a", name: "Butternut squash soup", description: "Goat cheese sprinkle", price_pesewas: 10000, price_display: null },
    { id: "b", name: "Crunchy chicken", description: "Breaded crust, sweet chili dip", price_pesewas: 13000, price_display: null },
  ] }] as any;
  const cur = tree.menu.currency;
  const fontLabel = (fam: string) => FONT_OPTIONS.find((f) => f.family === fam)?.label ?? fam;

  return (
    <div className="st-dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st-dialog st-theme-dialog">
        <h3>Theme · {tree.menu.name}</h3>
        <div className="st-theme-grid">
          <div className="st-theme-controls">
            <label className="st-tsub">Template</label>
            <div className="st-tpl-row">
              {THEME_TEMPLATES.map((t) => (
                <button key={t.name} type="button" className={"st-tpl" + (templateName === t.name ? " active" : "")} onClick={() => applyTemplate(t.name)}>{t.name}</button>
              ))}
            </div>

            <label className="st-tsub">Fonts</label>
            {([["title", "Title"], ["heading", "Section heading"], ["item", "Item name"], ["body", "Description"]] as const).map(([k, lbl]) => (
              <div className="st-field" key={k}>
                <label>{lbl}</label>
                <select value={FONT_OPTIONS.some((f) => f.family === tokens.fonts[k]) ? tokens.fonts[k] : ""} onChange={(e) => setFont(k, e.target.value)}>
                  {!FONT_OPTIONS.some((f) => f.family === tokens.fonts[k]) && <option value="">{fontLabel(tokens.fonts[k])}</option>}
                  {FONT_OPTIONS.map((f) => <option key={f.label} value={f.family}>{f.label}</option>)}
                </select>
              </div>
            ))}

            <label className="st-tsub">Colours</label>
            {([["paper", "Background"], ["ink", "Text"], ["accent", "Accent"], ["heading", "Heading"], ["price", "Price"]] as const).map(([k, lbl]) => (
              <div className="st-colour-row" key={k}>
                <span>{lbl}</span>
                <input type="color" value={tokens.colors[k]} onChange={(e) => setColor(k, e.target.value)} aria-label={lbl} />
                <input className="st-colour-hex" value={tokens.colors[k]} onChange={(e) => setColor(k, e.target.value)} />
              </div>
            ))}

            <label className="st-tsub">Layout</label>
            <div className="st-two">
              <div className="st-field"><label>Columns</label><select value={tokens.layout.columns} onChange={(e) => setLayout("columns", Number(e.target.value))}>{[1, 2].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              <div className="st-field"><label>Price leader</label><select value={tokens.layout.price_leader} onChange={(e) => setLayout("price_leader", e.target.value)}><option value="dots">Dots</option><option value="none">None</option></select></div>
            </div>
            <div className="st-two">
              <div className="st-field"><label>Item photos</label><select value={tokens.layout.item_photos} onChange={(e) => setLayout("item_photos", e.target.value)}><option value="small">Small</option><option value="none">None</option></select></div>
              <div className="st-field"><label>Alignment</label><select value={tokens.layout.align} onChange={(e) => setLayout("align", e.target.value)}><option value="left">Left</option><option value="center">Center</option></select></div>
            </div>
          </div>

          <div className="st-theme-preview-wrap">
            <span className="panel-kicker">Live preview</span>
            <div className="st-theme-preview" style={{ background: tokens.colors.paper, color: tokens.colors.ink }}>
              <div className="st-tp-title" style={{ fontFamily: tokens.fonts.title, textAlign: tokens.layout.align }}>{tree.menu.name}</div>
              {previewSections.map((sec: any) => (
                <div key={sec.id} className="st-tp-section">
                  <div className="st-tp-heading" style={{ fontFamily: tokens.fonts.heading, color: tokens.colors.heading, textAlign: tokens.layout.align }}>{sec.name || "Section"}</div>
                  {(sec.items ?? []).slice(0, 3).map((it: any) => (
                    <div key={it.id} className="st-tp-item">
                      <div className="st-tp-row">
                        <span style={{ fontFamily: tokens.fonts.item, fontWeight: 600 }}>{it.name}</span>
                        {tokens.layout.price_leader === "dots" && <span className="st-tp-dots" />}
                        <span style={{ fontFamily: tokens.fonts.item, color: tokens.colors.price, fontWeight: 600 }}>{priceText(it.price_pesewas, it.price_display, cur)}</span>
                      </div>
                      {it.description && <div className="st-tp-desc" style={{ fontFamily: tokens.fonts.body }}>{it.description}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="st-dialog-actions">
          <button className="quiet" style={{ color: "#b0553f" }} onClick={reset}>Reset to Klown</button>
          <span className="st-spacer" />
          <button className="quiet" onClick={onClose}>Cancel</button>
          <button className="gold-button" onClick={save}>Save theme</button>
        </div>
      </div>
    </div>
  );
}
