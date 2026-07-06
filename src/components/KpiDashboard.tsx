import { useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { Target, Sparkles, CalendarCheck, Filter, Gauge, Globe, MapPin, Trash2, Plus } from "lucide-react";
import { C, card, kpiSelect, teamColor } from "../lib/theme";
import { KPI_STAFF, type KpiStaffEntry } from "../lib/constants";
import { sum, kpiStatus, pdMonthKey, pdMonthLabel } from "../lib/helpers";
import { Chip, Btn } from "./ui";
import type { AppData, Team, KpiStatusMeta } from "../lib/types";

const th: CSSProperties = { textAlign: "left", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", color: C.sub, fontWeight: 700, padding: "8px 10px", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: 13, color: C.text, padding: "9px 10px", borderTop: `1px solid ${C.line}`, verticalAlign: "middle" };

interface KpiRow {
  id: string;
  task: string;
  target: number;
  current: number;
  remaining: number;
  pct: number;
  status: KpiStatusMeta;
}
interface StaffRow extends KpiStaffEntry {
  kpis: KpiRow[];
  tTarget: number;
  tCur: number;
  pct: number;
  status: KpiStatusMeta;
}
interface TeamSum {
  tTarget: number;
  tCur: number;
  pct: number;
  status: KpiStatusMeta;
}

function AddKpiRow({ staffId, onAdd }: { staffId: string; onAdd: (staffId: string, task: string, target: string) => void }) {
  const [task, setTask] = useState("");
  const [target, setTarget] = useState("");
  const ok = task.trim().length > 1 && parseInt(target, 10) > 0;
  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ padding: "10px 12px", borderTop: `1px dashed ${C.line}`, background: C.paper }}>
      <Plus size={14} color={C.teal} />
      <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="New KPI / task name"
        style={{ flex: 1, minWidth: 160, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 9px", fontSize: 13, outline: "none" }} />
      <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target"
        style={{ width: 84, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 9px", fontSize: 13, outline: "none" }} />
      <Btn sm kind="teal" disabled={!ok} onClick={() => { onAdd(staffId, task, target); setTask(""); setTarget(""); }} icon={<Plus size={13} />}>Add KPI</Btn>
    </div>
  );
}

interface KpiDashboardProps {
  data: AppData;
  isAdmin: boolean;
  setKpi: (month: string, kkey: string, value: number) => void;
  addDef?: (staffId: string, task: string, target: string) => void;
  updateDef?: (id: string, patch: { target: number }) => void;
  removeDef?: (id: string) => void;
}

export function KpiDashboard({ data, isAdmin, setKpi, addDef, updateDef, removeDef }: KpiDashboardProps) {
  const defs = data.kpi?.defs || [];
  const months = useMemo(() => {
    const keys = Object.keys(data.kpi?.progress || {});
    const cur = pdMonthKey(new Date());
    if (!keys.includes(cur)) keys.push(cur);
    return keys.sort().reverse();
  }, [data.kpi]);
  const [month, setMonth] = useState(months[0] || pdMonthKey(new Date()));
  const [team, setTeam] = useState<Team | "All">("All");
  const [staffF, setStaffF] = useState("All");
  const [taskF, setTaskF] = useState("All");
  const [manage, setManage] = useState(false);

  const getCur = (id: string): number => (data.kpi?.progress?.[month]?.[id] ?? 0);

  const staffRows: StaffRow[] = useMemo(() => KPI_STAFF.map((s) => {
    const kpis: KpiRow[] = defs.filter((d) => d.staffId === s.id).map((d) => {
      const current = getCur(d.id);
      const remaining = Math.max(d.target - current, 0);
      const p = d.target ? (current / d.target) * 100 : 0;
      return { id: d.id, task: d.task, target: d.target, current, remaining, pct: p, status: kpiStatus(p) };
    });
    const tTarget = sum(kpis.map((k) => k.target));
    const tCur = sum(kpis.map((k) => k.current));
    const p = tTarget ? (tCur / tTarget) * 100 : 0;
    return { ...s, kpis, tTarget, tCur, pct: p, status: kpiStatus(p) };
  }), [data.kpi, month]);

  const teamSum = (t: Team): TeamSum => {
    const st = staffRows.filter((s) => s.team === t);
    const tTarget = sum(st.map((s) => s.tTarget)), tCur = sum(st.map((s) => s.tCur));
    const p = tTarget ? (tCur / tTarget) * 100 : 0;
    return { tTarget, tCur, pct: p, status: kpiStatus(p) };
  };
  const intl = teamSum("International"), dom = teamSum("Domestic");
  const allTarget = intl.tTarget + dom.tTarget, allCur = intl.tCur + dom.tCur;
  const allPct = allTarget ? (allCur / allTarget) * 100 : 0;
  const allStatus = kpiStatus(allPct);
  const top = [...staffRows].filter((s) => s.tTarget > 0).sort((a, b) => b.pct - a.pct)[0];

  const staffOptions = KPI_STAFF.filter((s) => team === "All" || s.team === team);
  const taskOptions = [...new Set(defs.map((d) => d.task))].sort();

  let shown = staffRows;
  if (team !== "All") shown = shown.filter((s) => s.team === team);
  if (staffF !== "All") shown = shown.filter((s) => s.id === staffF);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Target size={20} color={C.ink} />
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>Monthly KPI Performance</h2>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Product Development Department · {pdMonthLabel(month)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <Btn sm kind={manage ? "teal" : "ghost"} icon={<Target size={13} />} onClick={() => setManage((m) => !m)}>{manage ? "Done managing" : "Manage tasks"}</Btn>}
          <label className="flex items-center gap-2">
            <CalendarCheck size={15} color={C.sub} />
            <select value={month} onChange={(e) => setMonth(e.target.value)} style={kpiSelect}>
              {months.map((m) => <option key={m} value={m}>{pdMonthLabel(m)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {manage && isAdmin && (
        <div style={{ ...card, padding: "10px 14px", borderColor: C.teal, background: C.tealSoft, fontSize: 12.5, color: C.ink }}>
          <b>Manage mode.</b> Add a KPI at the bottom of any staff card, edit a target inline, or remove a KPI with the trash icon. Changes save automatically. Staff always see this tab as view-only.
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        <div style={{ ...card, background: C.ink, borderColor: C.ink, padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 600 }}>Overall Team Progress</div>
          <div className="flex items-end gap-3 mt-2 mb-3">
            <span style={{ fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{Math.round(allPct)}%</span>
            <span className="mb-1.5 font-semibold inline-flex items-center gap-1.5" style={{ fontSize: 12.5, padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "#fff" }}>{allStatus.dot} {allStatus.txt}</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.14)", borderRadius: 999 }}>
            <div style={{ width: Math.min(allPct, 100) + "%", height: "100%", background: allStatus.c, borderRadius: 999 }} />
          </div>
          <div className="flex gap-5 mt-3" style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5 }}>
            <span>Target <b style={{ color: "#fff" }}>{allTarget}</b></span>
            <span>Done <b style={{ color: "#fff" }}>{allCur}</b></span>
            <span>Left <b style={{ color: "#fff" }}>{Math.max(allTarget - allCur, 0)}</b></span>
          </div>
        </div>

        <div style={{ ...card, padding: 18 }}>
          <div className="flex items-center gap-2" style={{ color: C.sub, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}><Sparkles size={14} color="#C79A16" /> Top Performer of the Month</div>
          {top ? (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center justify-center font-bold" style={{ width: 48, height: 48, borderRadius: 13, color: "#fff", background: teamColor(top.team), fontSize: 20 }}>{top.name[0]}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{top.name}</div>
                <div style={{ fontSize: 12.5, color: C.sub }}>{top.team} Team · {top.tCur}/{top.tTarget} done</div>
              </div>
              <div className="ml-auto text-right">
                <div style={{ fontSize: 28, fontWeight: 700, color: top.status.c, lineHeight: 1 }}>{Math.round(top.pct)}%</div>
                <div style={{ fontSize: 11, color: C.sub }}>{top.status.dot} {top.status.txt}</div>
              </div>
            </div>
          ) : <div style={{ fontSize: 13, color: C.sub, marginTop: 10 }}>No data yet.</div>}
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        {([["International", intl, <Globe size={17} />], ["Domestic", dom, <MapPin size={17} />]] as [Team, TeamSum, ReactNode][]).map(([name, s, icon]) => (
          <div key={name} style={{ ...card, padding: 16 }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2" style={{ color: teamColor(name), fontWeight: 700, fontSize: 15 }}>{icon} Team {name}</div>
              <Chip color={s.status.c} soft={s.status.soft}>{s.status.dot} {s.status.txt}</Chip>
            </div>
            <div className="flex items-end justify-between mb-2">
              <div className="flex gap-4">
                <div><div style={{ fontSize: 11, color: C.sub }}>Target</div><div style={{ fontSize: 18, fontWeight: 700 }}>{s.tTarget}</div></div>
                <div><div style={{ fontSize: 11, color: C.sub }}>Done</div><div style={{ fontSize: 18, fontWeight: 700 }}>{s.tCur}</div></div>
                <div><div style={{ fontSize: 11, color: C.sub }}>Left</div><div style={{ fontSize: 18, fontWeight: 700 }}>{Math.max(s.tTarget - s.tCur, 0)}</div></div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.status.c }}>{Math.round(s.pct)}%</div>
            </div>
            <div style={{ height: 9, background: C.paper, borderRadius: 999 }}>
              <div style={{ width: Math.min(s.pct, 100) + "%", height: "100%", background: s.status.c, borderRadius: 999, transition: "width .5s" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 16 }}>
        <div className="flex items-center gap-2 mb-3"><Gauge size={16} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 14 }}>KPI attainment by staff</span></div>
        {[...staffRows].sort((a, b) => b.pct - a.pct).map((s) => (
          <div key={s.id} className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5" style={{ fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: teamColor(s.team) }} />{s.name}
                <span style={{ fontSize: 11, color: C.sub }}>· {s.team}</span>
              </span>
              <span className="font-semibold" style={{ fontSize: 13, color: s.status.c }}>{Math.round(s.pct)}% {s.status.dot}</span>
            </div>
            <div style={{ height: 9, background: C.paper, borderRadius: 999 }}>
              <div style={{ width: Math.min(s.pct, 100) + "%", height: "100%", background: s.status.c, borderRadius: 999, transition: "width .5s" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 14 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold" style={{ fontSize: 12.5, color: C.sub }}><Filter size={14} /> Filter</span>
          <select value={team} onChange={(e) => { setTeam(e.target.value as Team | "All"); setStaffF("All"); }} style={kpiSelect}>
            <option value="All">All teams</option><option>International</option><option>Domestic</option>
          </select>
          <select value={staffF} onChange={(e) => setStaffF(e.target.value)} style={kpiSelect}>
            <option value="All">All staff</option>
            {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={taskF} onChange={(e) => setTaskF(e.target.value)} style={kpiSelect}>
            <option value="All">All tasks / KPIs</option>
            {taskOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {(team !== "All" || staffF !== "All" || taskF !== "All") &&
            <Btn sm kind="ghost" onClick={() => { setTeam("All"); setStaffF("All"); setTaskF("All"); }}>Reset</Btn>}
        </div>
      </div>

      {shown.map((s) => {
        const rows = taskF === "All" ? s.kpis : s.kpis.filter((k) => k.task === taskF);
        if (rows.length === 0 && !manage) return null;
        return (
          <div key={s.id} style={{ ...card, overflow: "hidden" }}>
            <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center font-bold" style={{ width: 34, height: 34, borderRadius: 10, color: "#fff", background: teamColor(s.team), fontSize: 15 }}>{s.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                  <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: C.sub }}>
                    {s.team === "Domestic" ? <MapPin size={11} /> : <Globe size={11} />}{s.team} Team
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 22, fontWeight: 700, color: s.status.c }}>{Math.round(s.pct)}%</span>
                <Chip color={s.status.c} soft={s.status.soft}>{s.status.dot} {s.status.txt}</Chip>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 660, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Task / KPI</th>
                    <th style={{ ...th, textAlign: "center" }}>Target</th>
                    <th style={{ ...th, textAlign: "center" }}>Current</th>
                    <th style={{ ...th, textAlign: "center" }}>Remaining</th>
                    <th style={{ ...th, width: 200 }}>Progress</th>
                    <th style={th}>Status</th>
                    {manage && isAdmin && <th style={{ ...th, textAlign: "center" }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => (
                    <tr key={k.id}>
                      <td style={{ ...td, fontWeight: 600 }}>{k.task}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        {manage && isAdmin ? (
                          <input type="number" min="1" value={k.target}
                            onChange={(e) => updateDef?.(k.id, { target: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            style={{ width: 54, textAlign: "center", border: `1px solid ${C.amber}`, borderRadius: 8, padding: "5px 6px", fontSize: 13, fontWeight: 700, color: C.text, outline: "none" }} />
                        ) : <span style={{ fontVariantNumeric: "tabular-nums" }}>{k.target}</span>}
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>
                        {isAdmin ? (
                          <input type="number" min="0" value={k.current}
                            onChange={(e) => setKpi(month, k.id, parseInt(e.target.value, 10))}
                            style={{ width: 58, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 6px", fontSize: 13, fontWeight: 700, color: C.text, outline: "none" }} />
                        ) : <span style={{ fontWeight: 700 }}>{k.current}</span>}
                      </td>
                      <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums", color: k.remaining === 0 ? C.teal : C.text, fontWeight: 600 }}>{k.remaining}</td>
                      <td style={td}>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 8, background: C.paper, borderRadius: 999, minWidth: 80 }}>
                            <div style={{ width: Math.min(k.pct, 100) + "%", height: "100%", background: k.status.c, borderRadius: 999, transition: "width .4s" }} />
                          </div>
                          <span className="font-semibold" style={{ fontSize: 12.5, color: k.status.c, width: 42, textAlign: "right" }}>{Math.round(k.pct)}%</span>
                        </div>
                      </td>
                      <td style={td}>
                        <span className="inline-flex items-center gap-1 font-semibold" style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 999, color: k.status.c, background: k.status.soft, whiteSpace: "nowrap" }}>{k.status.dot} {k.status.txt}</span>
                      </td>
                      {manage && isAdmin && (
                        <td style={{ ...td, textAlign: "center" }}>
                          <button onClick={() => removeDef?.(k.id)} title="Remove KPI" style={{ color: C.rose }}><Trash2 size={15} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td style={{ ...td, color: C.sub }} colSpan={manage && isAdmin ? 7 : 6}>No KPIs yet — add one below.</td></tr>}
                </tbody>
              </table>
            </div>
            {manage && isAdmin && <AddKpiRow staffId={s.id} onAdd={(sid, task, target) => addDef?.(sid, task, target)} />}
          </div>
        );
      })}
      {shown.length === 0 && <div style={{ ...card, padding: 18, color: C.sub, fontSize: 13.5 }}>No staff match the current filters.</div>}

      {!isAdmin && <div style={{ fontSize: 12, color: C.sub, textAlign: "center", paddingBottom: 4 }}>View only — KPIs and accomplishments are managed by the supervisor.</div>}
    </div>
  );
}
