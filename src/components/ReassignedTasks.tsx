import { ArrowRightLeft, Users } from "lucide-react";
import { C, card, catC } from "../lib/theme";
import { STATUS_META, PRIORITY_META, DEAD, DONEISH } from "../lib/constants";
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
   Reassignment now happens through collaborators, not through changing the
   assignee. Adding someone as a collaborator (see TaskDetail) *is* the
   handover — this view is a filtered look at every task that currently has
   at least one collaborator, across every collection. An agent sees tasks
   they've been added to help on, and their own tasks where they've looped
   someone else in. Once a task is finished, there's nothing left to follow
   up on, so it drops off this list. */
export function ReassignedTasks({ data, isAdmin, meId, openDetail }: ReassignedTasksProps) {
  const withCollabs = flattenRecords(data)
    .filter((t) => (t.collaboratorIds || []).length > 0 && !DONEISH(t.status));
  const scoped = isAdmin
    ? withCollabs
    : withCollabs.filter((t) => t.agentId === meId || (t.collaboratorIds || []).includes(meId || ""));
  const sorted = [...scoped].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1"><ArrowRightLeft size={20} color={C.ink} /><h2 style={{ fontSize: 19, fontWeight: 700 }}>Reassigned Tasks</h2></div>
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14 }}>
        {isAdmin ? "Tasks with collaborators added, across every tracker." : "Tasks you've been added to as a collaborator, and your own tasks where you've looped someone else in."}
      </div>
      <div className="space-y-2.5">
        {sorted.length === 0 && (
          <div style={{ ...card, padding: 18, color: C.sub, fontSize: 13.5 }}>
            No reassigned tasks{isAdmin ? "" : " involving you"} right now.
          </div>
        )}
        {sorted.map((t) => {
          const m = STATUS_META[t.status];
          const pm = PRIORITY_META[t.priority || "medium"];
          const ownerName = data.agents.find((a) => a.id === t.agentId)?.name || "Unassigned";
          const collabNames = (t.collaboratorIds || []).map((id) => data.agents.find((a) => a.id === id)?.name || "Unknown");
          const isCollabForMe = !isAdmin && (t.collaboratorIds || []).includes(meId || "");
          const isMineWithHelp = !isAdmin && t.agentId === meId;
          return (
            <div key={t.id} style={{ ...card, padding: 13, opacity: DEAD(t.status) ? 0.65 : 1 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ width: 9, height: 9, borderRadius: 3, background: catC(t.category, data.categories), flexShrink: 0 }} />
                <button onClick={() => openDetail(t._col || "tasks", t.id)} style={{ fontWeight: 600, fontSize: 14, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left" }}>{t.title}</button>
                <Chip color={pm.c} soft={pm.soft}>{pm.txt}</Chip>
                <Chip color={m.c} soft={m.soft}>{m.txt}</Chip>
                <span style={{ fontSize: 11, color: C.sub, textTransform: "capitalize" }}>{t._col}</span>
                {isCollabForMe && <Chip color={C.teal} soft={C.tealSoft}>You're helping on this</Chip>}
                {isMineWithHelp && <Chip color={C.sub} soft={C.paper}>You added help</Chip>}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 12.5, color: C.sub }}>
                <Users size={12} /> Owner: <b style={{ color: C.text }}>{ownerName}</b> · Collaborators: <b style={{ color: C.text }}>{collabNames.join(", ")}</b>
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>Updated {relTime(t.updatedAt || 0)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}