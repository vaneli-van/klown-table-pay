import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { useEscape } from "@/components/prototype";
import {
  studioMenuGet, studioMenuUpdate, studioMenuPublish, studioMenuUnpublish,
  studioSectionUpsert, studioSectionDelete, studioSectionsReorder,
  studioItemUpsert, studioItemDelete, studioItemDuplicate, studioItemsReorder, studioItemMove,
  studioCatalogueList, studioCatalogueUpsert, studioPlaceCatalogueItem, studioImportPos,
  studioRevisionSave, studioRevisionsList, studioRevisionRestore,
  studioModifierGroupUpsert, studioModifierGroupDelete, studioModifierUpsert, studioModifierDelete,
  studioThemeSave, studioThemeReset, studioDigitalSave, uploadStudioImage, publicMenuUrl,
  THEME_TEMPLATES, DEFAULT_TOKENS, FONT_OPTIONS, mergeTokens, studioFontLinkHref,
  priceText, parsePrice,
  type StudioTree, type StudioSection, type StudioItem, type CatalogueItem, type RevisionRow, type ThemeTokens, type ModifierGroup, type Modifier,
} from "@/lib/studio-api";
import { relTime } from "@/lib/owner-api";
import { QRCodeCanvas } from "qrcode.react";
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
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

type ItemDialogState = { open: boolean; sectionId: string | null; item: StudioItem | null; catalogue: boolean };
type SectionDialogState = { open: boolean; section: StudioSection | null };
type DragState = { kind: "cat"; id: string } | { kind: "item"; id: string; from: string } | { kind: "section"; id: string };

function EditorBody({ menuId }: { menuId: string }) {
  const { show } = useOwner();
  const [tree, setTree] = useState<StudioTree | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [saving, setSaving] = useState(0);
  const [itemDlg, setItemDlg] = useState<ItemDialogState>({ open: false, sectionId: null, item: null, catalogue: false });
  const [sectionDlg, setSectionDlg] = useState<SectionDialogState>({ open: false, section: null });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [catSearch, setCatSearch] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ section: string; item: string | null } | null>(null);
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
  const toggleStatus = () => { if (!tree) return; if (tree.menu.status === "live") run(studioMenuUnpublish(menuId), { ok: "Unpublished \u2014 back to draft" }); else run(studioMenuPublish(menuId), { ok: "Published \u2014 diners now see this menu" }); };

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
  const applyDrop = (targetSectionId: string, targetIndex: number | null) => {
    const d = drag; setDrag(null); setDropTarget(null);
    if (!d) return;
    const target = sections.find((s) => s.id === targetSectionId);
    if (!target) return;
    if (d.kind === "cat") {
      run(studioPlaceCatalogueItem(targetSectionId, d.id), { ok: "Added to menu" });
    } else if (d.kind === "item") {
      const idx = targetIndex ?? target.items.length;
      if (d.from === targetSectionId) {
        const ids = target.items.map((i) => i.id).filter((id) => id !== d.id);
        ids.splice(Math.min(idx, ids.length), 0, d.id);
        run(studioItemsReorder(targetSectionId, ids));
      } else {
        run(studioItemMove(d.id, targetSectionId, idx));
      }
    } else if (d.kind === "section") {
      const targetIdx = sections.findIndex((s) => s.id === targetSectionId);
      const ids = sections.map((s) => s.id).filter((id) => id !== d.id);
      ids.splice(Math.max(0, Math.min(targetIdx, ids.length)), 0, d.id);
      run(studioSectionsReorder(menuId, ids));
    }
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
        <span className={"st-badge " + (tree.menu.status === "live" ? "live" : "")} onClick={toggleStatus} style={{ cursor: "pointer" }} title="Click to publish / unpublish">{tree.menu.status === "live" ? "Live" : "Draft"}</span>
        {tree.menu.source === "pos" && <span className="st-badge pos">POS</span>}
        <span className="st-spacer" />
        <span className={"st-save-status " + (saving > 0 ? "saving" : "")}>{savingText}</span>
        <button className="outline-button" onClick={() => setShareOpen(true)}>Share</button>
        <button className="outline-button" onClick={importPos}>Import from POS</button>
        <button className="outline-button" onClick={() => setPageOpen(true)}>Page</button>
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
            <div className="st-cat-item" key={c.id} draggable onDragStart={() => setDrag({ kind: "cat", id: c.id })} onDragEnd={() => { setDrag(null); setDropTarget(null); }} title="Drag onto a section">
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
              className={"st-section" + (drag && dropTarget?.section === s.id && dropTarget?.item === null ? " dragover" : "")}
              onDragOver={(e) => { if (drag) { e.preventDefault(); setDropTarget({ section: s.id, item: null }); } }}
              onDrop={(e) => { if (drag) { e.preventDefault(); applyDrop(s.id, null); } }}
            >
              <div className="st-section-head">
                <span className="st-drag-handle" draggable onDragStart={(e) => { e.stopPropagation(); setDrag({ kind: "section", id: s.id }); }} onDragEnd={() => { setDrag(null); setDropTarget(null); }} title="Drag to reorder section">⋮⋮</span>
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
                  <div
                    className={"st-item-row" + (!it.available || it.sold_out ? " dim" : "") + (drag && drag.kind !== "section" && dropTarget?.item === it.id ? " drop-before" : "")}
                    key={it.id}
                    onDragOver={(e) => { if (drag && drag.kind !== "section") { e.preventDefault(); e.stopPropagation(); setDropTarget({ section: s.id, item: it.id }); } }}
                    onDrop={(e) => { if (drag && drag.kind !== "section") { e.preventDefault(); e.stopPropagation(); applyDrop(s.id, ii); } }}
                  >
                    <span className="st-drag-handle" draggable onDragStart={(e) => { e.stopPropagation(); setDrag({ kind: "item", id: it.id, from: s.id }); }} onDragEnd={() => { setDrag(null); setDropTarget(null); }} title="Drag to reorder or move to another section">⋮⋮</span>
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
      {pageOpen && (
        <PageDialog tree={tree} onClose={() => setPageOpen(false)} onSaved={(t) => { if (t) setTree(t); }} run={run} />
      )}
      {shareOpen && (
        <ShareDialog tree={tree} onClose={() => setShareOpen(false)} />
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
        {it && !state.catalogue && <ItemModifiers itemId={it.id} currency={currency} run={run} initial={it.modifier_groups ?? []} />}
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

// ---------- Page (digital header) dialog ----------
function PageDialog({ tree, onClose, onSaved, run }: {
  tree: StudioTree; onClose: () => void;
  onSaved: (tree: StudioTree | undefined) => void;
  run: <T>(p: Promise<T>, opts?: { tree?: boolean; ok?: string }) => Promise<T | undefined>;
}) {
  useEscape(onClose);
  const { restaurantId, show } = useOwner();
  const d: any = tree.digital ?? {};
  const [bizName, setBizName] = useState<string>(d.biz_name ?? "");
  const [phone, setPhone] = useState<string>(d.phone ?? "");
  const [info, setInfo] = useState<string>(d.info ?? "");
  const [linkUrl, setLinkUrl] = useState<string>(d.link_url ?? "");
  const [linkText, setLinkText] = useState<string>(d.link_text ?? "");
  const [welcomeAlert, setWelcomeAlert] = useState<string>(d.welcome_alert ?? "");
  const [bannerBg, setBannerBg] = useState<string>(d.banner_bg || "#c8a56b");
  const [logoUrl, setLogoUrl] = useState<string>(d.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState<string>(d.banner_url ?? "");
  const [busy, setBusy] = useState<null | "logo" | "banner">(null);
  const [hours, setHours] = useState<Record<string, { open: string; close: string } | null>>(() => {
    const h = d.hours && typeof d.hours === "object" && !Array.isArray(d.hours) ? d.hours : {};
    const out: Record<string, { open: string; close: string } | null> = {};
    for (const k of DAY_KEYS) { const v = (h as any)[k]; out[k] = v && v.open && v.close ? { open: String(v.open), close: String(v.close) } : null; }
    return out;
  });
  const setDay = (k: string, v: { open: string; close: string } | null) => setHours((h) => ({ ...h, [k]: v }));

  const upload = async (kind: "logo" | "banner", file: File | undefined) => {
    if (!file) return;
    setBusy(kind);
    try {
      const url = await uploadStudioImage(restaurantId, file);
      if (kind === "logo") setLogoUrl(url); else setBannerUrl(url);
    } catch (e: any) { show("Upload failed: " + (e?.message ?? "error")); }
    finally { setBusy(null); }
  };

  const save = async () => {
    const t = await run(studioDigitalSave(tree.menu.id, {
      biz_name: bizName.trim(), phone: phone.trim(), info: info.trim(),
      link_url: linkUrl.trim(), link_text: linkText.trim(),
      welcome_alert: welcomeAlert.trim(), banner_bg: bannerBg,
      logo_url: logoUrl, banner_url: bannerUrl, hours,
    }), { ok: "Page saved" });
    onSaved(t as any);
  };

  return (
    <div className="st-dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st-dialog">
        <h3>Page · {tree.menu.name}</h3>
        <p style={{ fontSize: 12, color: "#a29d93", marginTop: -4 }}>Controls the header diners see above the menu. This does not change the payment or bill screens.</p>

        <label className="st-tsub">Announcement bar</label>
        <div className="st-field">
          <label>Welcome message (leave blank to hide)</label>
          <input value={welcomeAlert} onChange={(e) => setWelcomeAlert(e.target.value)} placeholder="e.g. Happy hour 5–7pm · 2-for-1 cocktails" />
        </div>
        <div className="st-colour-row">
          <span>Bar colour</span>
          <input type="color" value={bannerBg} onChange={(e) => setBannerBg(e.target.value)} aria-label="Bar colour" />
          <input className="st-colour-hex" value={bannerBg} onChange={(e) => setBannerBg(e.target.value)} />
        </div>

        <label className="st-tsub">Business</label>
        <div className="st-two">
          <div className="st-field"><label>Business name</label><input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder={tree.menu.name} /></div>
          <div className="st-field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 …" /></div>
        </div>
        <div className="st-field"><label>Info line</label><input value={info} onChange={(e) => setInfo(e.target.value)} placeholder="e.g. Open daily 11am–11pm · Osu, Accra" /></div>
        <div className="st-two">
          <div className="st-field"><label>Link URL</label><input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" /></div>
          <div className="st-field"><label>Link text</label><input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="e.g. Visit website" /></div>
        </div>

        <label className="st-tsub">Images</label>
        <div className="st-two">
          <div className="st-field">
            <label>Logo</label>
            {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: "auto", borderRadius: 6, marginBottom: 6, background: "#fff", padding: 4 }} />}
            <input type="file" accept="image/*" onChange={(e) => upload("logo", e.target.files?.[0])} disabled={busy === "logo"} />
            {logoUrl && <button className="quiet" style={{ color: "#b0553f", marginTop: 4 }} onClick={() => setLogoUrl("")}>Remove logo</button>}
          </div>
          <div className="st-field">
            <label>Banner</label>
            {bannerUrl && <img src={bannerUrl} alt="" style={{ height: 44, width: "100%", objectFit: "cover", borderRadius: 6, marginBottom: 6 }} />}
            <input type="file" accept="image/*" onChange={(e) => upload("banner", e.target.files?.[0])} disabled={busy === "banner"} />
            {bannerUrl && <button className="quiet" style={{ color: "#b0553f", marginTop: 4 }} onClick={() => setBannerUrl("")}>Remove banner</button>}
          </div>
        </div>

        <label className="st-tsub">Opening hours</label>
        <p style={{ fontSize: 11, color: "#a29d93", margin: "2px 0 6px" }}>Diners see an “Open now / Closed now” badge (Accra time). Untick a day if you’re closed then.</p>
        <div className="st-hours">
          {DAY_KEYS.map((k) => {
            const day = hours[k];
            return (
              <div className="st-hours-row" key={k}>
                <label className="st-check st-hours-day"><input type="checkbox" checked={!!day} onChange={(e) => setDay(k, e.target.checked ? (day ?? { open: "09:00", close: "22:00" }) : null)} /> {DAY_LABELS[k]}</label>
                {day ? (
                  <span className="st-hours-times">
                    <input type="time" value={day.open} onChange={(e) => setDay(k, { open: e.target.value, close: day.close })} />
                    <span>to</span>
                    <input type="time" value={day.close} onChange={(e) => setDay(k, { open: day.open, close: e.target.value })} />
                  </span>
                ) : (
                  <span className="st-hours-closed">Closed</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="st-dialog-actions">
          <span className="st-spacer" />
          <button className="quiet" onClick={onClose}>Cancel</button>
          <button className="gold-button" onClick={save} disabled={!!busy}>{busy ? "Uploading…" : "Save page"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Item modifiers (options / add-ons) ----------
function ItemModifiers({ itemId, currency, run, initial }: {
  itemId: string; currency: string;
  run: <T>(p: Promise<T>, opts?: { tree?: boolean; ok?: string }) => Promise<T | undefined>;
  initial: ModifierGroup[];
}) {
  const [groups, setGroups] = useState<ModifierGroup[]>(initial);
  const sync = (t: StudioTree | undefined) => {
    if (!t) return;
    const fresh = t.sections.flatMap((s) => s.items).find((i) => i.id === itemId);
    setGroups(fresh?.modifier_groups ?? []);
  };
  const addGroup = async () => sync(await run(studioModifierGroupUpsert(itemId, { name: "Options", required: false, min_select: 0, max_select: 1 }), { ok: "Option group added" }) as any);
  const saveGroup = async (g: ModifierGroup, patch: Record<string, unknown>) => sync(await run(studioModifierGroupUpsert(itemId, { id: g.id, ...patch })) as any);
  const delGroup = async (g: ModifierGroup) => { if (!window.confirm(`Delete option group "${g.name || "Untitled"}"?`)) return; sync(await run(studioModifierGroupDelete(g.id), { ok: "Group removed" }) as any); };
  const addMod = async (g: ModifierGroup) => sync(await run(studioModifierUpsert(g.id, { name: "New option", price_pesewas: 0, available: true })) as any);
  const saveMod = async (g: ModifierGroup, m: Modifier, patch: Record<string, unknown>) => sync(await run(studioModifierUpsert(g.id, { id: m.id, ...patch })) as any);
  const delMod = async (m: Modifier) => sync(await run(studioModifierDelete(m.id)) as any);
  const cedis = (p: number) => String((p || 0) / 100);
  const toPesewas = (v: string) => Math.max(0, Math.round((parseFloat(v) || 0) * 100));

  return (
    <div className="st-mods">
      <div className="st-mods-head">
        <label className="st-tsub" style={{ margin: 0 }}>Options &amp; add-ons</label>
        <button type="button" className="outline-button" onClick={addGroup}>＋ Add option group</button>
      </div>
      {groups.length === 0 && <p style={{ fontSize: 12, color: "#a29d93", margin: "4px 0 0" }}>No options yet. Add a group like “Size”, “Protein” or “Extras”, then list the choices under it.</p>}
      {groups.map((g) => (
        <div className="st-mod-group" key={g.id}>
          <div className="st-mod-group-head">
            <input className="st-mod-gname" defaultValue={g.name} placeholder="Group name (e.g. Size)" onBlur={(e) => { if (e.target.value.trim() !== g.name) saveGroup(g, { name: e.target.value.trim() }); }} />
            <label className="st-check"><input type="checkbox" checked={g.required} onChange={(e) => saveGroup(g, { required: e.target.checked })} /> Required</label>
            <span className="st-mod-minmax">
              <label>Min<select value={g.min_select} onChange={(e) => saveGroup(g, { min_select: Number(e.target.value) })}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label>Max<select value={g.max_select} onChange={(e) => saveGroup(g, { max_select: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            </span>
            <button type="button" className="st-icon-btn" title="Delete group" onClick={() => delGroup(g)}>🗑</button>
          </div>
          <div className="st-mod-list">
            {g.modifiers.map((m) => (
              <div className="st-mod-row" key={m.id}>
                <input className="st-mod-name" defaultValue={m.name} placeholder="Option name" onBlur={(e) => { if (e.target.value.trim() !== m.name) saveMod(g, m, { name: e.target.value.trim() }); }} />
                <span className="st-mod-price"><small>{currency === "GHS" ? "GH₵" : ""}</small><input defaultValue={cedis(m.price_pesewas)} inputMode="decimal" placeholder="0" onBlur={(e) => { const px = toPesewas(e.target.value); if (px !== m.price_pesewas) saveMod(g, m, { price_pesewas: px }); }} /></span>
                <label className="st-check" title="Available"><input type="checkbox" checked={m.available} onChange={(e) => saveMod(g, m, { available: e.target.checked })} /></label>
                <button type="button" className="st-icon-btn" title="Delete option" onClick={() => delMod(m)}>✕</button>
              </div>
            ))}
            <button type="button" className="quiet st-mod-add" onClick={() => addMod(g)}>＋ Add option</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Share dialog (public link + QR) ----------
function ShareDialog({ tree, onClose }: { tree: StudioTree; onClose: () => void }) {
  useEscape(onClose);
  const { show } = useOwner();
  const slug: string | null = (tree.digital as any)?.public_slug ?? null;
  const isLive = tree.menu.status === "live" && !!slug;
  const url = slug ? publicMenuUrl(slug) : "";
  const wrapRef = useRef<HTMLDivElement>(null);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); show("Link copied"); }
    catch { show("Couldn't copy — select the link and copy manually"); }
  };
  const downloadPng = () => {
    const canvas = wrapRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${slug || "menu"}-qr.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="st-dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st-dialog">
        <h3>Share · {tree.menu.name}</h3>
        {!isLive ? (
          <>
            <p style={{ fontSize: 13, color: "#77736c" }}>Publish this menu first — set it to <b>Live</b> using the badge at the top — to get a public link and a QR code diners can scan without a table.</p>
            <div className="st-dialog-actions">
              <span className="st-spacer" />
              <button className="gold-button" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "#a29d93", marginTop: -4 }}>A view-only public menu. Anyone can open it — no table scan needed. Reflects your latest published changes.</p>
            <div className="st-share-url">
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              <button className="outline-button" onClick={copy}>Copy</button>
            </div>
            <div className="st-share-qr" ref={wrapRef}>
              <QRCodeCanvas value={url} size={220} marginSize={2} level="M" fgColor="#171717" bgColor="#ffffff" />
            </div>
            <div className="st-dialog-actions">
              <a className="quiet" href={url} target="_blank" rel="noopener noreferrer">Open menu ↗</a>
              <span className="st-spacer" />
              <button className="outline-button" onClick={downloadPng}>Download QR (PNG)</button>
              <button className="gold-button" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
