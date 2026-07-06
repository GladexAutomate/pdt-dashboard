import { CalendarCheck, Activity, Users } from "lucide-react";
import { C, card, teamColor } from "../lib/theme";
import type { AppData, Team } from "../lib/types";
import { todayKey, fmtDayLabel, fmtClock, buildDayTimeline, dailyDotColor, DAILY_DONE } from "../lib/daily";

/** "Today · Daily Tasking" widget block. Rendered near the top of AdminHome. */
export function DailyWidgets({ data }: { data: AppData }) {
  const tk = todayKey();
  const all = (data.daily || []).filter((d) => d.date === tk);
  const assigned = all.length;
  const completed = all.filter((d) => DAILY_DONE(d.status)).length;
  const inprog = all.filter((d) => d.status === "in_progress").length;
  const overdue = (data.daily || []).filter((d) => d.date < tk && !DAILY_DONE(d.status)).length;
  const prod = assigned ? Math.round((completed / assigned) * 100) : 0;
  const recent = buildDayTimeline(all).slice(-6).reverse();
  const teamSummary = (["Domestic", "International"] as Team[]).map((team) => {
    const ids = new Set(data.agents.filter((a) => a.team === team).map((a) => a.id));
    const ts = all.filter((d) => ids.has(d.agentId));
    return { team, done: ts.filter((d) => DAILY_DONE(d.status)).length, total: ts.length };
  });
  const tiles: [string, string | number, string][] = [
    ["Assigned today", assigned, C.text],
    ["Completed", completed, C.teal],
    ["In progress", inprog, C.amber],
    ["Overdue", overdue, overdue ? C.rose : C.sub],
    ["Daily productivity", prod + "%", C.gold]
  ];
  return (
    <div style={{ ...card, padding: 16 }}>
      <div className="flex items-center gap-2 mb-3">
        <CalendarCheck size={16} color={C.ink} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Today · Daily Tasking</span>
        <span style={{ fontSize: 12, color: C.sub }}>{fmtDayLabel(tk)}</span>
      </div>
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
        {tiles.map(([label, val, col]) => (
          <div key={label} style={{ background: C.paper, borderRadius: 11, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{val}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        <div>
          <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <Activity size={13} /> Recent activity
          </div>
          {recent.length === 0 && <div style={{ fontSize: 12.5, color: C.sub }}>No activity logged today.</div>}
          <div className="space-y-1.5">
            {recent.map((e, i) => (
              <div key={i} className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
                <span style={{ color: C.sub, fontVariantNumeric: "tabular-nums", minWidth: 62 }}>{fmtClock(e.ts)}</span>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: dailyDotColor(e.action), flexShrink: 0 }} />
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <Users size={13} /> Team completion
          </div>
          {teamSummary.map((t) => (
            <div key={t.team} className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5" style={{ fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: teamColor(t.team) }} />{t.team}
                </span>
                <span style={{ fontSize: 12.5, color: C.sub }}><b style={{ color: C.text }}>{t.done}</b> / {t.total} done</span>
              </div>
              <div style={{ height: 7, background: C.paper, borderRadius: 999 }}>
                <div style={{ width: (t.total ? (t.done / t.total) * 100 : 0) + "%", height: "100%", background: teamColor(t.team), borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}