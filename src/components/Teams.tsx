import { useState, type ReactNode } from "react";
import { Users, ScrollText, MapPin, Globe, ChevronRight, ArrowLeft, Filter, Sparkles } from "lucide-react";
import { C, card, catC, teamColor, cellStyle, dateInputStyle } from "../lib/theme";
import { STATUSES, STATUS_META, STATUS_ORDER, PRIORITIES, PRIORITY_META, DEAD, D } from "../lib/constants";
import { agentStats, groupStats, speedLabel, pct, dueMeta, toDateInput, fromDateInput, myWorkPool } from "../lib/helpers";
import { Avatar, Chip, Stat, AssigneeSelect, PrioritySelect, StatusSelect, ProgressBar, EditableText } from "./ui";
import type { AppData, Agent, TaskRecord, Team, Status, Priority, Category } from "../lib/types";

interface TeamsProps {
  data: AppData;
  selTeam: Team | null;
  setSelTeam: (team: Team | null) => void;
  openMember: (id: string) => void;
  setStatus: (id: string, status: Status) => void;
  updateTask: (id: string, patch: Partial<TaskRecord>) => void;
  reassignTask: (id: string, agentId: string) => void;
  openDetail: (id: string) => void;
}

/* ---------------- Teams + member list ---------------- */
export function Teams({ data, selTeam, setSelTeam, openMember, setStatus, updateTask, reassignTask, openDetail }: TeamsProps) {
  const [view, setView] = useState("members");
  const pool = myWorkPool(data);
  if (!selTeam) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        {(["Domestic", "International"] as Team[]).map((name) => {
          const members = data.agents.filter((a) => a.team === name);
          const s = groupStats(members, pool);
          return (
            <div key={name} style={{ ...card, padding: 18, cursor: "pointer" }} onClick={() => setSelTeam(name)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 12, background: name === "Domestic" ? "#FBEAE4" : "#E7EDFB" }}>
                    {name === "Domestic" ? <MapPin size={20} color={teamColor(name)} /> : <Globe size={20} color={teamColor(name)} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>Team {name}</div>
                    <div style={{ fontSize: 12.5, color: C.sub }}>{members.length} members · {s.published} published</div>
                  </div>
                </div>
                <ChevronRight size={20} color={C.sub} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  const members = data.agents.filter((a) => a.team === selTeam);
  const teamTasks = data.tasks.filter((t) => members.some((m) => m.id === t.agentId));
  return (
    <div>
      <button onClick={() => setSelTeam(null)} className="flex items-center gap-1 font-semibold mb-3" style={{ fontSize: 13, color: C.sub }}>
        <ArrowLeft size={15} /> Teams
      </button>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          {selTeam === "Domestic" ? <MapPin size={20} color={teamColor(selTeam)} /> : <Globe size={20} color={teamColor(selTeam)} />}
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Team {selTeam}</h2>
        </div>
        <div className="flex" style={{ background: C.paper, borderRadius: 10, padding: 3 }}>
          {([["members", "Members", <Users size={14} />], ["table", "Task table", <ScrollText size={14} />]] as [string, string, ReactNode][]).map(([id, label, icon]) => (
            <button key={id} onClick={() => setView(id)} className="flex items-center gap-1.5 font-semibold"
              style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 8, border: "none", background: view === id ? "#fff" : "transparent", color: view === id ? C.text : C.sub, boxShadow: view === id ? "0 1px 2px rgba(0,0,0,0.06)" : "none", cursor: "pointer" }}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>
      {view === "members" ? (
        <div>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10 }}>
            Speed and Accuracy only come from tasks completed via <b>"Record completion" / "Publish"</b> (hours + item/error counts entered at that step) — a task finished by just changing its status directly won't count toward these, so a member can show — even with published work.
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {members.map((a) => {
            const s = agentStats(a, pool);
            const sp = speedLabel(s.avgSpeed);
            return (
              <div key={a.id} style={{ ...card, padding: 15, cursor: "pointer" }} onClick={() => openMember(a.id)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.name} team={a.team} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: C.sub }}>@{a.username}</div>
                    </div>
                  </div>
                  <ChevronRight size={17} color={C.sub} />
                </div>
                <div className="flex justify-between" style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  <Stat label="Tasks" value={s.mine.length} />
                  <Stat label="Published" value={s.published.length} />
                  <Stat label="Speed" value={sp.txt} color={sp.c} info="Estimated ÷ actual hours from tasks completed via 'Record completion' / 'Publish'. — until at least one task has been completed that way." />
                  <Stat label="Accuracy" value={pct(s.accuracy)} color={C.teal} info="(1 − errors ÷ items) from item/error counts entered on 'Record completion'. — until an item count has been entered." />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        <TeamTable team={selTeam} members={members} allAgents={data.agents} tasks={teamTasks} categories={data.categories} setStatus={setStatus} updateTask={updateTask} reassignTask={reassignTask} openDetail={openDetail} />
      )}
    </div>
  );
}

interface TeamTableProps {
  team: Team;
  members: Agent[];
  allAgents: Agent[];
  tasks: TaskRecord[];
  categories: Category[];
  setStatus: (id: string, status: Status) => void;
  updateTask: (id: string, patch: Partial<TaskRecord>) => void;
  reassignTask: (id: string, agentId: string) => void;
  openDetail: (id: string) => void;
}

/* ---------------- Per-team task table ---------------- */
function TeamTable({ members, allAgents, tasks, categories, setStatus, updateTask, reassignTask, openDetail }: TeamTableProps) {
  const [fStatus, setFStatus] = useState<Status | "all">("all");
  const [fStaff, setFStaff] = useState("all");
  const [fPriority, setFPriority] = useState<Priority | "all">("all");
  const [fDue, setFDue] = useState("all");

  const filtered = tasks.filter((t) => {
    if (fStatus !== "all" && t.status !== fStatus) return false;
    if (fStaff !== "all" && t.agentId !== fStaff) return false;
    if (fPriority !== "all" && (t.priority || "medium") !== fPriority) return false;
    if (fDue !== "all") {
      const dm = dueMeta(t);
      if (fDue === "overdue" && !(dm && dm.over)) return false;
      if (fDue === "week") { if (!t.dueDate) return false; const days = (t.dueDate - Date.now()) / D; if (!(days >= -0.5 && days <= 7)) return false; }
      if (fDue === "none" && t.dueDate) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || ((a.dueDate || Infinity) - (b.dueDate || Infinity)));
  const cols = ["Title", "Assigned To", "Priority", "Start Date", "Due Date", "Status", "Progress", "Requirements", "Remarks"];
  const selStyle = { border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 12.5, color: C.text, outline: "none", fontWeight: 600, cursor: "pointer" };
  const reset = () => { setFStatus("all"); setFStaff("all"); setFPriority("all"); setFDue("all"); };
  const anyFilter = fStatus !== "all" || fStaff !== "all" || fPriority !== "all" || fDue !== "all";

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}><Filter size={14} /> Filter:</span>
        <select value={fStaff} onChange={(e) => setFStaff(e.target.value)} style={selStyle}>
          <option value="all">All staff</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as Status | "all")} style={selStyle}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].txt}</option>)}
        </select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value as Priority | "all")} style={selStyle}>
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].txt}</option>)}
        </select>
        <select value={fDue} onChange={(e) => setFDue(e.target.value)} style={selStyle}>
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="week">Due this week</option>
          <option value="none">No due date</option>
        </select>
        {anyFilter && <button onClick={reset} style={{ ...selStyle, color: C.sub }}>Clear</button>}
        <span style={{ fontSize: 12, color: C.sub, marginLeft: "auto" }}>{sorted.length} of {tasks.length}</span>
      </div>
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1280 }}>
            <thead>
              <tr style={{ background: C.paper }}>
                {cols.map((c) => (
                  <th key={c} style={{ textAlign: "left", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: C.sub, fontWeight: 700, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={9} style={{ padding: 18, color: C.sub, fontSize: 13 }}>No tasks match these filters.</td></tr>}
              {sorted.map((t) => {
                const a = allAgents.find((x) => x.id === t.agentId);
                const dm = dueMeta(t);
                return (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${C.line}`, opacity: DEAD(t.status) ? 0.6 : 1 }}>
                    <td style={cellStyle}>
                      <div className="flex items-start gap-2">
                        <span style={{ marginTop: 4, width: 9, height: 9, borderRadius: 3, background: catC(t.category, categories), flexShrink: 0 }} />
                        <div>
                          <button onClick={() => openDetail && openDetail(t.id)} style={{ fontWeight: 600, fontSize: 13, textDecoration: t.status === "removed" ? "line-through" : "none", background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left" }}>{t.title}</button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span style={{ fontSize: 11, color: catC(t.category, categories), fontWeight: 600 }}>{t.category}</span>
                            {t.special && <Chip color={C.amber} soft={C.amberSoft} icon={<Sparkles size={10} />}>Special</Chip>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle}>{a && <AssigneeSelect value={t.agentId} agents={allAgents} onChange={(nid) => reassignTask(t.id, nid)} />}</td>
                    <td style={cellStyle}><PrioritySelect value={t.priority || "medium"} onChange={(p) => updateTask(t.id, { priority: p })} /></td>
                    <td style={cellStyle}><input type="date" value={toDateInput(t.startDate)} onChange={(e) => updateTask(t.id, { startDate: fromDateInput(e.target.value) })} style={dateInputStyle} /></td>
                    <td style={cellStyle}>
                      <input type="date" value={toDateInput(t.dueDate)} onChange={(e) => updateTask(t.id, { dueDate: fromDateInput(e.target.value) })} style={dateInputStyle} />
                      {dm && dm.label && <div style={{ fontSize: 11, color: dm.c, fontWeight: 600, marginTop: 3 }}>{dm.label}</div>}
                    </td>
                    <td style={cellStyle}><StatusSelect value={t.status} onChange={(s) => setStatus(t.id, s)} /></td>
                    <td style={{ ...cellStyle, minWidth: 120 }}>
                      <div className="flex items-center gap-2"><ProgressBar value={t.progress || 0} /><span style={{ fontSize: 11.5, color: C.sub, fontWeight: 600 }}>{t.progress || 0}%</span></div>
                    </td>
                    <td style={{ ...cellStyle, minWidth: 180 }}><EditableText value={t.requirements} placeholder="Add requirements…" onSave={(v) => updateTask(t.id, { requirements: v })} /></td>
                    <td style={{ ...cellStyle, minWidth: 180 }}><EditableText value={t.remarks} placeholder="Add remarks…" onSave={(v) => updateTask(t.id, { remarks: v })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
