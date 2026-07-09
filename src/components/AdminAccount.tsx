import { useState } from "react";
import { X, UserCog } from "lucide-react";
import { C, inputStyle } from "../lib/theme";
import { Btn, Field } from "./ui";
import { PasswordField } from "./UserManagement";
import type { Session } from "../lib/types";

export interface UpdateAdminInput {
  currentPassword: string;
  name?: string;
  username?: string;
  password?: string;
}

interface AdminAccountProps {
  session: Session;
  onSave: (input: UpdateAdminInput) => Promise<string | null>;
  onClose: () => void;
}

/* ---------------- My Account (admin changes their own credentials) ---------------- */
export function AdminAccount({ session, onSave, onClose }: AdminAccountProps) {
  const [name, setName] = useState(session.name);
  const [username, setUsername] = useState(session.username || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const passwordsMatch = newPassword.trim() === "" || newPassword.trim() === confirmPassword.trim();
  const valid = name.trim().length > 1 && username.trim().length > 1 && currentPassword.trim().length > 0
    && passwordsMatch && (newPassword.trim() === "" || newPassword.trim().length > 3);

  const submit = async () => {
    setErr(""); setBusy(true);
    const result = await onSave({
      currentPassword: currentPassword.trim(),
      name: name.trim(),
      username: username.trim(),
      password: newPassword.trim() || undefined
    });
    setBusy(false);
    if (result) { setErr(result); return; }
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,28,46,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, marginTop: 24, marginBottom: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div className="flex items-start justify-between gap-3" style={{ padding: 18, borderBottom: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-2"><UserCog size={17} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 15.5 }}>My account</span></div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub }}><X size={18} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <div className="space-y-3">
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></Field>
            <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} style={inputStyle} /></Field>
            <Field label="New password"><PasswordField value={newPassword} onChange={setNewPassword} placeholder="Leave blank to keep current" /></Field>
            {newPassword.trim() !== "" && (
              <Field label="Confirm new password"><PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter new password" /></Field>
            )}
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 4 }}>
              <Field label="Current password (required to save)"><PasswordField value={currentPassword} onChange={setCurrentPassword} placeholder="Confirm it's you" /></Field>
            </div>
          </div>
          {!passwordsMatch && <div style={{ color: C.rose, fontSize: 12.5, marginTop: 8 }}>New passwords don't match.</div>}
          {err && <div style={{ color: C.rose, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
          <div className="flex gap-2 mt-4">
            <Btn kind="teal" sm disabled={!valid || busy} onClick={submit}>{busy ? "Saving…" : "Save changes"}</Btn>
            <Btn kind="ghost" sm onClick={onClose}>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
