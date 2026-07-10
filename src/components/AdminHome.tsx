import { useMemo } from "react";
import { MapPin, Globe, ChevronRight, Package, Activity } from "lucide-react";
import { C, card, catC, teamColor } from "../lib/theme";
import { groupStats, speedLabel, pct, relTime, myWorkPool } from "../lib/helpers";
import { Chip, BoardTile } from "./ui";
import type { AppData, GroupStats } from "../lib/types";
import { DailyWidgets } from "./DailyWidgets";

/* ---------------- Admin Home (signature status board) ---------------- */
export function AdminHome({ data, go }: { data: AppData; go: (team: string) => void }) {
  const pool = useMemo(() => myWorkPool(data), [data]);
  const all = useMemo(() => groupStats(data.agents, pool), [data, pool]);
  const dom = useMemo(() => groupStats(data.agents.filter((a) => a.team === "Domestic"), pool), [data, pool]);
  const intl = useMemo(() => groupStats(data.agents.filter((a) => a.team === "International"), pool), [data, pool]);
  const byCat = data.categories.map((c) => {
    const ts = pool.filter((t) => t.category === c.name);
    return { cat: c.name, made: ts.filter((t) => t.status === "completed" || t.status === "published").length, published: ts.filter((t) => t.status === "published").length, total: ts.length };
  });
  const maxCat = Math.max(1, ...byCat.map((x) => x.total));
  const sp = speedLabel(all.avgSpeed);
  const activity = data.logs.filter((l) => l.type !== "login").slice(0, 6);

  return (
    <div className="space-y-4">
      <DailyWidgets data={data} />
      {/* status board */}
      <div style={{ ...card, background: C.ink, borderColor: C.ink, overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: 999, background: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 13, letterSpacing: 0.5 }}>TEAM PRODUCTIVITY · LIVE</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{data.agents.length} agents</span>
        </div>
        <div className="flex flex-wrap">
          <BoardTile label="Productivity rate" value={pct(all.productivity)} accent={C.gold} sub={`${all.completed}/${all.count} done`} />
          <BoardTile label="Packages made" value={all.completed} sub="completed" />
          <BoardTile label="Published" value={all.published} accent={C.teal} sub="live" />
          <BoardTile label="In progress" value={all.inprog} accent={C.amber} />
          <BoardTile label="Avg speed" value={sp.txt} accent={sp.c} sub={all.avgSpeed ? all.avgSpeed.toFixed(2) + "×" : ""} />
          <BoardTile label="Accuracy" value={pct(all.accuracy)} accent={C.teal} />
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        {/* team cards */}
        {([["Domestic", dom], ["International", intl]] as [string, GroupStats][]).map(([name, s]) => (
          <div key={name} style={{ ...card, padding: 16, cursor: "pointer" }} onClick={() => go(name)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {name === "Domestic" ? <MapPin size={17} color={teamColor(name)} /> : <Globe size={17} color={teamColor(name)} />}
                <span style={{ fontWeight: 700, fontSize: 15 }}>Team {name}</span>
              </div>
              <ChevronRight size={17} color={C.sub} />
            </div>
            <div className="flex gap-4 mb-3">
              <div><div style={{ fontSize: 22, fontWeight: 700 }}>{s.published}</div><div style={{ fontSize: 11, color: C.sub }}>Published</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700 }}>{pct(s.productivity)}</div><div style={{ fontSize: 11, color: C.sub }}>Productivity</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700 }}>{pct(s.accuracy)}</div><div style={{ fontSize: 11, color: C.sub }}>Accuracy</div></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.agents.filter((a) => a.team === name).map((a) => (
                <Chip key={a.id} color={teamColor(name)} soft={name === "Domestic" ? "#FBEAE4" : "#E7EDFB"}>{a.name}</Chip>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        {/* category breakdown */}
        <div style={{ ...card, padding: 16 }}>
          <div className="flex items-center gap-2 mb-3"><Package size={16} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 14 }}>Packages per category</span></div>
          {byCat.map((x) => (
            <div key={x.cat} className="mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5" style={{ fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: catC(x.cat, data.categories) }} />{x.cat}
                </span>
                <span style={{ fontSize: 12.5, color: C.sub }}><b style={{ color: C.text }}>{x.published}</b> published · {x.made} made</span>
              </div>
              <div className="flex gap-1" style={{ height: 9 }}>
                <div style={{ width: `${(x.published / maxCat) * 100}%`, background: catC(x.cat, data.categories), borderRadius: 999 }} />
                <div style={{ width: `${((x.made - x.published) / maxCat) * 100}%`, background: catC(x.cat, data.categories), opacity: 0.35, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
        {/* activity feed */}
        <div style={{ ...card, padding: 16 }}>
          <div className="flex items-center gap-2 mb-3"><Activity size={16} color={C.ink} /><span style={{ fontWeight: 700, fontSize: 14 }}>Recent activity</span></div>
          {activity.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>No task activity yet.</div>}
          <div className="space-y-2.5">
            {activity.map((l) => (
              <div key={l.id} className="flex items-start gap-2.5">
                <span style={{ marginTop: 3, width: 7, height: 7, borderRadius: 999, background: l.type === "publish" ? C.teal : l.type === "complete" ? C.amber : C.sub, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13 }}><b>{l.name}</b> {l.detail}</div>
                  <div style={{ fontSize: 11.5, color: C.sub }}>{relTime(l.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
