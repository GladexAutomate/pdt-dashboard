import { useState, type ReactNode } from "react";
import {
  FileText, ScrollText, Users, MapPin, Globe, Lock, Send, CheckCircle2, History
} from "lucide-react";
import { C, card, cellStyle, teamColor } from "../lib/theme";
import { MONTHS, DEPARTMENTS, STATUSES, STATUS_META, PRIORITY_META, REPORT_FLOW, DONEISH, DEAD } from "../lib/constants";
import {
  flattenRecords, staffMonth, kpiBand, monthKey, inMonth, recInMonth,
  dueMeta, fmtDay, sum, avg, downloadCSV
} from "../lib/helpers";
import { Avatar, Chip, Btn, Stat, RBox, ChartCard, MiniBars, BarsH } from "./ui";
import type { AppData, Agent, ColKey, Team, StaffMonthStats, ChartItem } from "../lib/types";

interface TeamAgg {
  team: Team;
  staffCount: number;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  productivity: number;
  kpi: number;
  top: { a: Agent; sm: StaffMonthStats } | undefined;
  completionPct: number;
}

/* ---------------- Monthly staff summary report ---------------- */
function TeamSummary({ teams, monthName }: { teams: TeamAgg[]; monthName: string }) {
  const lead = teams[0].completionPct === teams[1].completionPct ? null : (teams[0].completionPct > teams[1].completionPct ? teams[0] : teams[1]);
  const maxComp = Math.max(1, ...teams.map((t) => t.completionPct));
  const maxProd = Math.max(1, ...teams.map((t) => t.productivity));
  const comparisons: [string, (t: TeamAgg) => number, number, (v: number) => ReactNode][] = [
    ["Completion %", (t) => t.completionPct, maxComp, (v) => Math.round(v) + "%"],
    ["Tasks completed", (t) => t.completed, Math.max(1, ...teams.map((x) => x.completed)), (v) => v],
    ["Productivity", (t) => t.productivity, maxProd, (v) => v]
  ];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2"><Users size={16} color={C.ink} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>Team performance summary — {monthName}</span></div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        {teams.map((t) => (
          <div key={t.team} style={{ ...card, padding: 15, borderTop: `3px solid ${teamColor(t.team)}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {t.team === "Domestic" ? <MapPin size={17} color={teamColor(t.team)} /> : <Globe size={17} color={teamColor(t.team)} />}
                <span style={{ fontWeight: 700, fontSize: 15 }}>Team {t.team}</span>
              </div>
              <Chip color={kpiBand(t.kpi).c} soft={C.paper}>KPI {t.kpi}</Chip>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span style={{ fontSize: 30, fontWeight: 700, color: teamColor(t.team), lineHeight: 1 }}>{Math.round(t.completionPct)}%</span>
              <span style={{ fontSize: 12, color: C.sub }}>completion · {t.completed}/{t.assigned} tasks</span>
            </div>
            <div style={{ height: 8, background: C.paper, borderRadius: 999, margin: "8px 0 12px" }}>
              <div style={{ width: Math.min(100, t.completionPct) + "%", height: "100%", background: teamColor(t.team), borderRadius: 999 }} />
            </div>
            <div className="flex justify-between" style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
              <Stat label="Completed" value={t.completed} color={C.teal} />
              <Stat label="Pending" value={t.pending} />
              <Stat label="Overdue" value={t.overdue} color={t.overdue ? C.rose : C.sub} />
              <Stat label="Staff" value={t.staffCount} />
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 10 }}>
              Top performer: <b style={{ color: C.text }}>{t.top ? t.top.a.name : "—"}</b>{t.top ? ` · KPI ${t.top.sm.kpi}` : ""}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 15, marginTop: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>Domestic vs International comparison</div>
        {comparisons.map(([label, fn, mx, fmt]) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 600, marginBottom: 5 }}>{label}</div>
            {teams.map((t) => (
              <div key={t.team} className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12, width: 88, color: teamColor(t.team), fontWeight: 600 }}>{t.team}</span>
                <div style={{ flex: 1, height: 16, background: C.paper, borderRadius: 6 }}>
                  <div style={{ width: (fn(t) / mx) * 100 + "%", height: "100%", background: teamColor(t.team), borderRadius: 6, minWidth: 2 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, width: 48, textAlign: "right" }}>{fmt(fn(t))}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: 12.5, color: C.text, background: C.paper, borderRadius: 9, padding: "9px 12px" }}>
          {lead ? <span><b style={{ color: teamColor(lead.team) }}>Team {lead.team}</b> leads this month with {Math.round(lead.completionPct)}% completion ({lead.completed}/{lead.assigned} tasks).</span>
            : <span>Both teams are even on completion rate this month.</span>}
        </div>
      </div>
    </div>
  );
}

interface MonthlyReportProps {
  data: AppData;
  isAdmin: boolean;
  meId?: string;
  actorName?: string;
  openAny: (col: ColKey, id: string) => void;
  submitReport: (key: string, who?: string) => void;
  approveReport: (key: string) => void;
  reopenReport: (key: string) => void;
}

export function MonthlyReport({ data, isAdmin, meId, actorName, openAny, submitReport, approveReport, reopenReport }: MonthlyReportProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [staff, setStaff] = useState<string>(isAdmin ? "all" : (meId || ""));
  const [fTeam, setFTeam] = useState("all");
  const [fDept, setFDept] = useState("all");
  const [fDest, setFDest] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [project, setProject] = useState("");

  const all = flattenRecords(data);
  const q = project.trim().toLowerCase();
  const scoped = all.filter((r) => {
    if (fTeam !== "all" && r.team !== fTeam) return false;
    if (fDept !== "all" && r.department !== fDept) return false;
    if (fDest !== "all" && r.destination !== fDest) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (q && ![r.title, r.category, r.department, r.destination].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  const agentName = (id: string | null | undefined) => data.agents.find((a) => a.id === id)?.name || "—";
  const agentsList = data.agents.filter((a) => fTeam === "all" || a.team === fTeam);
  const ss = { border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 12.5, color: C.text, outline: "none", fontWeight: 600, cursor: "pointer" };
  const monthName = `${MONTHS[month]} ${year}`;
  const years = [today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2];
  const dests = [...new Set(all.map((r) => r.destination).filter(Boolean))];

  const single = staff !== "all";
  const sm = single ? staffMonth(scoped, staff, year, month) : null;
  const reportKey = `${staff}:${monthKey(year, month)}`;
  const reportState = (data.reports && data.reports[reportKey]?.status) || "in_progress";
  const locked = reportState === "locked";
  const owner = !isAdmin && staff === meId;

  // analytics
  const trend: ChartItem[] = [...Array(6)].map((_, i) => {
    const dte = new Date(year, month - (5 - i), 1); const yy = dte.getFullYear(), mm = dte.getMonth();
    const base = single ? scoped.filter((r) => r.agentId === staff) : scoped;
    return { label: MONTHS[mm], value: base.filter((r) => DONEISH(r.status) && inMonth(r.completedAt, yy, mm)).length };
  });
  const monthSet = (single ? scoped.filter((r) => r.agentId === staff) : scoped).filter((r) => recInMonth(r, year, month));
  const statusItems: ChartItem[] = STATUSES.map((s) => ({ label: STATUS_META[s].txt, value: monthSet.filter((r) => r.status === s).length, color: STATUS_META[s].c })).filter((x) => x.value > 0);
  const destMap: Record<string, number> = {}; monthSet.forEach((r) => { if (r.destination) destMap[r.destination] = (destMap[r.destination] || 0) + 1; });
  const destItems: ChartItem[] = Object.entries(destMap).map(([k, v]) => ({ label: k, value: v, color: C.international })).sort((a, b) => b.value - a.value);
  const teamItems: ChartItem[] = (["Domestic", "International"] as Team[]).map((tm) => ({ label: tm, value: scoped.filter((r) => r.team === tm && DONEISH(r.status) && inMonth(r.completedAt, year, month)).length, color: teamColor(tm) }));
  const board = agentsList.map((a) => ({ a, sm: staffMonth(scoped, a.id, year, month) })).sort((x, y) => y.sm.kpi - x.sm.kpi);

  // team performance (independent of the team filter so both teams always compare)
  const scopedNoTeam = all.filter((r) => {
    if (fDept !== "all" && r.department !== fDept) return false;
    if (fDest !== "all" && r.destination !== fDest) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (q && ![r.title, r.category, r.department, r.destination].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  const teamAgg = (team: Team): TeamAgg => {
    const mem = data.agents.filter((a) => a.team === team);
    const sms = mem.map((a) => ({ a, sm: staffMonth(scopedNoTeam, a.id, year, month) }));
    const assigned = sum(sms.map((x) => x.sm.assignedN));
    const completed = sum(sms.map((x) => x.sm.completedN));
    const pending = sum(sms.map((x) => x.sm.pendingN));
    const overdue = sum(sms.map((x) => x.sm.overdueN));
    const productivity = sum(sms.map((x) => x.sm.productivity));
    const kpi = Math.round(avg(sms.map((x) => x.sm.kpi)) || 0);
    const top = [...sms].sort((a, b) => b.sm.kpi - a.sm.kpi)[0];
    return { team, staffCount: mem.length, assigned, completed, pending, overdue, productivity, kpi, top, completionPct: assigned ? (completed / assigned) * 100 : 0 };
  };
  const teams = (["Domestic", "International"] as Team[]).map(teamAgg);

  const exportExcel = () => {
    const head = ["Staff", "Team", "Source", "Project/Title", "Destination", "Category", "Priority", "Status", "Start", "Completion", "Assigned By", "Completed By", "Remarks"];
    const list = single ? sm!.mine : monthSet;
    const rows = list.map((r) => [agentName(r.agentId), r.team, r._col, r.title, r.destination, r.category || r.department, PRIORITY_META[r.priority || "medium"].txt, STATUS_META[r.status].txt, fmtDay(r.startDate), DONEISH(r.status) ? fmtDay(r.completedAt) : "", r.assignedBy, r.completedBy || "", r.remarks]);
    let meta: unknown[][] = [["Monthly Staff Summary Report"], ["Staff", single ? agentName(staff) : "All staff"], ["Month", monthName], []];
    if (single) meta = meta.concat([["KPI Score", sm!.kpi], ["Completion %", Math.round(sm!.completionPct)], ["Completed", sm!.completedN], ["Assigned", sm!.assignedN], []]);
    downloadCSV(`monthly_report_${single ? agentName(staff) : "all"}_${monthKey(year, month)}.csv`, [...meta, head, ...rows]);
  };

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Staff Monthly Summary Report</h2>
          <div style={{ fontSize: 12.5, color: C.sub }}>Auto-generated productivity & KPI summary · {monthName}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn sm kind="teal" icon={<FileText size={14} />} onClick={exportExcel}>Export Excel</Btn>
          <Btn sm kind="ghost" icon={<ScrollText size={14} />} onClick={() => window.print()}>Export PDF</Btn>
          <Btn sm kind="ghost" icon={<ScrollText size={14} />} onClick={() => window.print()}>Print</Btn>
        </div>
      </div>

      {/* filters */}
      <div className="flex items-center gap-2 flex-wrap my-3">
        <select value={month} onChange={(e) => setMonth(+e.target.value)} style={ss}>{MONTHS.map((mn, i) => <option key={mn} value={i}>{mn}</option>)}</select>
        <select value={year} onChange={(e) => setYear(+e.target.value)} style={ss}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <select value={staff} onChange={(e) => setStaff(e.target.value)} style={ss} disabled={!isAdmin}>
          {isAdmin && <option value="all">All staff</option>}
          {agentsList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={fTeam} onChange={(e) => setFTeam(e.target.value)} style={ss}><option value="all">All teams</option><option>Domestic</option><option>International</option></select>
        <select value={fDept} onChange={(e) => setFDept(e.target.value)} style={ss}><option value="all">All departments</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
        <select value={fDest} onChange={(e) => setFDest(e.target.value)} style={ss}><option value="all">All destinations</option>{dests.map((d) => <option key={d}>{d}</option>)}</select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={ss}><option value="all">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].txt}</option>)}</select>
        <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project…" style={{ ...ss, fontWeight: 400, minWidth: 120 }} />
      </div>

      {single ? (
        <SingleReport sm={sm!} staffId={staff} data={data} monthName={monthName}
          trend={trend} statusItems={statusItems} destItems={destItems}
          reportKey={reportKey} reportState={reportState} locked={locked} owner={owner} isAdmin={isAdmin}
          submitReport={submitReport} approveReport={approveReport} reopenReport={reopenReport} actorName={actorName}
          openAny={(col, id) => !locked && openAny(col, id)} />
      ) : (
        <div className="space-y-4">
          {/* org summary tiles */}
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
            <RBox label="Active projects" value={scoped.filter((r) => r._isProject && !DONEISH(r.status) && !DEAD(r.status)).length} c={C.international} />
            <RBox label="Completed (month)" value={scoped.filter((r) => DONEISH(r.status) && inMonth(r.completedAt, year, month)).length} c={C.teal} />
            <RBox label="Pending" value={monthSet.filter((r) => r.status === "pending").length} c={C.sub} />
            <RBox label="Overdue" value={monthSet.filter((r) => { const d = dueMeta(r); return d && d.over; }).length} c={C.rose} />
            <RBox label="High priority done" value={scoped.filter((r) => r.priority === "high" && DONEISH(r.status) && inMonth(r.completedAt, year, month)).length} c={C.amber} />
          </div>

          <TeamSummary teams={teams} monthName={monthName} />

          <ChartCard title="KPI leaderboard — individual performance comparison">
            <BarsH items={board.map(({ a, sm }) => ({ label: a.name, value: sm.kpi, color: kpiBand(sm.kpi).c }))} fmt={(v) => v} />
          </ChartCard>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            <ChartCard title="Tasks completed by month"><MiniBars items={trend} /></ChartCard>
            <ChartCard title="Team comparison (completed)"><MiniBars items={teamItems} /></ChartCard>
            <ChartCard title="Task status breakdown"><BarsH items={statusItems} /></ChartCard>
            <ChartCard title="Destination workload"><BarsH items={destItems.length ? destItems : []} /></ChartCard>
          </div>

          {/* per-staff KPI table */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
                <thead><tr style={{ background: C.paper }}>
                  {["Staff", "Team", "Assigned", "Started", "Completed", "Pending", "Overdue", "Completion", "High done", "Avg time", "KPI"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: C.sub, fontWeight: 700, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {board.map(({ a, sm }) => {
                    const band = kpiBand(sm.kpi);
                    return (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}`, cursor: "pointer" }} onClick={() => setStaff(a.id)}>
                        <td style={{ ...cellStyle, fontWeight: 600 }}><div className="flex items-center gap-2"><Avatar name={a.name} team={a.team} size={24} />{a.name}</div></td>
                        <td style={{ ...cellStyle, color: teamColor(a.team), fontWeight: 600 }}>{a.team}</td>
                        <td style={cellStyle}>{sm.assignedN}</td>
                        <td style={cellStyle}>{sm.startedN}</td>
                        <td style={{ ...cellStyle, color: C.teal, fontWeight: 700 }}>{sm.completedN}</td>
                        <td style={cellStyle}>{sm.pendingN}</td>
                        <td style={{ ...cellStyle, color: sm.overdueN ? C.rose : C.sub, fontWeight: sm.overdueN ? 700 : 400 }}>{sm.overdueN}</td>
                        <td style={cellStyle}>{Math.round(sm.completionPct)}%</td>
                        <td style={cellStyle}>{sm.high.length}</td>
                        <td style={cellStyle}>{sm.avgTime != null ? sm.avgTime.toFixed(1) + "h" : "—"}</td>
                        <td style={cellStyle}><Chip color={band.c} soft={C.paper}>{sm.kpi}</Chip></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.sub }}>Tip: click a staff row (or pick a name in the filter) to open their full monthly report with completed-work detail, review tools, and approval.</div>
        </div>
      )}
    </div>
  );
}

interface SingleReportProps {
  sm: StaffMonthStats;
  staffId: string;
  data: AppData;
  monthName: string;
  trend: ChartItem[];
  statusItems: ChartItem[];
  destItems: ChartItem[];
  reportKey: string;
  reportState: string;
  locked: boolean;
  owner: boolean;
  isAdmin: boolean;
  submitReport: (key: string, who?: string) => void;
  approveReport: (key: string) => void;
  reopenReport: (key: string) => void;
  actorName?: string;
  openAny: (col: ColKey, id: string) => void;
}

function SingleReport({ sm, staffId, data, monthName, trend, statusItems, destItems, reportKey, reportState, locked, owner, isAdmin, submitReport, approveReport, reopenReport, actorName, openAny }: SingleReportProps) {
  const agent = data.agents.find((a) => a.id === staffId)!;
  const band = kpiBand(sm.kpi);
  const flow = REPORT_FLOW[reportState];
  const completedSorted = [...sm.completed].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  return (
    <div className="space-y-4">
      {/* approval banner */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ ...card, padding: "12px 15px", borderColor: flow.c }}>
        <div className="flex items-center gap-2.5">
          <Avatar name={agent.name} team={agent.team} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{agent.name} · <span style={{ color: teamColor(agent.team) }}>{agent.team}</span></div>
            <div style={{ fontSize: 12, color: C.sub }}>Reporting month: {monthName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip color={flow.c} soft={flow.soft} icon={locked ? <Lock size={11} /> : null}>{flow.txt}</Chip>
          {owner && reportState === "in_progress" && <Btn sm kind="primary" icon={<Send size={13} />} onClick={() => submitReport(reportKey, actorName)}>Submit for review</Btn>}
          {isAdmin && reportState === "for_review" && <Btn sm kind="teal" icon={<CheckCircle2 size={13} />} onClick={() => approveReport(reportKey)}>Approve &amp; lock</Btn>}
          {isAdmin && locked && <Btn sm kind="ghost" icon={<History size={13} />} onClick={() => reopenReport(reportKey)}>Reopen</Btn>}
        </div>
      </div>
      {locked && <div style={{ fontSize: 12.5, color: C.ink2, background: "#E7EBF3", borderRadius: 9, padding: "9px 12px" }}>This report is locked and finalized for KPI evaluation. Records are read-only until an administrator reopens it.</div>}

      {/* summary tiles */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>Monthly summary</div>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
          <RBox label="Assigned" value={sm.assignedN} />
          <RBox label="Started" value={sm.startedN} c={C.international} />
          <RBox label="Completed" value={sm.completedN} c={C.teal} />
          <RBox label="Pending" value={sm.pendingN} c={C.sub} />
          <RBox label="Overdue" value={sm.overdueN} c={sm.overdueN ? C.rose : C.sub} />
          <RBox label="Completion" value={Math.round(sm.completionPct) + "%"} c={C.ink2} />
          <RBox label="High-priority done" value={sm.high.length} c={C.amber} />
          <RBox label="Projects handled" value={sm.projects.length} c={C.international} />
          <RBox label="Destinations" value={sm.dests.length} />
          <RBox label="Avg completion" value={sm.avgTime != null ? sm.avgTime.toFixed(1) + "h" : "—"} />
          <RBox label="Last activity" value={sm.lastActivity ? fmtDay(sm.lastActivity) : "—"} />
        </div>
      </div>

      {/* KPI summary */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>KPI performance summary</div>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
          <div style={{ ...card, padding: "12px 14px", background: C.ink, color: "#fff" }}>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Monthly KPI</div>
            <div className="flex items-baseline gap-1.5"><span style={{ fontSize: 26, fontWeight: 700, color: band.c }}>{sm.kpi}</span><span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{band.txt}</span></div>
          </div>
          <RBox label="Productivity" value={sm.productivity} c={C.teal} />
          <RBox label="Completion %" value={Math.round(sm.completionPct) + "%"} />
          <RBox label="On-time rate" value={Math.round(sm.onTimePct) + "%"} c={C.teal} />
          <RBox label="Delayed" value={sm.delayed.length} c={sm.delayed.length ? C.rose : C.sub} />
          <RBox label="Reassigned" value={sm.reassigned} />
          <RBox label="Active projects" value={sm.activeProjects.length} c={C.international} />
          <RBox label="Completed projects" value={sm.completedProjects.length} c={C.teal} />
        </div>
      </div>

      {/* analytics */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <ChartCard title="Monthly productivity trend (completed)"><MiniBars items={trend} /></ChartCard>
        <ChartCard title="Task status breakdown"><BarsH items={statusItems} /></ChartCard>
        <ChartCard title="Destination workload"><BarsH items={destItems} /></ChartCard>
      </div>

      {/* completed-work table */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>Completed work — {monthName}</div>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
              <thead><tr style={{ background: C.paper }}>
                {["Source", "Project / Task", "Destination", "Category", "Priority", "Status", "Start", "Completed", "Assigned By", "Completed By", "Files", "Links", "Remarks"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: C.sub, fontWeight: 700, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {completedSorted.length === 0 && <tr><td colSpan={13} style={{ padding: 18, color: C.sub, fontSize: 13 }}>No completed work recorded for this month.</td></tr>}
                {completedSorted.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ ...cellStyle, textTransform: "capitalize", color: C.sub }}>{r._col}</td>
                    <td style={{ ...cellStyle, fontWeight: 600 }}><button onClick={() => r._col && openAny(r._col, r.id)} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left", fontWeight: 600 }}>{r.title}</button></td>
                    <td style={cellStyle}>{r.destination || "—"}</td>
                    <td style={cellStyle}>{r.category || r.department || "—"}</td>
                    <td style={cellStyle}><Chip color={PRIORITY_META[r.priority || "medium"].c} soft={PRIORITY_META[r.priority || "medium"].soft}>{PRIORITY_META[r.priority || "medium"].txt}</Chip></td>
                    <td style={cellStyle}><Chip color={STATUS_META[r.status].c} soft={STATUS_META[r.status].soft}>{STATUS_META[r.status].txt}</Chip></td>
                    <td style={cellStyle}>{fmtDay(r.startDate || r.startedAt)}</td>
                    <td style={{ ...cellStyle, color: C.teal, fontWeight: 600 }}>{fmtDay(r.completedAt)}</td>
                    <td style={cellStyle}>{r.assignedBy || "—"}</td>
                    <td style={cellStyle}>{r.completedBy || "—"}</td>
                    <td style={cellStyle}>{r.proofCount || 0}</td>
                    <td style={cellStyle}>{(r.links || []).length}</td>
                    <td style={{ ...cellStyle, minWidth: 160, color: C.sub }}>{r.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* review & correction */}
      {!locked && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Review &amp; correct before submission</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Open any record to fix its status, completion date, proof, or remarks. Changes flow straight into this report.</div>
          <div className="space-y-2">
            {sm.mine.filter((r) => !DONEISH(r.status) && !DEAD(r.status)).map((r) => {
              const dm = dueMeta(r);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3" style={{ ...card, padding: "10px 13px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: C.sub }}>{r._col} · {STATUS_META[r.status].txt}{r.dueDate ? ` · due ${fmtDay(r.dueDate)}` : ""}{dm && dm.over ? ` · ${dm.label}` : ""}</div>
                  </div>
                  <Btn sm kind="ghost" icon={<FileText size={13} />} onClick={() => r._col && openAny(r._col, r.id)}>Review</Btn>
                </div>
              );
            })}
            {sm.mine.filter((r) => !DONEISH(r.status) && !DEAD(r.status)).length === 0 && <div style={{ fontSize: 12.5, color: C.sub }}>Nothing outstanding — all this month's records are completed or closed.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
