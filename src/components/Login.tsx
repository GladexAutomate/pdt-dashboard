import { useState } from "react";
import { Package, User, Lock, ChevronRight, MapPin, Globe, Eye, EyeOff } from "lucide-react";
import { C, inputStyle, teamColor } from "../lib/theme";
import { Chip, Btn, Field } from "./ui";
import type { AppData, LoginPayload, Team } from "../lib/types";

interface LoginAccount {
  role?: string;
  username: string;
  password: string;
  name: string;
  id?: string;
  team?: Team;
}

/* ---------------- Login ---------------- */
export function Login({ data, onLogin }: { data: AppData; onLogin: (payload: LoginPayload) => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [showPw, setShowPw] = useState(false);
  const accounts: LoginAccount[] = [{ role: "admin", ...data.admin }, ...data.agents];
  const submit = () => {
    const found = accounts.find((a) => a.username === u.trim().toLowerCase() && a.password === p);
    if (!found) { setErr("Incorrect username or password. Try again."); return; }
    onLogin(found.role === "admin" ? { role: "admin" } : (found as unknown as LoginPayload));
  };
  return (
    <div className="flex" style={{ minHeight: "100vh" }}>
      {/* brand panel */}
      <div className="hidden md:flex flex-col justify-between" style={{ width: 320, background: C.ink, color: "#fff", padding: 32 }}>
        <div>
          <div className="flex items-center gap-2" style={{ letterSpacing: 1 }}>
            <Package size={20} color={C.gold} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>PDT</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15, marginTop: 40 }}>Product<br />Development<br />Team</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, marginTop: 14, lineHeight: 1.6 }}>
            Work dashboard for tasking, targets, and team efficiency — Domestic and International.
          </p>
        </div>
        <div className="flex gap-2">
          <Chip color="#fff" soft="rgba(224,102,63,0.25)" icon={<MapPin size={12} />}>Domestic</Chip>
          <Chip color="#fff" soft="rgba(60,108,224,0.3)" icon={<Globe size={12} />}>International</Chip>
        </div>
      </div>
      {/* form */}
      <div className="flex-1 flex items-center justify-center" style={{ padding: 28 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Sign in</h2>
          <p style={{ color: C.sub, fontSize: 13.5, marginTop: 4, marginBottom: 22 }}>Use the account assigned to you.</p>
          <div className="space-y-3">
            <Field label="Username">
              <div className="flex items-center gap-2" style={{ ...inputStyle, padding: 0, paddingLeft: 11 }}>
                <User size={16} color={C.sub} />
                <input value={u} onChange={(e) => { setU(e.target.value); setErr(""); }} placeholder="e.g. admin"
                  onKeyDown={(e) => e.key === "Enter" && submit()} style={{ border: "none", outline: "none", padding: "9px 11px 9px 4px", flex: 1, fontSize: 14, background: "transparent" }} />
              </div>
            </Field>
            <Field label="Password">
              <div className="flex items-center gap-2" style={{ ...inputStyle, padding: 0, paddingLeft: 11 }}>
                <Lock size={16} color={C.sub} />
                <input type={showPw ? "text" : "password"} value={p} onChange={(e) => { setP(e.target.value); setErr(""); }} placeholder="••••••"
                  onKeyDown={(e) => e.key === "Enter" && submit()} style={{ border: "none", outline: "none", padding: "9px 4px 9px 4px", flex: 1, fontSize: 14, background: "transparent" }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ background: "transparent", border: "none", padding: "9px 11px 9px 0", cursor: "pointer", display: "flex", alignItems: "center", color: C.sub }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            {err && <div style={{ color: C.rose, fontSize: 12.5 }}>{err}</div>}
            <div className="pt-1"><Btn onClick={submit} kind="primary">Sign in <ChevronRight size={15} /></Btn></div>
          </div>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px dashed ${C.line}` }}>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>Demo accounts — tap to fill</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setU(data.admin.username); setP(data.admin.password); }} className="font-semibold" style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.ink, color: "#fff" }}>admin</button>
              {data.agents.map((a) => (
                <button key={a.id} onClick={() => { setU(a.username); setP(a.password); }} className="font-semibold"
                  style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#fff", color: teamColor(a.team) }}>{a.name}</button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: C.sub, marginTop: 8 }}>Agents password: <b>pdt123</b> · Admin: <b>admin123</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
