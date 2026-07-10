import { useState, type ReactNode } from "react";
import {
  ScrollText, Lock, CheckCircle2, Send, Plus, Activity, ArrowRightLeft, MessageSquare, Paperclip, Link2,
  Filter, ChevronLeft, ChevronRight
} from "lucide-react";
import { C, card, teamColor, inputStyle } from "../lib/theme";
import { fmtDate, relTime } from "../lib/helpers";
import { Chip } from "./ui";
import type { LogEntry } from "../lib/types";

const TYPE_LABEL: Record<string, string> = {
  login: "Login", complete: "Completed", publish: "Published", create: "Created",
  status: "Status change", reassign: "Reassigned", comment: "Comment", proof: "Proof", link: "Link"
};
const PAGE_SIZE = 15;

/* ---------------- Access logs ---------------- */
export function Logs({ logs, title = "Access logs" }: { logs: LogEntry[]; title?: string }) {
  const icon: Record<string, ReactNode> = { login: <Lock size={14} color={C.sub} />, complete: <CheckCircle2 size={14} color={C.amber} />, publish: <Send size={14} color={C.teal} />, create: <Plus size={14} color={C.ink2} />, status: <Activity size={14} color={C.ink2} />, reassign: <ArrowRightLeft size={14} color={C.international} />, comment: <MessageSquare size={14} color={C.ink2} />, proof: <Paperclip size={14} color={C.sub} />, link: <Link2 size={14} color={C.sub} /> };

  const [fType, setFType] = useState("all");
  const [fUser, setFUser] = useState("all");
  const [page, setPage] = useState(0);

  const types = [...new Set(logs.map((l) => l.type))];
  const users = [...new Set(logs.map((l) => l.name))].sort();
  const filtered = logs.filter((l) => (fType === "all" || l.type === fType) && (fUser === "all" || l.name === fUser));

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  const setFilter = (setter: (v: string) => void, v: string) => { setter(v); setPage(0); };

  return (
    <div style={{ ...card, padding: 16, maxWidth: 640 }}>
      <div className="flex items-center gap-2 mb-3"><ScrollText size={16} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span></div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}><Filter size={13} /> Filter:</span>
        {users.length > 1 && (
          <select value={fUser} onChange={(e) => setFilter(setFUser, e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 9px", fontSize: 12.5 }}>
            <option value="all">All users</option>
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
        <select value={fType} onChange={(e) => setFilter(setFType, e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 9px", fontSize: 12.5 }}>
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>)}
        </select>
      </div>

      {filtered.length === 0 && <div style={{ fontSize: 13.5, color: C.sub }}>No activity matches these filters.</div>}
      <div>
        {shown.map((l) => (
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

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3" style={{ paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={clampedPage === 0} className="flex items-center gap-1"
            style={{ fontSize: 12.5, fontWeight: 600, color: C.text, background: "transparent", border: "none", cursor: clampedPage === 0 ? "default" : "pointer", opacity: clampedPage === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: 12, color: C.sub }}>Page {clampedPage + 1} of {pageCount}</span>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={clampedPage >= pageCount - 1} className="flex items-center gap-1"
            style={{ fontSize: 12.5, fontWeight: 600, color: C.text, background: "transparent", border: "none", cursor: clampedPage >= pageCount - 1 ? "default" : "pointer", opacity: clampedPage >= pageCount - 1 ? 0.4 : 1 }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
