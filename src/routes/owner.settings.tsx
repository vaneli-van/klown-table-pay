import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OwnerLayout, { useOwner } from "@/components/OwnerLayout";
import { supabase } from "@/lib/supabase";
import {
  ownerProfile, ownerSaveProfile, ownerTeam, ownerInviteMember, ownerRemoveMember,
  ownerNotifyPhones, ownerSaveNotifyPhones,
  titleCase, type OwnerProfile, type TeamMember,
} from "@/lib/owner-api";

const TITLE = "Settings";

export const Route = createFileRoute("/owner/settings")({
  head: () => ({
    meta: [
      { title: `Klown — ${TITLE}` },
      { name: "description", content: "Manage your account, restaurant profile, team and alerts." },
    ],
  }),
  component: () => (
    <OwnerLayout title={TITLE}>
      <SettingsBody />
    </OwnerLayout>
  ),
});

function SettingsBody() {
  return (
    <>
      <AccountCard />
      <ProfileCard />
      <TeamCard />
      <NotificationsCard />
    </>
  );
}

// ---------------- Account & password ----------------
function AccountCard() {
  const { show } = useOwner();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);

  const changePw = async () => {
    if (pw.length < 8) { show("Password must be at least 8 characters"); return; }
    if (pw !== pw2) { show("Passwords do not match"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw(""); setPw2("");
      show("Password updated");
    } catch (e: any) { show("Couldn't update password: " + (e?.message ?? "error")); }
    finally { setSaving(false); }
  };

  return (
    <div className="panel">
      <div className="panel-heading"><div><span className="panel-kicker">Account</span><h2>Your login</h2></div></div>
      <div className="detail-note"><span>You are signed in as <b>{email || "…"}</b>. Set a new password below, or sign out.</span></div>
      <div className="own-form" style={{ marginTop: 14 }}>
        <div className="own-field"><label>New password</label>
          <input className="wide-input" style={{ margin: 0 }} type="password" autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="own-field"><label>Confirm new password</label>
          <input className="wide-input" style={{ margin: 0 }} type="password" autoComplete="new-password" placeholder="Re-enter password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <div className="own-actions" style={{ gap: 10 }}>
          <button className="gold-button" type="button" disabled={saving || !pw} onClick={changePw}>{saving ? "Saving…" : "Update password"}</button>
          <button className="outline-button" type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Restaurant profile ----------------
function ProfileCard() {
  const { restaurantId, show } = useOwner();
  const qc = useQueryClient();
  const { data } = useQuery<OwnerProfile>({ queryKey: ["owner_profile", restaurantId], enabled: !!restaurantId, queryFn: ownerProfile });
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!data) return;
    setName(data.name ?? ""); setCity(data.city ?? ""); setPhone(data.contact_phone ?? ""); setAddress(data.address ?? "");
  }, [data]);

  const save = async () => {
    if (!name.trim()) { show("Restaurant name can't be empty"); return; }
    setSaving(true);
    try {
      await ownerSaveProfile({ name: name.trim(), city: city.trim(), contact_phone: phone.trim(), address: address.trim() });
      show("Profile saved");
      qc.invalidateQueries({ queryKey: ["owner_profile", restaurantId] });
    } catch (e: any) { show("Couldn't save: " + (e?.message ?? "error")); }
    finally { setSaving(false); }
  };

  return (
    <div className="panel">
      <div className="panel-heading"><div><span className="panel-kicker">Restaurant</span><h2>Profile</h2></div></div>
      <div className="detail-note"><span>Your restaurant's name, location and contact details.</span></div>
      <div className="own-form" style={{ marginTop: 14 }}>
        <div className="own-field"><label>Restaurant name</label>
          <input className="wide-input" style={{ margin: 0 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Naxos" />
        </div>
        <div className="own-field"><label>City</label>
          <input className="wide-input" style={{ margin: 0 }} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Accra" />
        </div>
        <div className="own-field"><label>Contact phone</label>
          <input className="wide-input" style={{ margin: 0 }} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000" />
        </div>
        <div className="own-field"><label>Address</label>
          <input className="wide-input" style={{ margin: 0 }} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area" />
        </div>
        <div className="own-actions">
          <button className="gold-button" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save profile"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Team / owners ----------------
function TeamCard() {
  const { restaurantId, show } = useOwner();
  const qc = useQueryClient();
  const { data: team = [], isLoading } = useQuery<TeamMember[]>({ queryKey: ["owner_team", restaurantId], enabled: !!restaurantId, queryFn: ownerTeam });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("owner");
  const [inviting, setInviting] = useState(false);

  const invite = async () => {
    const e = email.trim();
    if (!e) return;
    setInviting(true);
    try {
      const res = await ownerInviteMember(e, role);
      if (res?.status === "already_member") show(e + " is already on the team");
      else show("Invited " + e);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["owner_team", restaurantId] });
    } catch (err: any) {
      show("Couldn't invite: " + (err?.message === "invalid_email" ? "check the email address" : err?.message ?? "error"));
    } finally { setInviting(false); }
  };

  const remove = async (m: TeamMember) => {
    if (!window.confirm(`Remove ${m.email} from this restaurant?`)) return;
    try {
      await ownerRemoveMember(m.email);
      show("Removed " + m.email);
      qc.invalidateQueries({ queryKey: ["owner_team", restaurantId] });
    } catch (err: any) {
      const msg = err?.message === "cannot_remove_self" ? "you can't remove yourself"
        : err?.message === "cannot_remove_last_owner" ? "a restaurant must keep at least one owner"
        : err?.message ?? "error";
      show("Couldn't remove: " + msg);
    }
  };

  return (
    <div className="panel">
      <div className="panel-heading"><div><span className="panel-kicker">Team</span><h2>Owners &amp; managers</h2></div></div>
      <div className="detail-note"><span>People who can sign in and manage this restaurant. Invite by email; they set their own password when they join.</span></div>

      <div className="admin-table" style={{ marginTop: 14 }}>
        <div className="table-row own-team-row table-head"><span>Email</span><span>Role</span><span>Status</span><span></span></div>
        {isLoading ? (
          <div className="empty-state"><h3>Loading…</h3></div>
        ) : team.length === 0 ? (
          <div className="empty-state"><h3>No team members yet</h3></div>
        ) : (
          team.map((m) => (
            <div className="table-row own-team-row" key={m.email}>
              <span><b>{m.email}</b>{m.is_self ? <small>You</small> : null}</span>
              <span>{titleCase(m.role)}</span>
              <span>
                <span className={m.status === "invited" ? "status-badge" : m.linked ? "status-badge status-success" : "status-badge"}>
                  {m.status === "invited" ? "Invited" : m.linked ? "Active" : "Pending sign-in"}
                </span>
              </span>
              <span>{m.is_self ? null : <button className="quiet" type="button" onClick={() => remove(m)}>Remove</button>}</span>
            </div>
          ))
        )}
      </div>

      <div className="own-form" style={{ marginTop: 16 }}>
        <div className="own-field"><label>Invite by email</label>
          <input className="wide-input" style={{ margin: 0 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="new-owner@restaurant.com" />
        </div>
        <div className="own-field"><label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div className="own-actions">
          <button className="gold-button" type="button" disabled={inviting || !email.trim()} onClick={invite}>{inviting ? "Inviting…" : "Send invite"}</button>
        </div>
      </div>
      <div className="detail-note" style={{ marginTop: 10 }}><span>Once the email channel (Resend) is connected, invites are emailed with a secure set-password link. Until then, the invited person can create their account with this exact email and they'll be linked automatically.</span></div>
    </div>
  );
}

// ---------------- Notifications (SMS alerts) ----------------
function toLocal(m: string): string {
  return m && m.startsWith("233") && m.length === 12 ? "0" + m.slice(3) : m;
}
function NotificationsCard() {
  const { restaurantId, show } = useOwner();
  const qc = useQueryClient();
  const { data } = useQuery<{ phones: string[] }>({ queryKey: ["owner_notify_phones", restaurantId], enabled: !!restaurantId, queryFn: ownerNotifyPhones });
  const [nums, setNums] = useState<string[]>(["", "", ""]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { const p = data?.phones ?? []; setNums([toLocal(p[0] ?? ""), toLocal(p[1] ?? ""), toLocal(p[2] ?? "")]); }, [data]);
  const set = (i: number, v: string) => setNums((a) => a.map((x, j) => (j === i ? v : x)));
  const save = async () => {
    setSaving(true);
    try {
      const res = await ownerSaveNotifyPhones(nums.map((n) => n.trim()).filter(Boolean));
      const p = res?.phones ?? [];
      setNums([toLocal(p[0] ?? ""), toLocal(p[1] ?? ""), toLocal(p[2] ?? "")]);
      show(p.length ? `Saved ${p.length} alert number${p.length === 1 ? "" : "s"}` : "Alert numbers cleared");
      qc.invalidateQueries({ queryKey: ["owner_notify_phones", restaurantId] });
    } catch (e: any) {
      show("Couldn't save: " + (e?.message === "not_authorized" ? "not authorised for this restaurant" : e?.message ?? "error"));
    } finally { setSaving(false); }
  };
  return (
    <div className="panel">
      <div className="panel-heading"><div><span className="panel-kicker">Notifications</span><h2>SMS payment alerts</h2></div></div>
      <div className="detail-note"><span>Get a text the moment a table or counter pays via Klown, with the items and amount. Add up to 3 Ghana numbers.</span></div>
      <div className="own-form" style={{ marginTop: 14 }}>
        {[0, 1, 2].map((i) => (
          <div className="own-field" key={i}>
            <label>Number {i + 1}{i > 0 ? " (optional)" : ""}</label>
            <input className="wide-input" style={{ margin: 0 }} inputMode="tel" placeholder="024 000 0000" value={nums[i]} onChange={(e) => set(i, e.target.value)} />
          </div>
        ))}
        <div className="own-actions">
          <button className="gold-button" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save alert numbers"}</button>
        </div>
      </div>
    </div>
  );
}
