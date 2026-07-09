import { useState, useMemo } from "react";
import {
  ArrowLeft, Plus, Target, Package, Send, Gauge, ShieldCheck, AlertTriangle, Sparkles,
  Play, CheckCircle2, Trash2, Clock, CalendarCheck, MessageSquare, Link2, Paperclip, Flag, FileText,
  MapPin, Globe
} from "lucide-react";
import { C, card, catC, teamColor, inputStyle } from "../lib/theme";
import { PRIORITIES, PRIORITY_META, STATUS_META, STATUS_ORDER, DEAD, DONEISH, H } from "../lib/constants";
import { agentStats, speedLabel, pct, actualHrs, speedRatio, dueMeta, fmtDay, fromDateInput, flattenRecords } from "../lib/helpers";
import { Avatar, Chip, Btn, Field, MiniStat, ProgressBar, StatusSelect } from "./ui";
import type { Agent, AppData, TaskRecord, Status, Priority, ColKey, Category } from "../lib/types";

export interface CompletePayload {
  hours: number;
  itemsTotal: number;
  itemsError: number;
  publish: boolean;
}

interface MemberDetailProps {
  agent: Agent;
  data: AppData;
  onBack?: () => void;
  addRec?: (col: ColKey, r: Partial<TaskRecord>) => void;
  completeRec: (col: ColKey, id: string, payload: CompletePayload) => void;
  deleteRec?: (col: ColKey, id: string) => void;
  setRecStatus: (col: ColKey, id: string, status: Status) => void;
  openDetail: (col: ColKey, id: string) => void;
  isAdmin: boolean;
  selfView?: boolean;
}

/* ---------------- Member detail (admin + agent self) ----------------
   "My work" = the agent's regular tasks plus their daily tasks — both are
   just TaskRecords, distinguished by _col (stamped by flattenRecords), so
   each row's actions route back to its own collection ("tasks" or "daily").
   PREMIUM/GLADEX/Tariff stay out of this view — they have their own tabs. */
export function MemberDetail({ agent, data, onBack, addRec, completeRec, deleteRec, setRecStatus, openDetail, isAdmin, selfView }: MemberDetailProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // task id
  const pool = useMemo(() => flattenRecords(data).filter((r) => r._col === "tasks" || r._col === "daily"), [data]);
  const s = useMemo(() => agentStats(agent, pool), [pool, agent]);
  const sp = speedLabel(s.avgSpeed);
  const tasks = pool.filter((t) => t.agentId === agent.id);
  const special = tasks.filter((t) => t.special && !DEAD(t.status));
  const sorted = [...tasks].sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || ((a.dueDate || Infinity) - (b.dueDate || Infinity)));

  return (
    <div>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 font-semibold mb-3" style={{ fontSize: 13, color: C.sub }}>
          <ArrowLeft size={15} /> Team {agent.team}
        </button>
      )}
      {/* header */}
      <div style={{ ...card, padding: 16, marginBottom: 14 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={agent.name} team={agent.team} size={48} />
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700, fontSize: 19 }}>{selfView ? `Hi, ${agent.name}` : agent.name}</span>
                <Chip color={teamColor(agent.team)} soft={agent.team === "Domestic" ? "#FBEAE4" : "#E7EDFB"} icon={agent.team === "Domestic" ? <MapPin size={11} /> : <Globe size={11} />}>{agent.team}</Chip>
              </div>
              <div style={{ fontSize: 12.5, color: C.sub }}>@{agent.username}</div>
            </div>
          </div>
          {isAdmin && <Btn onClick={() => setShowAdd((v) => !v)} kind="teal" sm icon={<Plus size={15} />}>Assign task</Btn>}
        </div>
        <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(95px,1fr))" }}>
          <MiniStat icon={<Target size={15} />} label="Productivity" value={pct(s.productivity)} />
          <MiniStat icon={<Package size={15} />} label="Made" value={s.completed.length} />
          <MiniStat icon={<Send size={15} />} label="Published" value={s.published.length} color={C.teal} />
          <MiniStat icon={<Gauge size={15} />} label="Speed" value={sp.txt} sub={s.avgSpeed ? s.avgSpeed.toFixed(2) + "×" : ""} color={sp.c} />
          <MiniStat icon={<ShieldCheck size={15} />} label="Accuracy" value={pct(s.accuracy)} color={C.teal} />
          <MiniStat icon={<AlertTriangle size={15} />} label="Error rate" value={pct(s.errorRate)} color={(s.errorRate ?? 0) > 5 ? C.rose : C.sub} />
        </div>
      </div>

      {isAdmin && showAdd && <AddTaskForm agent={agent} categories={data.categories} onAdd={(t) => { addRec?.("tasks", { ...t, agentId: agent.id }); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />}

      {special.length > 0 && (
        <div style={{ ...card, padding: 14, marginBottom: 14, borderColor: C.gold, background: "#FFFBEF" }}>
          <div className="flex items-center gap-2 mb-2"><Sparkles size={16} color={C.amber} /><span style={{ fontWeight: 700, fontSize: 14 }}>Special tasks</span></div>
          {special.map((t) => (
            <div key={t.id} style={{ fontSize: 13, padding: "4px 0" }}>• <b>{t.title}</b> <span style={{ color: C.sub }}>— {t.target}</span></div>
          ))}
        </div>
      )}

      {/* task list */}
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontWeight: 700, fontSize: 15 }}>Tasking & targets</span>
        <span style={{ fontSize: 12.5, color: C.sub }}>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-2.5">
        {sorted.length === 0 && <div style={{ ...card, padding: 18, color: C.sub, fontSize: 13.5 }}>No tasks assigned yet.</div>}
        {sorted.map((t) => {
          const col = t._col || "tasks";
          return (
            <TaskRow key={t.id} t={t} isAdmin={isAdmin} selfView={selfView} categories={data.categories}
              setStatus={(id, st) => setRecStatus(col, id, st)} openDetail={(id) => openDetail(col, id)}
              onStart={() => setRecStatus(col, t.id, "in_progress")} onDelete={isAdmin && deleteRec ? () => deleteRec(col, t.id) : null}
              onEdit={() => setEditing(editing === t.id ? null : t.id)} editing={editing === t.id}
              onComplete={(payload) => { completeRec(col, t.id, payload); setEditing(null); }} />
          );
        })}
      </div>
    </div>
  );
}

interface TaskRowProps {
  t: TaskRecord;
  isAdmin: boolean;
  selfView?: boolean;
  categories: Category[];
  onStart: () => void;
  onDelete: (() => void) | null;
  onEdit: () => void;
  editing: boolean;
  onComplete: (payload: CompletePayload) => void;
  setStatus: (id: string, status: Status) => void;
  openDetail: (id: string) => void;
}

/* ---------------- Task row ---------------- */
function TaskRow({ t, isAdmin, selfView, categories, onStart, onDelete, onEdit, editing, onComplete, setStatus, openDetail }: TaskRowProps) {
  const sp = speedLabel(speedRatio(t));
  const acc = t.itemsTotal ? (1 - (t.itemsError ?? 0) / t.itemsTotal) * 100 : null;
  const canAct = isAdmin || selfView;
  const dm = dueMeta(t);
  const pm = PRIORITY_META[t.priority || "medium"];
  return (
    <div style={{ ...card, padding: 13, opacity: DEAD(t.status) ? 0.65 : 1 }}>
      <div className="flex items-start justify-between gap-3">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ width: 9, height: 9, borderRadius: 3, background: catC(t.category, categories), flexShrink: 0 }} />
            <button onClick={() => openDetail && openDetail(t.id)} style={{ fontWeight: 600, fontSize: 14, textDecoration: t.status === "removed" ? "line-through" : "none", background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left" }}>{t.title}</button>
            <Chip color={pm.c} soft={pm.soft} icon={<Flag size={10} />}>{pm.txt}</Chip>
            {t.special && <Chip color={C.amber} soft={C.amberSoft} icon={<Sparkles size={11} />}>Special</Chip>}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-1.5" style={{ fontSize: 12, color: C.sub }}>
            <span style={{ color: catC(t.category, categories), fontWeight: 600 }}>{t.category}</span>
            {t.target && <span className="flex items-center gap-1"><Target size={12} /> {t.target}</span>}
            {t.dueDate && <span className="flex items-center gap-1" style={{ color: dm && dm.over ? C.rose : C.sub, fontWeight: dm && dm.over ? 600 : 400 }}><Clock size={12} /> due {fmtDay(t.dueDate)}{dm && dm.label ? ` · ${dm.label}` : ""}</span>}
            {DONEISH(t.status) && t.completedAt && <span className="flex items-center gap-1" style={{ color: C.teal }}><CalendarCheck size={12} /> done {fmtDay(t.completedAt)}</span>}
            {sp.txt !== "—" && <span style={{ color: sp.c, fontWeight: 600 }}>{sp.txt} ({speedRatio(t)?.toFixed(2)}×)</span>}
            {acc != null && <span style={{ color: acc >= 95 ? C.teal : acc >= 85 ? C.amber : C.rose, fontWeight: 600 }}>{Math.round(acc)}% accuracy</span>}
          </div>
          <div className="flex items-center gap-2 mt-2" style={{ maxWidth: 320 }}>
            <ProgressBar value={t.progress || 0} />
            <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 600, minWidth: 32 }}>{t.progress || 0}%</span>
          </div>
          {(t.requirements || t.remarks) && (
            <div className="mt-2" style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
              {t.requirements && <div><b style={{ color: C.text }}>Requirements:</b> {t.requirements}</div>}
              {t.remarks && <div><b style={{ color: C.text }}>Remarks:</b> {t.remarks}</div>}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2" style={{ fontSize: 11.5, color: C.sub }}>
            {(t.comments && t.comments.length > 0) && <span className="flex items-center gap-1"><MessageSquare size={12} /> {t.comments.length}</span>}
            {(t.links && t.links.length > 0) && <span className="flex items-center gap-1"><Link2 size={12} /> {t.links.length}</span>}
            {(t.proofCount ?? 0) > 0 && <span className="flex items-center gap-1"><Paperclip size={12} /> {t.proofCount}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2" style={{ flexShrink: 0 }}>
          {canAct && setStatus ? <StatusSelect value={t.status} onChange={(st) => setStatus(t.id, st)} /> : <Chip color={STATUS_META[t.status].c} soft={STATUS_META[t.status].soft}>{STATUS_META[t.status].txt}</Chip>}
          {onDelete && <button onClick={onDelete} title="Delete permanently" style={{ color: C.rose, opacity: 0.7, background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={15} /></button>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mt-3" style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
        <Btn onClick={() => openDetail && openDetail(t.id)} kind="ghost" sm icon={<FileText size={13} />}>Details</Btn>
        {canAct && !DEAD(t.status) && t.status !== "published" && (
          <>
            {t.status === "pending" && <Btn onClick={onStart} kind="ghost" sm icon={<Play size={13} />}>Start</Btn>}
            <Btn onClick={onEdit} kind={t.status === "completed" ? "teal" : "ghost"} sm icon={<CheckCircle2 size={13} />}>
              {t.status === "completed" ? "Publish / edit" : "Record completion"}
            </Btn>
          </>
        )}
      </div>
      {editing && <CompleteForm t={t} onSubmit={onComplete} onCancel={onEdit} />}
    </div>
  );
}

function CompleteForm({ t, onSubmit, onCancel }: { t: TaskRecord; onSubmit: (payload: CompletePayload) => void; onCancel: () => void }) {
  const startHrs = t.startedAt ? Math.max(((Date.now() - t.startedAt) / H), 0.1).toFixed(1) : String(t.estimatedHours);
  const [hours, setHours] = useState(actualHrs(t)?.toFixed(1) || startHrs);
  const [total, setTotal] = useState(String(t.itemsTotal || ""));
  const [err, setErr] = useState(String(t.itemsError || 0));
  return (
    <div style={{ background: C.paper, borderRadius: 11, padding: 12, marginTop: 10 }}>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
        <Field label="Time spent (hrs)"><input type="number" step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} style={inputStyle} /></Field>
        <Field label="Items / output count"><input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 10" style={inputStyle} /></Field>
        <Field label="Errors (count)"><input type="number" value={err} onChange={(e) => setErr(e.target.value)} style={inputStyle} /></Field>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <Btn sm kind="ghost" onClick={() => onSubmit({ hours: parseFloat(hours) || 0.1, itemsTotal: parseInt(total) || 0, itemsError: parseInt(err) || 0, publish: false })} icon={<CheckCircle2 size={13} />}>Mark completed</Btn>
        <Btn sm kind="teal" onClick={() => onSubmit({ hours: parseFloat(hours) || 0.1, itemsTotal: parseInt(total) || 0, itemsError: parseInt(err) || 0, publish: true })} icon={<Send size={13} />}>Publish</Btn>
        <Btn sm kind="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function AddTaskForm({ agent, categories, onAdd, onCancel }: { agent: Agent; categories: Category[]; onAdd: (t: Partial<TaskRecord>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]?.name || "");
  const [target, setTarget] = useState("");
  const [est, setEst] = useState("4");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [requirements, setRequirements] = useState("");
  const [remarks, setRemarks] = useState("");
  const [description, setDescription] = useState("");
  const [special, setSpecial] = useState(false);
  const valid = title.trim().length > 1;
  return (
    <div style={{ ...card, padding: 16, marginBottom: 14, borderColor: C.teal }}>
      <div className="flex items-center gap-2 mb-3"><Plus size={16} color={C.teal} /><span style={{ fontWeight: 700, fontSize: 14 }}>Assign a task to {agent.name}</span></div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <div style={{ gridColumn: "1 / -1" }}><Field label="Task title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lakbayhub tour listing" style={inputStyle} /></Field></div>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            {categories.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={inputStyle}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].txt}</option>)}
          </select>
        </Field>
        <Field label="Target"><input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 8 packages" style={inputStyle} /></Field>
        <Field label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} /></Field>
        <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} /></Field>
        <Field label="Target time (hrs)"><input type="number" step="0.5" value={est} onChange={(e) => setEst(e.target.value)} style={inputStyle} /></Field>
      </div>
      <div className="mt-3"><Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What needs to be done, scope, context…" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} /></Field></div>
      <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <Field label="Requirements"><input value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="e.g. assets, copy, supplier rates" style={inputStyle} /></Field>
        <Field label="Remarks"><input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. priority, notes" style={inputStyle} /></Field>
      </div>
      <label className="flex items-center gap-2 mt-3" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} />
        <span className="flex items-center gap-1" style={{ fontSize: 13 }}><Sparkles size={14} color={C.amber} /> Mark as special task</span>
      </label>
      <div className="flex gap-2 mt-3">
        <Btn kind="teal" sm disabled={!valid} onClick={() => onAdd({ title: title.trim(), category, target, priority, description, estimatedHours: parseFloat(est) || 4, startDate: fromDateInput(startDate), dueDate: fromDateInput(dueDate), requirements, remarks, special, status: "pending" })}>Assign task</Btn>
        <Btn kind="ghost" sm onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}
