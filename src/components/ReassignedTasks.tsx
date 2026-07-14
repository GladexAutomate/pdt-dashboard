import { ArrowRightLeft, ListChecks } from "lucide-react";
import { C, card, catC } from "../lib/theme";
import { STATUS_META, PRIORITY_META, DEAD } from "../lib/constants";
import { activeDelegations, relTime } from "../lib/helpers";
import { Chip } from "./ui";
import type { AppData, ColKey } from "../lib/types";

interface ReassignedTasksProps {
  data: AppData;
  isAdmin: boolean;
  meId?: string;
  openDetail: (col: ColKey, id: string) => void;
}

/* ---------------- Reassigned Tasks ----------------
   A "reassignment" now happens by assigning a checklist item to someone —
   that spawns a brand-new, real ticket for them on the matching board (see
   the Checklist section in TaskDetail / addChecklistTask in App.tsx). This
   view is a filtered look at every one of those spawned tickets, across
   every collection: the assignee sees tickets delegated to them, and the
   person who delegated it can track its status too. Once the spawned
   ticket is finished, it drops off this list — there's nothing left to
   follow up on. */
export function ReassignedTasks({ data, isAdmin, meId, openDetail }: ReassignedTasksProps) {
  const delegations = activeDelegations(data);
  const scoped = isAdmin ? delegations : delegations.filter((d) => d.child.agentId === meId || d.parent.agentId === meId);
  const sorted = [...scoped].sort((a, b) => (b.child.updatedAt || 0) - (a.child.updatedAt || 0));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1"><ArrowRightLeft size={20} color={C.ink} /><h2 style={{ fontSize: 19, fontWeight: 700 }}>Reassigned Tasks</h2></div>
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14 }}>
        {isAdmin ? "Tickets spawned from a checklist assignment, across every tracker." : "Tickets assigned to you from someone's checklist, and ones you've assigned out from your own tasks."}
      </div>
      <div className="space-y-2.5">
        {sorted.length === 0 && (
          <div style={{ ...card, padding: 18, color: C.sub, fontSize: 13.5 }}>
            No delegated tasks{isAdmin ? "" : " involving you"} right now.
          </div>
        )}
        {sorted.map(({ parent, child }) => {
          const m = STATUS_META[child.status];
          const pm = PRIORITY_META[child.priority || "medium"];
          const assigneeName = data.agents.find((a) => a.id === child.agentId)?.name || "Unassigned";
          const isAssignedToMe = !isAdmin && child.agentId === meId;
          const isDelegatedByMe = !isAdmin && parent.agentId === meId;
          return (
            <div key={child.id} style={{ ...card, padding: 13, opacity: DEAD(child.status) ? 0.65 : 1 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ width: 9, height: 9, borderRadius: 3, background: catC(child.category, data.categories), flexShrink: 0 }} />
                <button onClick={() => openDetail(child._col || "tasks", child.id)} style={{ fontWeight: 600, fontSize: 14, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.text, textAlign: "left" }}>{child.title}</button>
                <Chip color={pm.c} soft={pm.soft}>{pm.txt}</Chip>
                <Chip color={m.c} soft={m.soft}>{m.txt}</Chip>
                <span style={{ fontSize: 11, color: C.sub, textTransform: "capitalize" }}>{child._col}</span>
                {isAssignedToMe && <Chip color={C.teal} soft={C.tealSoft}>Assigned to you</Chip>}
                {isDelegatedByMe && <Chip color={C.sub} soft={C.paper}>You assigned this</Chip>}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 12.5, color: C.sub }}>
                <ListChecks size={12} /> From checklist on{" "}
                <button onClick={() => openDetail(parent._col || "tasks", parent.id)} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: C.international, fontWeight: 600, fontSize: 12.5 }}>{parent.title}</button>
                {isAdmin && <> · Assigned to <b style={{ color: C.text }}>{assigneeName}</b></>}
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>Updated {relTime(child.updatedAt || 0)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
