import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { ghs } from "@/lib/format";

type Note = { id: string; table_label: string | null; amount_pesewas: number | null; message: string | null; kind: string };

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

// Live floor alert: toast + chime whenever a table pays via Klown. Subscribes to
// staff_notifications over Supabase realtime (RLS restricts rows to staff).
export default function PaymentAlerts() {
  const { staff } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    if (!staff) return;
    const ch = supabase
      .channel("staff-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_notifications" }, (payload: any) => {
        const n = payload.new as Note;
        setNotes((prev) => [n, ...prev].slice(0, 4));
        chime();
        setTimeout(() => setNotes((prev) => prev.filter((x) => x.id !== n.id)), 9000);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [staff?.id]);

  if (!notes.length) return null;
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 80, display: "flex", flexDirection: "column", gap: 8 }}>
      {notes.map((n) => (
        <div key={n.id} onClick={() => setNotes((p) => p.filter((x) => x.id !== n.id))}
          style={{ cursor: "pointer", minWidth: 250, background: "#171717", color: "#f5f1e9", padding: "14px 16px", borderLeft: "3px solid " + (n.kind === "payment" ? "#c8a56b" : "#9b7544"), boxShadow: "0 6px 24px #17171733" }}>
          <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "#c8a56b" }}>{n.kind === "payment" ? "Payment received" : "POS notice"}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>
            {n.kind === "payment"
              ? <>Table {n.table_label} paid <b style={{ fontWeight: 400 }}>{ghs(n.amount_pesewas)}</b> via Klown</>
              : n.message}
          </div>
        </div>
      ))}
    </div>
  );
}
