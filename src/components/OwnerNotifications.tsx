import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Bell } from "lucide-react";
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
    <div className="a-pop-wrap">
      <button className="a-icon-btn a-bell" aria-label={unread > 0 ? `Payment alerts, ${unread} new` : "Payment alerts"} aria-expanded={open} onClick={toggle}>
        <Bell aria-hidden="true" />
        {unread > 0 && <span className="a-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <>
          <div className="a-pop-scrim" onClick={() => setOpen(false)} />
          <div className="a-pop" role="dialog" aria-label="Payment alerts">
            <div className="a-pop-head">Payment alerts</div>
            {notes.length === 0 ? (
              <div className="a-pop-empty">No payments yet. Alerts appear here the moment a table pays via Klown.</div>
            ) : (
              notes.map((n) => (
                <button key={n.id} className="a-pop-item" onClick={() => { setOpen(false); nav({ to: "/owner" }); }}>
                  <span>{label(n)}</span>
                  <small>{relTime(n.created_at)}</small>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {flash && (
        <button className={"a-flash" + (flash.kind === "payment" ? "" : " warn")} onClick={() => setFlash(null)}>
          <small>{flash.kind === "payment" ? "Payment received" : "POS notice"}</small>
          <span>{label(flash)}</span>
        </button>
      )}
    </div>
  );
}
