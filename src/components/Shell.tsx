import type { ReactNode } from "react";
import { Package, LogOut, UserCog } from "lucide-react";
import { C } from "../lib/theme";
import { Btn } from "./ui";
import type { Session } from "../lib/types";

/* ---------------- Shell ---------------- */
export function Shell({ session, onLogout, onAccount, tabs, active, setActive, children }: {
  session: Session; onLogout: () => void; onAccount?: () => void; tabs: [string, string, ReactNode][];
  active: string; setActive: (id: string) => void; children?: ReactNode;
}) {
  return (
    <div>
      <header className="flex items-center justify-between" style={{ background: C.surface, borderBottom: `1px solid ${C.line}`, padding: "12px 18px" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 9, background: C.ink }}>
            <Package size={17} color={C.gold} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.15 }}>Product Development Daily Workspace</div>
            <div style={{ fontSize: 11.5, color: C.sub }}>Tasking · targets · efficiency</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{session.name}</div>
            <div style={{ fontSize: 11, color: C.sub, textTransform: "capitalize" }}>{session.role}</div>
          </div>
          {onAccount && <Btn onClick={onAccount} kind="ghost" sm icon={<UserCog size={14} />}>Account</Btn>}
          <Btn onClick={onLogout} kind="ghost" sm icon={<LogOut size={14} />}>Logout</Btn>
        </div>
      </header>
      <nav className="flex gap-1 flex-wrap" style={{ background: C.surface, borderBottom: `1px solid ${C.line}`, padding: "0 12px" }}>
        {tabs.map(([id, label, icon]) => (
          <button key={id} onClick={() => setActive(id)} className="flex items-center gap-1.5 font-semibold"
            style={{ fontSize: 13, padding: "11px 13px", color: active === id ? C.text : C.sub, borderBottom: `2px solid ${active === id ? C.ink : "transparent"}`, background: "transparent" }}>
            {icon}{label}
          </button>
        ))}
      </nav>
      <main style={{ padding: 18 }}>{children}</main>
    </div>
  );
}
