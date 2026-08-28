import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Staff = {
  id: string;
  email: string;
  name: string | null;
  role: "super_admin" | "operations_admin" | "finance_admin" | "read_only";
  status: string;
};

type AuthValue = {
  ready: boolean;
  session: Session | null;
  staff: Staff | null;
  loadingStaff: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) { setStaff(null); return; }
    let active = true;
    setLoadingStaff(true);
    supabase
      .from("staff")
      .select("id,email,name,role,status")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setStaff((data as Staff) ?? null);
        setLoadingStaff(false);
      });
    return () => { active = false; };
  }, [session]);

  const signIn: AuthValue["signIn"] = async (email, password) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError(error.message); return { ok: false, message: error.message }; }
    return { ok: true };
  };

  const signUp: AuthValue["signUp"] = async (email, password) => {
    setError(null);
    const e = email.trim().toLowerCase();
    const { data: allowed, error: cbErr } = await supabase.rpc("can_bootstrap", { p_email: e });
    if (cbErr) { setError(cbErr.message); return { ok: false, message: cbErr.message }; }
    if (!allowed) {
      const m = "This email isn't authorised for admin access.";
      setError(m); return { ok: false, message: m };
    }
    const { error: suErr } = await supabase.auth.signUp({ email: e, password });
    if (suErr) { setError(suErr.message); return { ok: false, message: suErr.message }; }
    // Trigger auto-confirms authorised emails; sign in immediately.
    const { error: siErr } = await supabase.auth.signInWithPassword({ email: e, password });
    if (siErr) { setError(siErr.message); return { ok: false, message: siErr.message }; }
    return { ok: true };
  };

  const signOut = async () => { await supabase.auth.signOut(); setStaff(null); };

  return (
    <Ctx.Provider value={{ ready, session, staff, loadingStaff, error, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
