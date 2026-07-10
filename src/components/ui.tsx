import { useState, useEffect, type ReactNode } from "react";
import { C, card, teamColor } from "../lib/theme";
import { STATUSES, STATUS_META, PRIORITIES, PRIORITY_META } from "../lib/constants";
import type { Agent, Team, Status, Priority, ChartItem } from "../lib/types";

/* ---------- tiny UI bits ---------- */

export function Avatar({ name, team, size = 38 }: { name: string; team: Team | string; size?: number }) {
  return (
    <div className="flex items-center justify-center font-semibold" style={{
      width: size, height: size, borderRadius: 11, color: "#fff",
      background: teamColor(team), fontSize: size * 0.4, flexShrink: 0
    }}>{name[0]}</div>
  );
}
export function Chip({ children, color, soft, icon }: { children: ReactNode; color: string; soft: string; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold" style={{
      fontSize: 11, padding: "3px 9px", borderRadius: 999,
      color: color, background: soft, lineHeight: 1.4
    }}>{icon}{children}</span>
  );
}

type BtnKind = "primary" | "teal" | "ghost" | "danger" | "blue";

export function Btn({ children, onClick, kind = "primary", icon, sm, disabled }: {
  children?: ReactNode; onClick?: () => void; kind?: BtnKind; icon?: ReactNode; sm?: boolean; disabled?: boolean;
}) {
  const styles: Record<BtnKind, { background: string; color: string; border: string }> = {
    primary: { background: C.ink, color: "#fff", border: `1px solid ${C.ink}` },
    teal: { background: C.teal, color: "#fff", border: `1px solid ${C.teal}` },
    ghost: { background: "#fff", color: C.text, border: `1px solid ${C.line}` },
    danger: { background: "#fff", color: C.rose, border: `1px solid ${C.roseSoft}` },
    blue: { background: C.international, color: "#fff", border: `1px solid ${C.international}` }
  };
  const style = styles[kind];
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex items-center justify-center gap-1.5 font-semibold transition-opacity"
      style={{ ...style, borderRadius: 10, padding: sm ? "6px 11px" : "9px 15px", fontSize: sm ? 12.5 : 13.5, opacity: disabled ? 0.45 : 1, cursor: disabled ? "default" : "pointer" }}>
      {icon}{children}
    </button>
  );
}
export function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <label className="block">
      <span className="block font-semibold mb-1" style={{ fontSize: 11.5, color: C.sub, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

export function Bar({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const w = max ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 13, color: C.text }}>{label}</span>
        <span className="font-semibold" style={{ fontSize: 13, color: C.text }}>{value}{suffix || ""}</span>
      </div>
      <div style={{ height: 9, background: C.paper, borderRadius: 999 }}>
        <div style={{ width: w + "%", height: "100%", background: color, borderRadius: 999, transition: "width .5s" }} />
      </div>
    </div>
  );
}

/* board metric tile (signature "status board") */
export function BoardTile({ label, value, accent, sub }: { label: string; value: ReactNode; accent?: string; sub?: ReactNode }) {
  return (
    <div className="flex-1" style={{ minWidth: 130, padding: "14px 16px", borderLeft: `1px solid rgba(255,255,255,0.08)` }}>
      <div style={{ fontSize: 11, letterSpacing: 1.2, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <span style={{ fontSize: 30, fontWeight: 700, color: accent || "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{sub}</span>}
      </div>
    </div>
  );
}

export function Stat({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || C.text }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.sub, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

export function MiniStat({ icon, label, value, sub, color }: { icon?: ReactNode; label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div style={{ background: C.paper, borderRadius: 11, padding: "10px 12px" }}>
      <div className="flex items-center gap-1.5" style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>{icon}{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span style={{ fontSize: 18, fontWeight: 700, color: color || C.text }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: C.sub }}>{sub}</span>}
      </div>
    </div>
  );
}

export function StatusSelect({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  const m = STATUS_META[value] || STATUS_META.pending;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Status)}
      style={{ appearance: "none", border: `1px solid ${m.soft}`, background: m.soft, color: m.c, fontWeight: 700, fontSize: 12, padding: "5px 10px", borderRadius: 999, cursor: "pointer", outline: "none" }}>
      {STATUSES.map((s) => <option key={s} value={s} style={{ color: C.text, background: "#fff" }}>{STATUS_META[s].txt}</option>)}
    </select>
  );
}

export function PrioritySelect({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) {
  const m = PRIORITY_META[value] || PRIORITY_META.medium;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Priority)}
      style={{ appearance: "none", border: `1px solid ${m.soft}`, background: m.soft, color: m.c, fontWeight: 700, fontSize: 12, padding: "5px 10px", borderRadius: 999, cursor: "pointer", outline: "none" }}>
      {PRIORITIES.map((p) => <option key={p} value={p} style={{ color: C.text, background: "#fff" }}>{PRIORITY_META[p].txt}</option>)}
    </select>
  );
}

export function AssigneeSelect({ value, agents, onChange }: { value: string | null; agents: Agent[]; onChange: (id: string) => void }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
      style={{ border: `1px solid ${C.line}`, background: "#fff", color: C.text, fontWeight: 600, fontSize: 12.5, padding: "5px 8px", borderRadius: 8, cursor: "pointer", outline: "none" }}>
      {(["Domestic", "International"] as Team[]).map((team) => (
        <optgroup key={team} label={team}>
          {agents.filter((a) => a.team === team).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export function ProgressBar({ value, height = 7 }: { value: number; height?: number }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const c = v >= 100 ? C.teal : v >= 50 ? C.amber : C.international;
  return (
    <div style={{ flex: 1, height, background: C.paper, borderRadius: 999, minWidth: 60 }}>
      <div style={{ width: v + "%", height: "100%", background: c, borderRadius: 999, transition: "width .4s" }} />
    </div>
  );
}

export function EditableText({ value, onSave, placeholder }: { value: string | null | undefined; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value || "");
  useEffect(() => { setV(value || ""); }, [value]);
  return (
    <textarea value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== (value || "")) onSave(v); }}
      placeholder={placeholder} rows={2}
      style={{ width: "100%", minWidth: 150, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 8px", fontSize: 12.5, color: C.text, background: "#fff", resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.4 }} />
  );
}

export function EditableArea({ value, onSave, placeholder, rows = 2, disabled }: {
  value: string | null | undefined; onSave: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean;
}) {
  const [v, setV] = useState(value || "");
  useEffect(() => { setV(value || ""); }, [value]);
  return (
    <textarea disabled={disabled} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (!disabled && v !== (value || "")) onSave(v); }}
      placeholder={placeholder} rows={rows}
      style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, color: C.text, background: disabled ? C.paper : "#fff", resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
  );
}

export function DetailSection({ icon, title, children, right }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "14px 0" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: 13 }}>{icon}{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function RBox({ label, value, c, sub }: { label: string; value: ReactNode; c?: string; sub?: ReactNode }) {
  return (
    <div style={{ ...card, padding: "12px 14px" }}>
      <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontSize: 22, fontWeight: 700, color: c || C.text, lineHeight: 1.2 }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: C.sub }}>{sub}</span>}
      </div>
    </div>
  );
}
export function ChartCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={{ ...card, padding: 15 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export function MiniBars({ items, barH = 110 }: { items: ChartItem[]; barH?: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div style={{ fontSize: 12.5, color: C.sub }}>No data for this period.</div>;
  return (
    <div className="flex items-end gap-2">
      {items.map((it, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginBottom: 3 }}>{it.value}</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: barH }}>
            <div style={{ width: "68%", maxWidth: 38, height: Math.round((it.value / max) * barH), minHeight: it.value ? 4 : 1, background: it.color || C.international, borderRadius: 6 }} />
          </div>
          <div style={{ fontSize: 10.5, color: C.sub, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}
export function BarsH({ items, fmt }: { items: ChartItem[]; fmt?: (v: number) => ReactNode }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div style={{ fontSize: 12.5, color: C.sub }}>No data for this period.</div>;
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <div style={{ width: 104, fontSize: 12, color: C.sub, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
          <div style={{ flex: 1, height: 14, background: C.paper, borderRadius: 999 }}>
            <div style={{ width: `${(it.value / max) * 100}%`, height: "100%", background: it.color || C.international, borderRadius: 999, minWidth: it.value ? 6 : 0 }} />
          </div>
          <div style={{ width: 44, fontSize: 12, fontWeight: 600 }}>{fmt ? fmt(it.value) : it.value}</div>
        </div>
      ))}
    </div>
  );
}
