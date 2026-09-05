import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { cedis, relTime } from "@/lib/owner-api";

type Note = {
  id: string;
  table_label: string | null;
  amount_pesewas: number | null;
  message: string | null;
  kind: string;
  created_at: string | null;
};

// Short chime on a new payment — no audio asset needed.
function chime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.52);
    o.onended = () => ctx.close();
  } catch { /* audio not available */ }
}

function label(n: Note) {
  if (n.kind === "payment") return "Table " + (n.table_label ?? "—") + " paid " + cedis(n.amount_pesewas) + " via Klown";
  return n.message ?? "POS notice";
}

/** Live payment alerts for the signed-in owner's restaurant: a bell with an
 * unread badge + dropdown, a fly-in toast and a chime on each new Klown payment.
 * Reads staff_notifications directly (owner-scoped RLS) and subscribes to inserts. */
export default function OwnerNotifications({ restaurantId }: { restaurantId: string }) {
  const nav = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<Note | null>(null);
  const seeded = useRef(false);

  // Seed the list from history (most recent first).
  useEffect(() => {
    let alive = true;
    if (!restaurantId) return;
    supabase
      .from("staff_notifications")
      .select("id,table_label,amount_pesewas,message,kind,created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (alive && data) { setNotes(data as Note[]); seeded.current = true; } });
    return () => { alive = false; };
  }, [restaurantId]);

  // Live inserts.
  useEffect(() => {
    if (!restaurantId) return;
    const ch = supabase
      .channel("owner-notifications-" + restaurantId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_notifications", filter: "restaurant_id=eq." + restaurantId },
        (payload: any) => {
          const n = payload.new as Note;
          setNotes((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 30));
          setUnread((u) => u + 1);
          setFlash(n);
          chime();
          setTimeout(() => setFlash((f) => (f && f.id === n.id ? null : f)), 8000);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurantId]);

  const toggle = () => {
    setOpen((v) => {
      const nv = !v;
      if (nv) setUnread(0);
      return nv;
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="outline-button"
        aria-label="Payment alerts"
        onClick={toggle}
        style={{ position: "relative", padding: "0 12px", minWidth: 0 }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>🔔</span>
        {unread > 0 && (
          <span style={{ position: "absolute", top: -6, right: -6, background: "#c8a56b", color: "#171717", fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, maxHeight: 420, overflowY: "auto", background: "#171717", color: "#f5f1e9", boxShadow: "0 12px 40px #17171744", zIndex: 61, border: "1px solid #2a2a2a" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a2a", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#c8a56b" }}>Payment alerts</div>
            {notes.length === 0 ? (
              <div style={{ padding: "20px 16px", fontSize: 13, color: "#9a958c" }}>No payments yet. Alerts appear here the moment a table pays via Klown.</div>
            ) : (
              notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setOpen(false); nav({ to: "/owner" }); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #232323", padding: "12px 16px", cursor: "pointer", color: "#f5f1e9" }}
                >
                  <div style={{ fontSize: 13 }}>{label(n)}</div>
                  <div style={{ fontSize: 11, color: "#9a958c", marginTop: 3 }}>{relTime(n.created_at)}</div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {flash && (
        <div
          onClick={() => setFlash(null)}
          style={{ position: "fixed", top: 16, right: 16, zIndex: 90, cursor: "pointer", minWidth: 260, background: "#171717", color: "#f5f1e9", padding: "14px 16px", borderLeft: "3px solid " + (flash.kind === "payment" ? "#c8a56b" : "#9b7544"), boxShadow: "0 6px 24px #17171733" }}
        >
          <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "#c8a56b" }}>{flash.kind === "payment" ? "Payment received" : "POS notice"}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>{label(flash)}</div>
        </div>
      )}
    </div>
  );
}
