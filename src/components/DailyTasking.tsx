import { useState } from "react";
import {
  CalendarCheck, Plus, Users, MapPin, Globe, Play, CheckCircle2, Send, Trash2, Clock, Activity, FileText
} from "lucide-react";
import { C, card, teamColor, inputStyle } from "../lib/theme";
import { Avatar, Chip, Btn, Field } from "./ui";
import type { AppData, Agent, DailyTask, DailyStatus, Team } from "../lib/types";
import {
  todayKey, fmtDayLabel, fmtClock, DAILY_META, DAILY_DONE, dailyDotColor,
  buildDayTimeline, eodOf, fmtHours
} from "../lib/daily";

interface DailyTaskingProps {
  data: AppData;
  isAdmin: boolean;
  meId?: string;
  addDaily: (agentId: string, title: string, opts?: { date?: string }) => void;
  setDailyStatus: (id: string, status: DailyStatus) => void;
  deleteDaily: (id: string) => void;
}

/* ---------------- Daily Tasking (admin: everyone · agent: own only) ---------------- */
export function DailyTasking({ data, isAdmin, meId, addDaily, setDailyStatus, deleteDaily }: DailyTaskingProps) {
  const [date, setDate] = useState(todayKey());
  const [staffF, setStaffF] = useState("all");
  const [showAssign, setShowAssign] = useState(false);
  const [showTeamReport, setShowTeamReport] = useState(false);

  const scope = isAdmin ? data.agents : data.agents.filter((a) => a.id === meId);
  const shown = isAdmin && staffF !== "all" ? scope.filter((a) => a.id === staffF) : scope;
  const dailyFor = (agentId: string) => (data.daily || []).filter((d) => d.date === date && d.agentId === agentId);

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
          {isAdmin && <Btn sm kind="ghost" icon={<Users size={14} />} onClick={() => setShowTeamReport((v) => !v)}>Team daily report</Btn>}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "7px 10px" }} />
        </div>
      </div>

      {isAdmin && showAssign && (
        <AssignDailyForm agents={data.agents} date={date}
          onAssign={(agentId, title) => { addDaily(agentId, title, { date }); }}
          onClose={() => setShowAssign(false)} />
      )}

      {isAdmin && showTeamReport && <TeamDailyReport data={data} date={date} />}

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap" style={{ ...card, padding: 12 }}>
          <span className="flex items-center gap-1.5 font-semibold" style={{ fontSize: 12.5, color: C.sub }}><Users size={14} /> Staff</span>
          <select value={staffF} onChange={(e) => setStaffF(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="all">All staff</option>
            {data.agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.team}</option>)}
          </select>
        </div>
      )}

      {shown.map((staff) => (
        <DailyStaffCard key={staff.id} staff={staff} tasks={dailyFor(staff.id)} date={date}
          canEdit={isAdmin || staff.id === meId} isAdmin={isAdmin}
          onStatus={setDailyStatus} onDelete={deleteDaily} />
      ))}
      {shown.length === 0 && <div style={{ ...card, padding: 18, color: C.sub, fontSize: 13.5 }}>No staff to show.</div>}

      {!isAdmin && <div style={{ fontSize: 12, color: C.sub, textAlign: "center", paddingBottom: 4 }}>View is limited to your own tasks. Daily tasks are assigned by the supervisor.</div>}
    </div>
  );
}

function AssignDailyForm({ agents, date, onAssign, onClose }: {
  agents: Agent[]; date: string; onAssign: (agentId: string, title: string) => void; onClose: () => void;
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id || "");
  const [title, setTitle] = useState("");
  const ok = !!agentId && title.trim().length > 1;
  return (
    <div style={{ ...card, padding: 16, borderColor: C.teal }}>
      <div className="flex items-center gap-2 mb-3"><Plus size={16} color={C.teal} /><span style={{ fontWeight: 700, fontSize: 14 }}>Assign a daily task · {fmtDayLabel(date)}</span></div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
        <Field label="Staff member">
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={inputStyle}>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.team}</option>)}
          </select>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Task"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vietnam Itinerary" style={inputStyle} /></Field>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Btn sm kind="teal" disabled={!ok} onClick={() => { onAssign(agentId, title); setTitle(""); }}>Assign task</Btn>
        <Btn sm kind="ghost" onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
}

function DailyStaffCard({ staff, tasks, date, canEdit, isAdmin, onStatus, onDelete }: {
  staff: Agent; tasks: DailyTask[]; date: string; canEdit: boolean; isAdmin: boolean;
  onStatus: (id: string, status: DailyStatus) => void; onDelete: (id: string) => void;
}) {
  const [showEod, setShowEod] = useState(false);
  const timeline = buildDayTimeline(tasks);
  const eod = eodOf(tasks);
  const doneCount = tasks.filter((t) => DAILY_DONE(t.status)).length;

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
          {tasks.map((t) => {
            const m = DAILY_META[t.status];
            return (
              <div key={t.id} className="flex items-center justify-between flex-wrap gap-2" style={{ background: C.paper, borderRadius: 10, padding: "8px 11px" }}>
                <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.title}</span>
                  <Chip color={m.c} soft={m.soft}>{m.txt}</Chip>
                  {t.completedAt && <span style={{ fontSize: 11.5, color: C.sub }} className="flex items-center gap-1"><Clock size={11} /> {fmtClock(t.completedAt)}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {canEdit && t.status === "assigned" && <Btn sm kind="ghost" icon={<Play size={12} />} onClick={() => onStatus(t.id, "in_progress")}>Start</Btn>}
                  {canEdit && t.status === "in_progress" && <Btn sm kind="ghost" icon={<CheckCircle2 size={12} />} onClick={() => onStatus(t.id, "completed")}>Complete</Btn>}
                  {canEdit && t.status === "completed" && <Btn sm kind="teal" icon={<Send size={12} />} onClick={() => onStatus(t.id, "published")}>Publish</Btn>}
                  {isAdmin && <button onClick={() => onDelete(t.id)} title="Remove" style={{ color: C.rose, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* timeline */}
      {timeline.length > 0 && (
        <div style={{ padding: "4px 14px 12px" }}>
          <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <Activity size={13} /> Daily timeline
          </div>
          <div style={{ borderLeft: `2px solid ${C.line}`, paddingLeft: 12 }}>
            {timeline.map((e, i) => (
              <div key={i} className="flex items-center gap-2" style={{ padding: "3px 0", fontSize: 12.5, position: "relative" }}>
                <span style={{ position: "absolute", left: -17, width: 8, height: 8, borderRadius: 999, background: dailyDotColor(e.action) }} />
                <span style={{ color: C.sub, fontVariantNumeric: "tabular-nums", minWidth: 62 }}>{fmtClock(e.ts)}</span>
                <span>{e.label}</span>
              </div>
            ))}
          </div>
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
      const ts = (data.daily || []).filter((d) => d.date === date && d.agentId === a.id);
      return { name: a.name, done: ts.filter((d) => DAILY_DONE(d.status)).length };
    });
    return { team, members, done: members.reduce((s, m) => s + m.done, 0) };
  });
  return (
    <div style={{ ...card, padding: 16, borderColor: C.ink }}>
      <div className="flex items-center gap-2 mb-1"><Users size={16} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 14 }}>Team Daily Report</span></div>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>{fmtDayLabel(date)}</div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {teams.map((t) => (
          <div key={t.team}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-semibold" style={{ fontSize: 13.5, color: teamColor(t.team) }}>{t.team === "Domestic" ? <MapPin size={14} /> : <Globe size={14} />}{t.team} Team</span>
              <span style={{ fontSize: 12, color: C.sub }}>{t.done} completed</span>
            </div>
            {t.members.map((m) => (
              <div key={m.name} className="flex items-center justify-between" style={{ padding: "5px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
                <span>{m.name}</span>
                <span style={{ color: C.sub }}><b style={{ color: C.text }}>{m.done}</b> task{m.done !== 1 ? "s" : ""} completed</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}