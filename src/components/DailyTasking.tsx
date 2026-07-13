import { useState, useEffect, useRef } from "react";
import {
  CalendarCheck, Plus, Users, MapPin, Globe, Play, Pause, CheckCircle2, Send, Trash2, Clock, Activity, FileText, Flag, Download, ChevronDown, ChevronUp
} from "lucide-react";
import { C, card, catC, teamColor, inputStyle } from "../lib/theme";
import { PRIORITIES, PRIORITY_META, STATUS_META, DONEISH, DEAD } from "../lib/constants";
import { toDateInput, fromDateInput, downloadCSV, dueMeta, fmtDay, flattenRecords } from "../lib/helpers";
import { claimCongrats } from "../lib/api";
import { Avatar, Chip, Btn, Field } from "./ui";
import { CongratsModal } from "./Congrats";
import type { AppData, Agent, TaskRecord, Status, Priority, ColKey, Team, Category } from "../lib/types";
import { todayKey, fmtDayLabel, fmtClock, buildDayTimeline, eodOf, fmtHours } from "../lib/daily";

const COL: ColKey = "daily";
const CONGRATS_HOURS = 8;

interface DailyTaskingProps {
  data: AppData;
  isAdmin: boolean;
  meId?: string;
  addRec: (col: ColKey, r: Partial<TaskRecord>) => void;
  setRecStatus: (col: ColKey, id: string, status: Status) => void;
  deleteRec: (col: ColKey, id: string) => void;
  openDetail: (id: string, col?: ColKey) => void;
}

/* ---------------- Daily Tasking (admin: everyone · agent: own only) ----------------
   Daily tasks are ordinary TaskRecords with collection "daily" — same shape
   (title/category/priority/status/etc.) as regular tasks, so they open in the
   same TaskDetail drawer and count toward KPI/productivity like everything
   else. This view just adds the day-by-day grouping + EOD report on top. */
export function DailyTasking({ data, isAdmin, meId, addRec, setRecStatus, deleteRec, openDetail }: DailyTaskingProps) {
  const [date, setDate] = useState(todayKey());
  const [tab, setTab] = useState<"today" | "pending">("today");
  const [staffF, setStaffF] = useState("all");
  const [showAssign, setShowAssign] = useState(false);
  const [showTeamReport, setShowTeamReport] = useState(false);

  const scope = isAdmin ? data.agents : data.agents.filter((a) => a.id === meId);
  const shown = isAdmin && staffF !== "all" ? scope.filter((a) => a.id === staffF) : scope;
  // matches the same credit rule as agentStats/staffMonth: once a task is
  // done, it belongs only to whoever actually finished it (completedBy) —
  // collaborators only widen who sees/counts a task while it's still active,
  // so someone added as a collaborator after the fact (or who never touched
  // it before it got finished) doesn't inherit someone else's completed work
  // or hours on their own EOD.
  const dailyFor = (agent: Agent) => flattenRecords(data).filter((d) =>
    toDateInput(d.dueDate) === date && (
      DONEISH(d.status) && d.completedBy
        ? d.completedBy === agent.name
        : d.agentId === agent.id || (d.collaboratorIds || []).includes(agent.id)
    )
  );
  // "Pending" is a rollup, not scoped to one day — anything not finished
  // (from any day, past or future) stays here until it's done, so nothing
  // slips away just because the date picker moved on. A task created now
  // with a due date of tomorrow (and high priority) shows up here right
  // away and keeps floating near the top until it's dealt with.
  const prRank = (p?: Priority) => PRIORITIES.indexOf(p || "medium");
  const pendingFor = (agent: Agent) => flattenRecords(data)
    .filter((d) => !DONEISH(d.status) && !DEAD(d.status) && (d.agentId === agent.id || (d.collaboratorIds || []).includes(agent.id)))
    .sort((a, b) => prRank(a.priority) - prRank(b.priority) || (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity));
  const totalPending = shown.reduce((sum, a) => sum + pendingFor(a).length, 0);

  const exportReport = () => {
    const head = ["Staff", "Team", "Task", "Category", "Priority", "Status", "Completed At"];
    const rows = shown.flatMap((staff) => dailyFor(staff).map((t) => [
      staff.name, staff.team, t.title, t.category || "", PRIORITY_META[t.priority || "medium"].txt,
      STATUS_META[t.status].txt, t.completedAt ? fmtClock(t.completedAt) : ""
    ]));
    downloadCSV(`daily_eod_report_${date}.csv`, [["Daily Tasking — EOD Report"], ["Date", fmtDayLabel(date)], [], head, ...rows]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarCheck size={20} color={C.ink} />
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>Daily Tasking</h2>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{isAdmin ? "Monitor each staff member's day" : "Your daily workspace"} · {fmtDayLabel(date)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && <Btn sm kind="teal" icon={<Plus size={14} />} onClick={() => setShowAssign((v) => !v)}>Assign daily task</Btn>}
          {!isAdmin && meId && <Btn sm kind="teal" icon={<Plus size={14} />} onClick={() => setShowAssign((v) => !v)}>Add task</Btn>}
          {isAdmin && tab === "today" && <Btn sm kind="ghost" icon={<Users size={14} />} onClick={() => setShowTeamReport((v) => !v)}>Team daily report</Btn>}
          {isAdmin && tab === "today" && <Btn sm kind="ghost" icon={<Download size={14} />} onClick={exportReport}>Generate report</Btn>}
          {tab === "today" && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "7px 10px" }} />}
        </div>
      </div>

      <div className="flex" style={{ background: C.paper, borderRadius: 10, padding: 3, width: "fit-content" }}>
        {(["today", "pending"] as const).map((id) => (
          <button key={id} onClick={() => setTab(id)} className="flex items-center gap-1.5 font-semibold"
            style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 8, border: "none", background: tab === id ? "#fff" : "transparent", color: tab === id ? C.text : C.sub, boxShadow: tab === id ? "0 1px 2px rgba(0,0,0,0.06)" : "none", cursor: "pointer" }}>
            {id === "today" ? "Today" : `Pending${totalPending ? ` (${totalPending})` : ""}`}
          </button>
        ))}
      </div>

      {showAssign && (isAdmin || meId) && (
        <AssignDailyForm agents={data.agents.filter((a) => a.isActive)} categories={data.categories} date={date} fixedAgentId={isAdmin ? undefined : meId}
          onAssign={(r) => { addRec(COL, r); }}
          onClose={() => setShowAssign(false)} />
      )}

      {isAdmin && tab === "today" && showTeamReport && <TeamDailyReport data={data} date={date} />}

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap" style={{ ...card, padding: 12 }}>
          <span className="flex items-center gap-1.5 font-semibold" style={{ fontSize: 12.5, color: C.sub }}><Users size={14} /> Staff</span>
          <select value={staffF} onChange={(e) => setStaffF(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="all">All staff</option>
            {data.agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.team}</option>)}
          </select>
        </div>
      )}

      {tab === "today" ? (
        <>
          {shown.map((staff) => (
            <DailyStaffCard key={staff.id} staff={staff} tasks={dailyFor(staff)} date={date} categories={data.categories}
              canEdit={isAdmin || staff.id === meId} isAdmin={isAdmin} isSelf={!isAdmin && staff.id === meId}
              onStatus={(id, status, col) => setRecStatus(col, id, status)} onDelete={(id, col) => deleteRec(col, id)} onOpen={(id, col) => openDetail(id, col)} />
          ))}
        </>
      ) : (
        <>
          {shown.map((staff) => (
            <PendingStaffCard key={staff.id} staff={staff} tasks={pendingFor(staff)} categories={data.categories}
              canEdit={isAdmin || staff.id === meId} isAdmin={isAdmin}
              onStatus={(id, status, col) => setRecStatus(col, id, status)} onDelete={(id, col) => deleteRec(col, id)} onOpen={(id, col) => openDetail(id, col)} />
          ))}
        </>
      )}
      {shown.length === 0 && <div style={{ ...card, padding: 18, color: C.sub, fontSize: 13.5 }}>No staff to show.</div>}

      {!isAdmin && <div style={{ fontSize: 12, color: C.sub, textAlign: "center", paddingBottom: 4 }}>View is limited to your own tasks. You can add your own or wait for one assigned by the supervisor.</div>}
    </div>
  );
}

function AssignDailyForm({ agents, categories, date, fixedAgentId, onAssign, onClose }: {
  agents: Agent[]; categories: Category[]; date: string; fixedAgentId?: string; onAssign: (r: Partial<TaskRecord>) => void; onClose: () => void;
}) {
  const [agentId, setAgentId] = useState(fixedAgentId || agents[0]?.id || "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]?.name || "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState(date);
  const ok = !!agentId && title.trim().length > 1;

  const submit = () => {
    onAssign({ agentId, title: title.trim(), category, priority, startDate: fromDateInput(date), dueDate: fromDateInput(due) });
    setTitle("");
  };

  return (
    <div style={{ ...card, padding: 16, borderColor: C.teal }}>
      <div className="flex items-center gap-2 mb-1"><Plus size={16} color={C.teal} /><span style={{ fontWeight: 700, fontSize: 14 }}>{fixedAgentId ? "Add a daily task" : "Assign a daily task"} · {fmtDayLabel(date)}</span></div>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Due date defaults to today, but you can set it to tomorrow (e.g. an urgent task that comes in right at the end of a shift) — it'll show under "Pending" and be ready to work on when that day comes.</div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
        {!fixedAgentId && (
          <Field label="Staff member">
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={inputStyle}>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.team}</option>)}
            </select>
          </Field>
        )}
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
        <Field label="Due date"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Task"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vietnam Itinerary" style={inputStyle} /></Field>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Btn sm kind="teal" disabled={!ok} onClick={submit}>{fixedAgentId ? "Add task" : "Assign task"}</Btn>
        <Btn sm kind="ghost" onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
}

function DailyStaffCard({ staff, tasks, date, categories, canEdit, isAdmin, isSelf, onStatus, onDelete, onOpen }: {
  staff: Agent; tasks: TaskRecord[]; date: string; categories: Category[]; canEdit: boolean; isAdmin: boolean; isSelf?: boolean;
  onStatus: (id: string, status: Status, col: ColKey) => void; onDelete: (id: string, col: ColKey) => void; onOpen: (id: string, col: ColKey) => void;
}) {
  const [showEod, setShowEod] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const timeline = buildDayTimeline(tasks, date);
  const eod = eodOf(tasks, date);
  const doneCount = tasks.filter((t) => DONEISH(t.status)).length;

  // celebrate once per visit to this page — the moment today's logged hours
  // cross a full day's work, show it; reopening/reloading Daily Tasking
  // later that same day shows it again, since it's meant as a standing
  // "you've had a full day" moment rather than a one-and-done. Only for the
  // agent's own card, never while an admin is just browsing the roster.
  // Within one visit it still only fires once, even as hours keep climbing
  // (8h → 9h → 10h...) — shownThisVisit resets fresh on every new mount
  // (page reload, switching tabs away and back, re-login).
  const shownThisVisit = useRef(false);
  useEffect(() => {
    if (!isSelf || date !== todayKey() || (eod.hours ?? 0) < CONGRATS_HOURS || shownThisVisit.current) return;
    shownThisVisit.current = true;
    setShowCongrats(true);
    // best-effort record of the achievement — no longer used to gate whether
    // the popup shows, just kept for a future "who hit 8h today" report.
    claimCongrats(staff.id, date).catch((e) => console.error("Failed to log congrats", e));
  }, [isSelf, date, eod.hours, staff.id]);

  return (
    <div style={{ ...card, overflow: "hidden" }}>
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2.5">
          <Avatar name={staff.name} team={staff.team} size={38} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{staff.name}</div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: C.sub }}>{staff.team === "Domestic" ? <MapPin size={11} /> : <Globe size={11} />}{staff.team} Team</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip color={C.sub} soft={C.paper}>{tasks.length} tasks</Chip>
          <Chip color={C.teal} soft={C.tealSoft}>{doneCount} done</Chip>
          <Btn sm kind="ghost" icon={<FileText size={13} />} onClick={() => setShowEod((v) => !v)}>EOD report</Btn>
        </div>
      </div>

      {/* tasks */}
      <div style={{ padding: "10px 14px" }}>
        {tasks.length === 0 && <div style={{ fontSize: 13, color: C.sub, padding: "6px 0" }}>No daily tasks for this date.</div>}
        <div className="space-y-2">
          {tasks.map((t) => (
            <DailyTaskRow key={t.id} t={t} categories={categories} canEdit={canEdit} isAdmin={isAdmin} onStatus={onStatus} onDelete={onDelete} onOpen={onOpen} />
          ))}
        </div>
      </div>

      {/* timeline — collapsed by default, since every status hop for every
          task adds up fast and mostly just repeats what the chips above
          already show */}
      {timeline.length > 0 && (
        <div style={{ padding: "4px 14px 12px" }}>
          <button onClick={() => setShowTimeline((v) => !v)} className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            <Activity size={13} /> Daily timeline ({timeline.length}) {showTimeline ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showTimeline && (
            <div style={{ borderLeft: `2px solid ${C.line}`, paddingLeft: 12 }}>
              {timeline.map((e, i) => (
                <div key={i} className="flex items-center gap-2" style={{ padding: "3px 0", fontSize: 12.5, position: "relative" }}>
                  <span style={{ position: "absolute", left: -17, width: 8, height: 8, borderRadius: 999, background: e.color }} />
                  <span style={{ color: C.sub, fontVariantNumeric: "tabular-nums", minWidth: 62 }}>{fmtClock(e.ts)}</span>
                  <span>{e.title} — {e.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EOD */}
      {showEod && (
        <div style={{ margin: "0 14px 14px", background: "#FBFCFE", border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
          <div className="flex items-center gap-2 mb-2"><FileText size={15} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 14 }}>EOD Report</span></div>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 10 }}>Staff: <b style={{ color: C.text }}>{staff.name}</b> · Date: <b style={{ color: C.text }}>{fmtDayLabel(date)}</b></div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            <EodBlock title={`Completed (${eod.completed.length})`} items={eod.completed.map((t) => t.title)} color={C.teal} />
            <EodBlock title={`Pending (${eod.pending.length})`} items={eod.pending.map((t) => t.title)} color={C.amber} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Summary</div>
              <div style={{ fontSize: 12.5, color: C.text }}>Published: <b>{eod.published.length}</b></div>
              <div style={{ fontSize: 12.5, color: C.text }}>Working hours: <b>{fmtHours(eod.hours)}</b></div>
            </div>
          </div>
        </div>
      )}
      {showCongrats && (
        <CongratsModal name={staff.name} hours={eod.hours || 0} tasks={eod.completed.map((t) => t.title)} gender={staff.gender} onClose={() => setShowCongrats(false)} />
      )}
    </div>
  );
}

function DailyTaskRow({ t, categories, canEdit, isAdmin, onStatus, onDelete, onOpen, showDue }: {
  t: TaskRecord; categories: Category[]; canEdit: boolean; isAdmin: boolean;
  onStatus: (id: string, status: Status, col: ColKey) => void; onDelete: (id: string, col: ColKey) => void; onOpen: (id: string, col: ColKey) => void; showDue?: boolean;
}) {
  const m = STATUS_META[t.status];
  const pm = PRIORITY_META[t.priority || "medium"];
  const dm = dueMeta(t);
  const col = t._col || "daily";
  return (
    <div className="flex items-center justify-between flex-wrap gap-2" style={{ background: C.paper, borderRadius: 10, padding: "8px 11px", opacity: DEAD(t.status) ? 0.6 : 1 }}>
      <div className="flex items-center gap-2 flex-wrap" style={{ minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: catC(t.category, categories), flexShrink: 0 }} />
        <button onClick={() => onOpen(t.id, col)} style={{ fontWeight: 600, fontSize: 13.5, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left" }}>{t.title}</button>
        <Chip color={pm.c} soft={pm.soft} icon={<Flag size={9} />}>{pm.txt}</Chip>
        <Chip color={m.c} soft={m.soft}>{m.txt}</Chip>
        {t._col && t._col !== "daily" && <span style={{ fontSize: 10.5, color: C.sub, fontWeight: 600, textTransform: "uppercase" }}>{t._col}</span>}
        {t.completedAt && <span style={{ fontSize: 11.5, color: C.sub }} className="flex items-center gap-1"><Clock size={11} /> {fmtClock(t.completedAt)}</span>}
        {showDue && t.dueDate && <span className="flex items-center gap-1" style={{ fontSize: 11.5, color: dm && dm.over ? C.rose : C.sub, fontWeight: dm && dm.over ? 700 : 400 }}><Clock size={11} /> due {fmtDay(t.dueDate)}{dm && dm.label ? ` · ${dm.label}` : ""}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        {canEdit && t.status === "pending" && <Btn sm kind="ghost" icon={<Play size={12} />} onClick={() => onStatus(t.id, "in_progress", col)}>Start</Btn>}
        {canEdit && t.status === "in_progress" && <Btn sm kind="ghost" icon={<Pause size={12} />} onClick={() => onStatus(t.id, "on_hold", col)}>Pause</Btn>}
        {canEdit && t.status === "on_hold" && <Btn sm kind="ghost" icon={<Play size={12} />} onClick={() => onStatus(t.id, "in_progress", col)}>Resume</Btn>}
        {canEdit && t.status === "in_progress" && <Btn sm kind="ghost" icon={<CheckCircle2 size={12} />} onClick={() => onStatus(t.id, "completed", col)}>Complete</Btn>}
        {canEdit && t.status === "completed" && <Btn sm kind="teal" icon={<Send size={12} />} onClick={() => onStatus(t.id, "published", col)}>Publish</Btn>}
        {isAdmin && <button onClick={() => onDelete(t.id, col)} title="Remove" style={{ color: C.rose, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>}
      </div>
    </div>
  );
}

/* ---------------- Pending — everything not finished yet, any day (past,
   today, or a task already created for tomorrow), sorted priority-first so
   an urgent last-minute task stays near the top until it's dealt with. ---------------- */
function PendingStaffCard({ staff, tasks, categories, canEdit, isAdmin, onStatus, onDelete, onOpen }: {
  staff: Agent; tasks: TaskRecord[]; categories: Category[]; canEdit: boolean; isAdmin: boolean;
  onStatus: (id: string, status: Status, col: ColKey) => void; onDelete: (id: string, col: ColKey) => void; onOpen: (id: string, col: ColKey) => void;
}) {
  return (
    <div style={{ ...card, overflow: "hidden" }}>
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2.5">
          <Avatar name={staff.name} team={staff.team} size={38} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{staff.name}</div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: C.sub }}>{staff.team === "Domestic" ? <MapPin size={11} /> : <Globe size={11} />}{staff.team} Team</div>
          </div>
        </div>
        <Chip color={tasks.length ? C.amber : C.sub} soft={tasks.length ? C.amberSoft : C.paper}>{tasks.length} pending</Chip>
      </div>
      <div style={{ padding: "10px 14px" }}>
        {tasks.length === 0 && <div style={{ fontSize: 13, color: C.sub, padding: "6px 0" }}>Nothing pending — all caught up.</div>}
        <div className="space-y-2">
          {tasks.map((t) => (
            <DailyTaskRow key={t.id} t={t} categories={categories} canEdit={canEdit} isAdmin={isAdmin} onStatus={onStatus} onDelete={onDelete} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EodBlock({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
      {items.length === 0
        ? <div style={{ fontSize: 12.5, color: C.sub }}>—</div>
        : items.map((t, i) => <div key={i} style={{ fontSize: 12.5, color: C.text }}>• {t}</div>)}
    </div>
  );
}

function TeamDailyReport({ data, date }: { data: AppData; date: string }) {
  const teams = (["Domestic", "International"] as Team[]).map((team) => {
    const members = data.agents.filter((a) => a.team === team).map((a) => {
      const ts = (data.daily || []).filter((d) =>
        toDateInput(d.dueDate) === date && (
          DONEISH(d.status) && d.completedBy
            ? d.completedBy === a.name
            : d.agentId === a.id || (d.collaboratorIds || []).includes(a.id)
        )
      );
      return { name: a.name, titles: ts.filter((d) => DONEISH(d.status)).map((d) => d.title) };
    });
    return { team, members };
  });
  return (
    <div style={{ ...card, padding: 16, borderColor: C.ink }}>
      <div className="flex items-center gap-2 mb-1"><Users size={16} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 14 }}>Team Daily Report</span></div>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>{fmtDayLabel(date)}</div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {teams.map((t) => (
          <div key={t.team}>
            <div className="flex items-center gap-1.5 mb-2 font-semibold" style={{ fontSize: 13.5, color: teamColor(t.team) }}>
              {t.team === "Domestic" ? <MapPin size={14} /> : <Globe size={14} />}{t.team} Team
            </div>
            {t.members.map((m) => (
              <div key={m.name} style={{ padding: "6px 0", borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                {m.titles.length === 0
                  ? <div style={{ fontSize: 12, color: C.sub }}>Nothing completed yet.</div>
                  : m.titles.map((title, i) => <div key={i} style={{ fontSize: 12.5, color: C.text, marginTop: 2 }}>• {title}</div>)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
