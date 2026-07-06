import type { ReactNode } from "react";
import {
  ScrollText, Lock, CheckCircle2, Send, Plus, Activity, ArrowRightLeft, MessageSquare, Paperclip, Link2
} from "lucide-react";
import { C, card, teamColor } from "../lib/theme";
import { fmtDate, relTime } from "../lib/helpers";
import { Chip } from "./ui";
import type { LogEntry } from "../lib/types";

/* ---------------- Access logs ---------------- */
export function Logs({ logs, title = "Access logs" }: { logs: LogEntry[]; title?: string }) {
  const icon: Record<string, ReactNode> = { login: <Lock size={14} color={C.sub} />, complete: <CheckCircle2 size={14} color={C.amber} />, publish: <Send size={14} color={C.teal} />, create: <Plus size={14} color={C.ink2} />, status: <Activity size={14} color={C.ink2} />, reassign: <ArrowRightLeft size={14} color={C.international} />, comment: <MessageSquare size={14} color={C.ink2} />, proof: <Paperclip size={14} color={C.sub} />, link: <Link2 size={14} color={C.sub} /> };
  return (
    <div style={{ ...card, padding: 16, maxWidth: 640 }}>
      <div className="flex items-center gap-2 mb-3"><ScrollText size={16} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span></div>
      {logs.length === 0 && <div style={{ fontSize: 13.5, color: C.sub }}>No activity recorded yet.</div>}
      <div>
        {logs.map((l) => (
          <div key={l.id} className="flex items-center gap-3" style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 8, background: C.paper, flexShrink: 0 }}>{icon[l.type] || <Activity size={14} />}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5 }}><b>{l.name}</b> · {l.detail}</div>
              <div style={{ fontSize: 11.5, color: C.sub }}>{fmtDate(l.ts)} · {relTime(l.ts)}</div>
            </div>
            <Chip color={l.role === "admin" ? C.ink2 : teamColor("Domestic")} soft={C.paper}>{l.role}</Chip>
          </div>
        ))}
      </div>
    </div>
  );
}
