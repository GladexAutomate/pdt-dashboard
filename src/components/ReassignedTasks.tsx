import { ArrowRightLeft } from "lucide-react";
import { C, card, catC } from "../lib/theme";
import { STATUS_META, PRIORITY_META, DEAD } from "../lib/constants";
import { flattenRecords, relTime } from "../lib/helpers";
import { Chip } from "./ui";
import type { AppData, ColKey } from "../lib/types";

interface ReassignedTasksProps {
  data: AppData;
  isAdmin: boolean;
  meId?: string;
  openDetail: (col: ColKey, id: string) => void;
}

/* ---------------- Reassigned Tasks ----------------
   Reassignment is already tracked — every handoff logs an activity entry
   (see reassignRec in App.tsx). This is just a filtered view over that
   existing history, across every collection, so continuity is easy to spot
   without hunting through each tracker individually. */
export function ReassignedTasks({ data, isAdmin, meId, openDetail }: ReassignedTasksProps) {
  const withHandoffs = flattenRecords(data)
    .map((t) => ({ t, hops: (t.activity || []).filter((a) => a.type === "reassign") }))
    .filter((x) => x.hops.length > 0);
  const scoped = isAdmin ? withHandoffs : withHandoffs.filter((x) => x.t.agentId === meId);
  const sorted = [...scoped].sort((a, b) => b.hops[b.hops.length - 1].ts - a.hops[a.hops.length - 1].ts);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1"><ArrowRightLeft size={20} color={C.ink} /><h2 style={{ fontSize: 19, fontWeight: 700 }}>Reassigned Tasks</h2></div>
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14 }}>
        {isAdmin ? "Tasks handed from one person to another, across every tracker." : "Tasks that were handed to you to continue."}
      </div>
      <div className="space-y-2.5">
        {sorted.length === 0 && (
          <div style={{ ...card, padding: 18, color: C.sub, fontSize: 13.5 }}>
            No reassigned tasks{isAdmin ? "" : " assigned to you"} right now.
          </div>
        )}
        {sorted.map(({ t, hops }) => {
          const m = STATUS_META[t.status];
          const pm = PRIORITY_META[t.priority || "medium"];
          const agentName = data.agents.find((a) => a.id === t.agentId)?.name || "Unassigned";
          const latest = hops[hops.length - 1];
          return (
            <div key={t.id} style={{ ...card, padding: 13, opacity: DEAD(t.status) ? 0.65 : 1 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ width: 9, height: 9, borderRadius: 3, background: catC(t.category, data.categories), flexShrink: 0 }} />
                <button onClick={() => openDetail(t._col || "tasks", t.id)} style={{ fontWeight: 600, fontSize: 14, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left" }}>{t.title}</button>
                <Chip color={pm.c} soft={pm.soft}>{pm.txt}</Chip>
                <Chip color={m.c} soft={m.soft}>{m.txt}</Chip>
                <span style={{ fontSize: 11, color: C.sub, textTransform: "capitalize" }}>{t._col}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 12.5, color: C.sub }}>
                <ArrowRightLeft size={12} /> {latest.text} · {relTime(latest.ts)}
                {hops.length > 1 && <span> · +{hops.length - 1} earlier handoff{hops.length - 1 !== 1 ? "s" : ""}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>Now with <b style={{ color: C.text }}>{agentName}</b></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
