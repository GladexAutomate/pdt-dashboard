import { useState } from "react";
import { Plus, Search, MapPin } from "lucide-react";
import { C, card, cellStyle, dateInputStyle, catC, teamColor, inputStyle } from "../lib/theme";
import { DEPARTMENTS, DESTINATIONS, PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, STATUS_ORDER, DONEISH, DEAD, COL_LABEL } from "../lib/constants";
import { dueMeta, toDateInput, fromDateInput, fmtDay, relTime } from "../lib/helpers";
import { Chip, Btn, Field, AssigneeSelect, PrioritySelect, StatusSelect, ProgressBar } from "./ui";
import type { ColKey, TrackerConfig, AppData, Agent, TaskRecord, Status, Category } from "../lib/types";

/* ---------------- Project / file trackers ---------------- */
export function TrackerSummary({ records }: { records: TaskRecord[] }) {
  const active = records.filter((r) => !DONEISH(r.status) && !DEAD(r.status)).length;
  const completed = records.filter((r) => DONEISH(r.status)).length;
  const pending = records.filter((r) => r.status === "pending").length;
  const overdue = records.filter((r) => { const d = dueMeta(r); return d && d.over; }).length;
  const high = records.filter((r) => r.priority === "high" && !DONEISH(r.status) && !DEAD(r.status)).length;
  const tiles = [
    { label: "Active", value: active, c: C.international },
    { label: "Completed", value: completed, c: C.teal },
    { label: "Pending", value: pending, c: C.sub },
    { label: "Overdue", value: overdue, c: C.rose },
    { label: "High priority", value: high, c: C.amber }
  ];
  return (
    <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
      {tiles.map((t) => (
        <div key={t.label} style={{ ...card, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{t.label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.c, lineHeight: 1.1, marginTop: 2 }}>{t.value}</div>
        </div>
      ))}
    </div>
  );
}

interface TrackerViewProps {
  col: ColKey;
  config: TrackerConfig;
  data: AppData;
  isAdmin: boolean;
  meId?: string;
  addRec: (col: ColKey, r: Partial<TaskRecord>) => void;
  updateRec: (col: ColKey, id: string, patch: Partial<TaskRecord>) => void;
  setRecStatus: (col: ColKey, id: string, status: Status) => void;
  reassignRec: (col: ColKey, id: string, agentId: string) => void;
  deleteRec?: (col: ColKey, id: string) => void;
  openDetail: (id: string) => void;
}

export function TrackerView({ col, config, data, isAdmin, meId, addRec, updateRec, setRecStatus, reassignRec, openDetail }: TrackerViewProps) {
  const [search, setSearch] = useState("");
  const [fTeam, setFTeam] = useState("all");
  const [fStaff, setFStaff] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fDest, setFDest] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const records = data[col] || [];
  const agentName = (id: string | null | undefined) => data.agents.find((a) => a.id === id)?.name || "Unassigned";
  const dests = [...new Set(records.map((r) => r.destination).filter(Boolean))];
  const canEditRow = (r: TaskRecord) => isAdmin || r.agentId === meId;

  const q = search.trim().toLowerCase();
  const filtered = records.filter((r) => {
    if (fTeam !== "all" && r.team !== fTeam) return false;
    if (fStaff !== "all" && r.agentId !== fStaff) return false;
    if (fPriority !== "all" && (r.priority || "medium") !== fPriority) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fDest !== "all" && r.destination !== fDest) return false;
    if (q) {
      const hay = [r.title, r.category, r.department, r.destination, agentName(r.agentId), r.remarks, r.description].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || ((a.dueDate || Infinity) - (b.dueDate || Infinity)));
  const selStyle = { border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 12.5, color: C.text, outline: "none", fontWeight: 600, cursor: "pointer" };

  const cell = (key: string, r: TaskRecord) => {
    const ce = canEditRow(r);
    const dm = dueMeta(r);
    switch (key) {
      case "title": return (
        <div className="flex items-start gap-2" style={{ minWidth: 180 }}>
          <span style={{ marginTop: 4, width: 9, height: 9, borderRadius: 3, background: catC(r.category || r.department, data.categories), flexShrink: 0 }} />
          <button onClick={() => openDetail(r.id)} style={{ fontWeight: 600, fontSize: 13, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left", textDecoration: r.status === "removed" ? "line-through" : "none" }}>{r.title}</button>
        </div>
      );
      case "category": return r.category ? <span style={{ fontSize: 12, color: catC(r.category, data.categories), fontWeight: 600 }}>{r.category}</span> : <span style={{ color: C.sub }}>—</span>;
      case "department": return <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.department || "—"}</span>;
      case "destination": return r.destination ? <Chip color={C.international} soft="#E7EDFB" icon={<MapPin size={10} />}>{r.destination}</Chip> : <span style={{ color: C.sub }}>—</span>;
      case "assignee": return ce ? <AssigneeSelect value={r.agentId} agents={data.agents} onChange={(nid) => reassignRec(col, r.id, nid)} /> : <span style={{ fontSize: 12.5, fontWeight: 600 }}>{agentName(r.agentId)}</span>;
      case "team": return <span style={{ fontSize: 12.5, color: teamColor(r.team), fontWeight: 600 }}>{r.team || "—"}</span>;
      case "priority": return ce ? <PrioritySelect value={r.priority || "medium"} onChange={(p) => updateRec(col, r.id, { priority: p })} /> : <Chip color={PRIORITY_META[r.priority || "medium"].c} soft={PRIORITY_META[r.priority || "medium"].soft}>{PRIORITY_META[r.priority || "medium"].txt}</Chip>;
      case "status": return ce ? <StatusSelect value={r.status} onChange={(s) => setRecStatus(col, r.id, s)} /> : <Chip color={STATUS_META[r.status].c} soft={STATUS_META[r.status].soft}>{STATUS_META[r.status].txt}</Chip>;
      case "progress": return <div className="flex items-center gap-2" style={{ minWidth: 110 }}><ProgressBar value={r.progress || 0} /><span style={{ fontSize: 11.5, color: C.sub, fontWeight: 600 }}>{r.progress || 0}%</span></div>;
      case "start": return ce ? <input type="date" value={toDateInput(r.startDate)} onChange={(e) => updateRec(col, r.id, { startDate: fromDateInput(e.target.value) })} style={dateInputStyle} /> : <span style={{ fontSize: 12.5 }}>{fmtDay(r.startDate)}</span>;
      case "due": return (
        <div>
          {ce ? <input type="date" value={toDateInput(r.dueDate)} onChange={(e) => updateRec(col, r.id, { dueDate: fromDateInput(e.target.value) })} style={dateInputStyle} /> : <span style={{ fontSize: 12.5 }}>{fmtDay(r.dueDate)}</span>}
          {dm && dm.label && <div style={{ fontSize: 11, color: dm.c, fontWeight: 600, marginTop: 3 }}>{dm.label}</div>}
        </div>
      );
      case "updated": return <div style={{ fontSize: 11.5, color: C.sub }}>{relTime(r.updatedAt)}<div style={{ fontSize: 11 }}>{r.updatedBy && r.updatedBy !== "—" ? `by ${r.updatedBy}` : ""}</div></div>;
      default: return null;
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{config.label}</h2>
          <div style={{ fontSize: 12.5, color: C.sub }}>{config.sub}</div>
        </div>
        <Btn kind="teal" sm icon={<Plus size={15} />} onClick={() => setShowAdd((v) => !v)}>New {col === "tariff" ? "tariff file" : "project"}</Btn>
      </div>

      <TrackerSummary records={records} />

      {showAdd && <AddRecordForm col={col} config={config} agents={data.agents} categories={data.categories} meId={meId} isAdmin={isAdmin}
        onAdd={(r) => { addRec(col, r); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />}

      {/* search + filters */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-1.5" style={{ ...selStyle, padding: "5px 9px", flex: "1 1 200px", maxWidth: 280 }}>
          <Search size={14} color={C.sub} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", background: "transparent", color: C.text }} />
        </div>
        <select value={fTeam} onChange={(e) => setFTeam(e.target.value)} style={selStyle}><option value="all">All teams</option><option>Domestic</option><option>International</option></select>
        <select value={fStaff} onChange={(e) => setFStaff(e.target.value)} style={selStyle}><option value="all">All staff</option>{data.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} style={selStyle}><option value="all">All priorities</option>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].txt}</option>)}</select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={selStyle}><option value="all">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].txt}</option>)}</select>
        {dests.length > 0 && <select value={fDest} onChange={(e) => setFDest(e.target.value)} style={selStyle}><option value="all">All destinations</option>{dests.map((d) => <option key={d} value={d}>{d}</option>)}</select>}
        <span style={{ fontSize: 12, color: C.sub, marginLeft: "auto" }}>{sorted.length} of {records.length}</span>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 60 + config.columns.length * 120 }}>
            <thead>
              <tr style={{ background: C.paper }}>
                {config.columns.map((k) => (
                  <th key={k} style={{ textAlign: "left", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: C.sub, fontWeight: 700, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>
                    {k === "title" ? config.titleLabel : COL_LABEL[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={config.columns.length} style={{ padding: 18, color: C.sub, fontSize: 13 }}>No records match these filters.</td></tr>}
              {sorted.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.line}`, opacity: DEAD(r.status) ? 0.6 : 1 }}>
                  {config.columns.map((k) => <td key={k} style={cellStyle}>{cell(k, r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface AddRecordFormState {
  title: string;
  category: string;
  department: string;
  destination: string;
  priority: string;
  agentId: string;
  start: string;
  due: string;
  description: string;
}

function AddRecordForm({ config, agents, categories, meId, onAdd, onCancel }: {
  col: ColKey; config: TrackerConfig; agents: Agent[]; categories: Category[]; meId?: string; isAdmin: boolean;
  onAdd: (r: Partial<TaskRecord>) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<AddRecordFormState>({
    title: "", category: categories[0]?.name || "", department: DEPARTMENTS[0], destination: DESTINATIONS[0],
    priority: "medium", agentId: meId || agents[0].id, start: "", due: "", description: ""
  });
  const set = (k: keyof AddRecordFormState, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.title.trim().length > 1;
  const team = agents.find((a) => a.id === f.agentId)?.team || "";
  const has = (k: string) => config.addFields.includes(k);
  const submit = () => {
    const r: Partial<TaskRecord> = {
      title: f.title.trim(), priority: f.priority as TaskRecord["priority"], agentId: f.agentId, team,
      startDate: fromDateInput(f.start), dueDate: fromDateInput(f.due), description: f.description, status: "pending"
    };
    if (has("category")) r.category = f.category;
    if (has("department")) r.department = f.department;
    if (has("destination")) r.destination = f.destination;
    onAdd(r);
  };
  return (
    <div style={{ ...card, padding: 16, marginBottom: 14, borderColor: C.teal }}>
      <div className="flex items-center gap-2 mb-3"><Plus size={16} color={C.teal} /><span style={{ fontWeight: 700, fontSize: 14 }}>New {config.label} record</span></div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
        <div style={{ gridColumn: "1 / -1" }}><Field label={config.titleLabel}><input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={config.titleLabel} style={inputStyle} /></Field></div>
        {has("category") && <Field label="Category"><select value={f.category} onChange={(e) => set("category", e.target.value)} style={inputStyle}>{categories.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>}
        {has("department") && <Field label="Department"><select value={f.department} onChange={(e) => set("department", e.target.value)} style={inputStyle}>{DEPARTMENTS.map((c) => <option key={c}>{c}</option>)}</select></Field>}
        {has("destination") && <Field label="Destination"><select value={f.destination} onChange={(e) => set("destination", e.target.value)} style={inputStyle}>{DESTINATIONS.map((c) => <option key={c}>{c}</option>)}</select></Field>}
        {has("priority") && <Field label="Priority"><select value={f.priority} onChange={(e) => set("priority", e.target.value)} style={inputStyle}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].txt}</option>)}</select></Field>}
        {has("assignee") && <Field label="Assigned to"><select value={f.agentId} onChange={(e) => set("agentId", e.target.value)} style={inputStyle}>{["Domestic", "International"].map((tm) => <optgroup key={tm} label={tm}>{agents.filter((a) => a.team === tm).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>)}</select></Field>}
        {has("start") && <Field label="Start date"><input type="date" value={f.start} onChange={(e) => set("start", e.target.value)} style={inputStyle} /></Field>}
        {has("due") && <Field label="Due date"><input type="date" value={f.due} onChange={(e) => set("due", e.target.value)} style={inputStyle} /></Field>}
      </div>
      {has("description") && <div className="mt-3"><Field label="Task description"><textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Details, scope, context…" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} /></Field></div>}
      <div className="flex gap-2 mt-3">
        <Btn kind="teal" sm disabled={!valid} onClick={submit}>Add record</Btn>
        <Btn kind="ghost" sm onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}
