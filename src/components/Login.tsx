import { useState } from "react";
import { Palmtree, User, Lock, ChevronRight, MapPin, Globe, Plane, Eye, EyeOff } from "lucide-react";
import { C, inputStyle } from "../lib/theme";
import { Chip, Btn, Field } from "./ui";
import { login } from "../lib/api";
import type { LoginResult } from "../lib/types";

/* ---------------- Login ---------------- */
export function Login({ onLogin }: { onLogin: (result: LoginResult) => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [showPw, setShowPw] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!u.trim() || !p || busy) return;
    setErr(""); setBusy(true);
    try {
      const result = await login(u.trim(), p);
      if (!result) { setErr("Incorrect username or password. Try again."); setBusy(false); return; }
      onLogin(result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };
  return (
    <div className="flex" style={{ minHeight: "100vh" }}>
      {/* brand panel */}
      <div className="hidden md:flex flex-col justify-between" style={{
        width: 320, position: "relative", overflow: "hidden",
        background: `linear-gradient(165deg, ${C.ink} 0%, ${C.ink2} 55%, #24345C 100%)`, color: "#fff", padding: 32
      }}>
        <Plane size={130} color="#fff" style={{ position: "absolute", top: -20, right: -30, opacity: 0.06, transform: "rotate(35deg)" }} />
        <Globe size={170} color="#fff" style={{ position: "absolute", bottom: -50, left: -50, opacity: 0.05 }} />
        <div style={{ position: "relative" }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center" style={{
              width: 38, height: 38, borderRadius: 11,
              background: `linear-gradient(155deg, ${C.gold} 0%, ${C.peach} 55%, ${C.international} 100%)`
            }}>
              <Palmtree size={20} color="#fff" />
            </div>
            <div style={{ letterSpacing: 0.3 }}>
              <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>GLADEX</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>Travel &amp; Tours Corp.</div>
            </div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15, marginTop: 40 }}>Product<br />Development<br />Team</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, marginTop: 14, lineHeight: 1.6 }}>
            Work dashboard for tasking, targets, and team efficiency — Domestic and International.
          </p>
        </div>
        <div className="flex gap-2" style={{ position: "relative" }}>
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
            <div className="pt-1"><Btn onClick={submit} kind="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <ChevronRight size={15} /></Btn></div>
          </div>
        </div>
      </div>
    </div>
  );
}
