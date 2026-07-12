import type { ReactNode, CSSProperties } from "react";
import { Palmtree, LogOut, UserCog } from "lucide-react";
import { C } from "../lib/theme";
import { Btn } from "./ui";
import type { Session } from "../lib/types";

const glass: CSSProperties = {
  background: "rgba(255,255,255,0.72)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)"
};

/* ---------------- Shell ---------------- */
export function Shell({ session, onLogout, onAccount, tabs, active, setActive, children }: {
  session: Session; onLogout: () => void; onAccount?: () => void; tabs: [string, string, ReactNode, number?][];
  active: string; setActive: (id: string) => void; children?: ReactNode;
}) {
  return (
    <div>
      <header className="flex items-center justify-between" style={{ ...glass, borderBottom: `1px solid ${C.line}`, padding: "12px 18px" }}>
        <div className="flex items-center gap-3">
          {/* swap for <img src={logo} alt="Gladex Travel and Tours" style={{ height: 42, borderRadius: 12 }} /> once the brand logo file is added */}
          <div className="flex items-center justify-center" style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(155deg, ${C.gold} 0%, ${C.peach} 55%, ${C.international} 100%)`,
            boxShadow: "0 4px 14px rgba(217,133,42,0.3)"
          }}>
            <Palmtree size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.15, letterSpacing: 0.2 }}>
              GLADEX <span style={{ fontWeight: 600, color: C.sub }}>Travel &amp; Tours Corp.</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.sub, marginTop: 1 }}>Product Development Daily Workspace</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{session.name}</div>
            <div style={{ fontSize: 11, color: C.sub, textTransform: "capitalize" }}>{session.role}</div>
          </div>
          {onAccount && <Btn onClick={onAccount} kind="ghost" sm icon={<UserCog size={14} />}>Account</Btn>}
          <Btn onClick={onLogout} kind="blue" sm icon={<LogOut size={14} />}>Logout</Btn>
        </div>
      </header>
      <nav className="flex gap-1.5 flex-wrap" style={{ ...glass, borderBottom: `1px solid ${C.line}`, padding: "8px 12px" }}>
        {tabs.map(([id, label, icon, badge]) => (
          <button key={id} onClick={() => setActive(id)} className="flex items-center gap-1.5 font-semibold"
            style={{
              fontSize: 13, padding: "8px 13px", borderRadius: 10, border: "none",
              color: active === id ? C.ink : C.sub,
              background: active === id ? C.skyBlueSoft : "transparent"
            }}>
            {icon}{label}
            {!!badge && (
              <span style={{ background: C.rose, color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, lineHeight: 1, padding: "2px 6px", minWidth: 16, textAlign: "center" }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <main style={{ padding: 18 }}>{children}</main>
    </div>
  );
}
