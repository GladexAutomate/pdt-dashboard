import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, ScrollText, Target, Sparkles, Package, FileText, Gauge, Activity, CalendarCheck, UserCog, Tag, ArrowRightLeft
} from "lucide-react";

import { C } from "./lib/theme";
import { TRACKERS, DONEISH, H, STATUS_META } from "./lib/constants";
import { flattenRecords } from "./lib/helpers";
import { fetchAppData, insertRecord, updateRecordRow, deleteRecordRow, insertLog, upsertReport, insertKpiDefRow, updateKpiDefRow, deleteKpiDefRow, subscribeToChanges, createAgent, updateAgentRow, deleteAgentRow, updateAdminRow, insertCategoryRow, updateCategoryRow, deleteCategoryRow, setAgentAdmin, setAgentActive, appendComment, appendActivity, appendProof, appendLink, fetchRecordProof } from "./lib/api";
import type {
  AppData, TaskRecord, Status, Team, ColKey, LogEntry, ReportState, Session,
  LoginResult, DetailTarget, Agent, ActivityEntry, CommentEntry, KpiDef, Category, Priority, ProofItem, LinkItem
} from "./lib/types";
import { Login } from "./components/Login";
import { Shell } from "./components/Shell";
import { TravelBackdrop } from "./components/TravelBackdrop";
import { AdminAccount, type UpdateAdminInput } from "./components/AdminAccount";
import { AdminHome } from "./components/AdminHome";
import { Teams } from "./components/Teams";
import { MemberDetail, type CompletePayload } from "./components/MemberDetail";
import { TaskDetail } from "./components/TaskDetail";
import { TrackerView } from "./components/TrackerView";
import { MonthlyReport } from "./components/MonthlyReport";
import { Logs } from "./components/Logs";
import { KpiDashboard } from "./components/KpiDashboard";
import { DailyTasking } from "./components/DailyTasking";
import { UserManagement, type NewAgentInput, type UpdateAgentInput } from "./components/UserManagement";
import { CategoryManagement } from "./components/CategoryManagement";
import { ReassignedTasks } from "./components/ReassignedTasks";

type LogInput = Omit<LogEntry, "id" | "ts">;

/* ================================================================= */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminTab, setAdminTab] = useState("home");
  const [agentTab, setAgentTab] = useState("home");
  const [selTeam, setSelTeam] = useState<Team | null>(null);
  const [selAgent, setSelAgent] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchAppData();
        setData(d);
      } catch (e) {
        console.error("Failed to load data from Supabase", e);
        setLoadError(e instanceof Error ? e.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { fetchAppData().then(setData).catch((e) => console.error("Realtime refetch failed", e)); }, 600);
    };
    const unsubscribe = subscribeToChanges(refetch);
    return () => { if (timer) clearTimeout(timer); unsubscribe(); };
  }, [loading]);

  // proof (screenshots/files) is excluded from the bulk dashboard load — see
  // RECORD_COLUMNS_NO_PROOF in api.ts — so fetch it just for the one record
  // being viewed, only when its detail drawer is actually open.
  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    fetchRecordProof(detail.id).then((proof) => {
      if (cancelled) return;
      persistCol(detail.col, (l) => l.map((r) => (r.id === detail.id ? { ...r, proof } : r)));
    }).catch((e) => console.error("Failed to load proof", e));
    return () => { cancelled = true; };
  }, [detail?.col, detail?.id]);

  /* persist only ever touches local state now — every mutator below also
     fires the matching targeted Supabase write (fire-and-forget; errors are
     logged to the console rather than blocking the optimistic UI update). */
  const persist = (updater: (prev: AppData) => AppData) => {
    setData((prev) => (prev ? updater(prev) : prev));
  };
  const log = (entry: LogInput) => {
    const full: LogEntry = { id: "l" + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now(), ...entry };
    persist((d) => ({ ...d, logs: [full, ...d.logs].slice(0, 300) }));
    insertLog(full).catch((e) => console.error("Failed to save log", e));
  };

  const actor = () => ({ id: session?.agentId || "admin", name: session?.name || "—", role: session?.role || "admin" });
  const actId = () => "ac" + Date.now() + Math.random().toString(36).slice(2, 5);
  const persistCol = (col: ColKey, fn: (list: TaskRecord[]) => TaskRecord[]) => persist((d) => ({ ...d, [col]: fn(d[col] || []) }));

  /* runs the real Supabase write behind an optimistic update: on success, fires
     onSuccess (e.g. the activity log entry, which used to fire unconditionally
     even when the save itself failed); on failure, rolls the optimistic change
     back and surfaces the error instead of letting it vanish silently later. */
  const runMutation = (save: () => Promise<void>, rollback: () => void, onSuccess?: () => void) => {
    save().then(() => onSuccess?.()).catch((e: unknown) => {
      console.error("Save failed", e);
      rollback();
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong saving your change — it was not saved.";
      setToast(msg);
    });
  };

  /* ---- generalized record mutators (work on any collection) ---- */
  const addRec = (col: ColKey, r: Partial<TaskRecord>): string => {
    const id = (col === "tasks" ? "t" : col.slice(0, 2)) + Date.now();
    const now = Date.now();
    // some add-task forms (Daily Tasking, My Work's "Assign task") never set
    // team explicitly — back it from the assignee's roster team so it's
    // never silently blank, same as reassignRec already does on handover.
    const inferredTeam = data?.agents.find((a) => a.id === r.agentId)?.team || "";
    const full: TaskRecord = {
      id, agentId: null, title: "", status: "pending", startedAt: null, completedAt: null, itemsTotal: 0, itemsError: 0, startDate: null, dueDate: null,
      requirements: "", remarks: "", description: "", links: [], proof: [], proofCount: 0, priority: "medium", progress: 0,
      comments: [], activity: [], collaboratorIds: [], category: "", department: "", destination: "", team: inferredTeam,
      assignedBy: actor().name, completedBy: null, updatedAt: now, updatedBy: actor().name, ...r
    };
    persistCol(col, (list) => [...list, full]);
    runMutation(
      () => insertRecord(col, full),
      () => persistCol(col, (list) => list.filter((x) => x.id !== id)),
      () => log({ userId: actor().id, name: actor().name, role: actor().role, type: "create", detail: `Added "${r.title}"` })
    );
    return id;
  };
  const updateRec = (col: ColKey, id: string, patch: Partial<TaskRecord>) => {
    const prev = (data?.[col] || []).find((r) => r.id === id);
    const stamp = { updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((r) => (r.id === id ? { ...r, ...patch, ...stamp } : r)));
    runMutation(
      () => updateRecordRow(id, { ...patch, ...stamp }),
      () => { if (prev) persistCol(col, (l) => l.map((r) => (r.id === id ? prev : r))); }
    );
  };
  const setRecStatus = (col: ColKey, id: string, status: Status) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const patch: Partial<TaskRecord> = { status };
    if (DONEISH(status)) {
      patch.completedAt = t.completedAt ?? Date.now();
      patch.progress = 100;
      // preserve whoever actually finished it, same as completedAt above —
      // a later transition (e.g. Completed → Published by someone else,
      // often just a pipeline/approval step) shouldn't steal their credit.
      patch.completedBy = t.completedBy ?? actor().name;
      if (!t.startedAt) patch.startedAt = t.startDate || (Date.now() - (t.estimatedHours || 4) * H);
    }
    if (status === "in_progress" && !t.startedAt) patch.startedAt = Date.now();
    const entry: ActivityEntry = { id: actId(), type: "status", text: `Status → ${STATUS_META[status].txt}`, by: actor().name, role: actor().role, ts: Date.now(), status };
    const fullPatch: Partial<TaskRecord> = { ...patch, activity: [...(t.activity || []), entry], updatedAt: Date.now(), updatedBy: actor().name };

    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...fullPatch } : x)));
    runMutation(
      // scalar fields + the new activity entry are written separately so the
      // activity array append is always atomic server-side (see append_activity).
      () => updateRecordRow(id, patch).then(() => appendActivity(id, entry, actor().name)),
      () => persistCol(col, (l) => l.map((x) => (x.id === id ? t : x))),
      () => log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Set "${t.title}" → ${STATUS_META[status].txt}` })
    );
  };
  const reassignRec = (col: ColKey, id: string, newAgentId: string) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t || t.agentId === newAgentId) return;
    const from = data?.agents.find((a) => a.id === t.agentId)?.name || "Unassigned";
    const toA = data?.agents.find((a) => a.id === newAgentId);
    const entry: ActivityEntry = { id: actId(), type: "reassign", text: `Reassigned ${from} → ${toA?.name || "—"}`, by: actor().name, role: actor().role, ts: Date.now() };
    const patch: Partial<TaskRecord> = { agentId: newAgentId, team: toA?.team || t.team };
    const fullPatch: Partial<TaskRecord> = { ...patch, activity: [...(t.activity || []), entry], updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...fullPatch } : x)));
    runMutation(
      () => updateRecordRow(id, patch).then(() => appendActivity(id, entry, actor().name)),
      () => persistCol(col, (l) => l.map((x) => (x.id === id ? t : x))),
      () => log({ userId: actor().id, name: actor().name, role: actor().role, type: "reassign", detail: `Reassigned "${t.title}" → ${toA?.name || "—"}` })
    );
  };
  const addRecComment = (col: ColKey, id: string, text: string) => {
    if (!text || !text.trim()) return;
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const comment: CommentEntry = { id: "cm" + Date.now(), by: actor().name, role: actor().role, text: text.trim(), ts: Date.now() };
    const patch: Partial<TaskRecord> = { comments: [...(t.comments || []), comment], updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    runMutation(
      () => appendComment(id, comment, actor().name),
      () => persistCol(col, (l) => l.map((x) => (x.id === id ? t : x))),
      () => log({ userId: actor().id, name: actor().name, role: actor().role, type: "comment", detail: `Commented on "${t.title}"` })
    );
  };
  const pushRecActivity = (col: ColKey, id: string, type: string, text: string) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const entry: ActivityEntry = { id: actId(), type, text, by: actor().name, role: actor().role, ts: Date.now() };
    const patch: Partial<TaskRecord> = { activity: [...(t.activity || []), entry], updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    runMutation(
      () => appendActivity(id, entry, actor().name),
      () => persistCol(col, (l) => l.map((r) => (r.id === id ? t : r)))
    );
  };
  const addRecProof = (col: ColKey, id: string, item: ProofItem) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const patch: Partial<TaskRecord> = { proof: [...(t.proof || []), item], proofCount: (t.proof || []).length + 1, updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    runMutation(
      () => appendProof(id, item, actor().name),
      () => persistCol(col, (l) => l.map((x) => (x.id === id ? t : x)))
    );
  };
  const addRecLink = (col: ColKey, id: string, link: LinkItem) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const patch: Partial<TaskRecord> = { links: [...(t.links || []), link], updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    runMutation(
      () => appendLink(id, link, actor().name),
      () => persistCol(col, (l) => l.map((x) => (x.id === id ? t : x)))
    );
  };
  const createFollowUpTask = (col: ColKey, originalId: string, input: { title: string; category: string; priority: Priority; agentId: string; dueDate: number | null }) => {
    const original = (data?.[col] || []).find((t) => t.id === originalId);
    if (!original) return;
    const assignee = data?.agents.find((a) => a.id === input.agentId);
    const newId = addRec(col, {
      title: input.title, category: input.category, priority: input.priority, agentId: input.agentId,
      team: assignee?.team, dueDate: input.dueDate, status: "pending",
      description: `Follow-up to "${original.title}"${original.completedBy ? ` (originally completed by ${original.completedBy})` : ""}.`
    });
    pushRecActivity(col, originalId, "link", `Created follow-up task "${input.title}" for ${assignee?.name || "—"}`);
    setDetail({ col, id: newId });
  };
  const deleteRec = (col: ColKey, id: string) => {
    const prev = (data?.[col] || []).find((r) => r.id === id);
    persistCol(col, (l) => l.filter((r) => r.id !== id));
    runMutation(
      () => deleteRecordRow(id),
      () => { if (prev) persistCol(col, (l) => [...l, prev]); }
    );
  };

  /* ---- monthly report approval state ---- */
  const setReport = (key: string, patch: Partial<ReportState>) => {
    persist((d) => ({ ...d, reports: { ...(d.reports || {}), [key]: { ...(d.reports?.[key] || { status: "in_progress" }), ...patch } } }));
    upsertReport(key, patch).catch((e) => console.error("Failed to save report", e));
  };
  const submitReport = (key: string, who?: string) => { setReport(key, { status: "for_review", submittedAt: Date.now(), submittedBy: who }); log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Submitted monthly report ${key} for review` }); };
  const approveReport = (key: string) => { setReport(key, { status: "locked", approvedAt: Date.now(), approvedBy: actor().name }); log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Approved & locked report ${key}` }); };
  const reopenReport = (key: string) => { setReport(key, { status: "in_progress", approvedAt: null }); log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Reopened report ${key}` }); };

  /* ---- monthly KPI accomplishments ----
     "Current" is computed automatically from completed tickets (see
     kpiCurrentCount in helpers.ts) — only the KPI definitions (task/target)
     are ever written here. */
  const addKpiDef = (staffId: string, task: string, target: string) => {
    if (!task || !task.trim()) return;
    const id = "k" + Date.now() + Math.random().toString(36).slice(2, 5);
    const def: KpiDef = { id, staffId, task: task.trim(), target: Math.max(1, parseInt(target, 10) || 1) };
    persist((d) => ({ ...d, kpi: { ...d.kpi, defs: [...(d.kpi.defs || []), def] } }));
    insertKpiDefRow(def).catch((e) => console.error("Failed to add KPI", e));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "create", detail: `Added KPI "${task.trim()}"` });
  };
  const updateKpiDef = (id: string, patch: { target: number }) => {
    persist((d) => ({ ...d, kpi: { ...d.kpi, defs: (d.kpi.defs || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) } }));
    updateKpiDefRow(id, patch).catch((e) => console.error("Failed to update KPI", e));
  };
  const removeKpiDef = (id: string) => {
    persist((d) => {
      const defs = (d.kpi.defs || []).filter((x) => x.id !== id);
      const progress: Record<string, Record<string, number>> = {};
      Object.entries(d.kpi.progress || {}).forEach(([m, o]) => { progress[m] = { ...o }; delete progress[m][id]; });
      return { ...d, kpi: { ...d.kpi, defs, progress } };
    });
    deleteKpiDefRow(id).catch((e) => console.error("Failed to remove KPI", e));
  };

  /* ---- user management ----
     Uniqueness/validation happens inside the create_agent/update_agent
     Postgres functions (see supabase/schema.sql) — that's the single source
     of truth, so we just surface whatever error they raise. */
  const addAgent = async (input: NewAgentInput): Promise<string | null> => {
    const username = input.username.trim().toLowerCase();
    if (!input.name.trim() || !username || !input.password.trim()) return "Name, username, and password are required.";
    const id = "a" + Date.now() + Math.random().toString(36).slice(2, 5);
    try {
      await createAgent({ id, name: input.name.trim(), team: input.team, username, password: input.password.trim() });
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to add user.";
    }
    const agent: Agent = { id, name: input.name.trim(), team: input.team, username, isAdmin: false, isActive: true };
    persist((d) => ({ ...d, agents: [...d.agents, agent] }));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "create", detail: `Added user "${agent.name}"` });
    return null;
  };
  const updateAgent = async (id: string, patch: UpdateAgentInput): Promise<string | null> => {
    const clean: UpdateAgentInput = { ...patch };
    if (clean.username) clean.username = clean.username.trim().toLowerCase();
    try {
      await updateAgentRow(id, clean);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to update user.";
    }
    const { password: _password, ...displayPatch } = clean;
    persist((d) => ({ ...d, agents: d.agents.map((a) => (a.id === id ? { ...a, ...displayPatch } : a)) }));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Updated user "${clean.name || data?.agents.find((a) => a.id === id)?.name}"` });
    return null;
  };
  const removeAgent = async (id: string): Promise<string | null> => {
    const a = data?.agents.find((x) => x.id === id);
    try {
      await deleteAgentRow(id);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to remove user.";
    }
    persist((d) => ({ ...d, agents: d.agents.filter((x) => x.id !== id) }));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Removed user "${a?.name}"` });
    return null;
  };
  const updateAdmin = async (input: UpdateAdminInput): Promise<string | null> => {
    if (!session || session.role !== "admin") return "Not signed in as admin.";
    const clean: UpdateAdminInput = { ...input };
    if (clean.username) clean.username = clean.username.trim().toLowerCase();
    if (session.agentId) {
      // hybrid admin (an agent with is_admin=true) — there's no separate admins
      // row to update, so this edits their agent record directly via
      // update_agent, same path any admin uses to edit an agent (no
      // current-password check there, unlike the pure-admin path below).
      try {
        await updateAgentRow(session.agentId, { name: clean.name, username: clean.username, password: clean.password });
      } catch (e) {
        return e instanceof Error ? e.message : "Failed to update account.";
      }
      persist((d) => ({ ...d, agents: d.agents.map((a) => (a.id === session.agentId ? { ...a, name: clean.name || a.name, username: clean.username || a.username } : a)) }));
      setSession((s) => (s ? { ...s, name: clean.name || s.name, username: clean.username || s.username } : s));
      log({ userId: session.agentId, name: clean.name || session.name, role: "admin", type: "status", detail: "Updated own account" });
      return null;
    }
    if (!session.id) return "Not signed in as admin.";
    try {
      await updateAdminRow(session.id, clean);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to update account.";
    }
    setSession((s) => (s ? { ...s, name: clean.name || s.name, username: clean.username || s.username } : s));
    log({ userId: session.id, name: clean.name || session.name, role: "admin", type: "status", detail: "Updated own account" });
    return null;
  };
  const setAgentAdminFlag = async (id: string, isAdmin: boolean): Promise<string | null> => {
    const a = data?.agents.find((x) => x.id === id);
    try {
      await setAgentAdmin(id, isAdmin);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to update admin access.";
    }
    persist((d) => ({ ...d, agents: d.agents.map((x) => (x.id === id ? { ...x, isAdmin } : x)) }));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `${isAdmin ? "Granted" : "Revoked"} admin access for "${a?.name}"` });
    return null;
  };
  const setAgentActiveFlag = async (id: string, isActive: boolean): Promise<string | null> => {
    const a = data?.agents.find((x) => x.id === id);
    try {
      await setAgentActive(id, isActive);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to update account status.";
    }
    persist((d) => ({ ...d, agents: d.agents.map((x) => (x.id === id ? { ...x, isActive } : x)) }));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `${isActive ? "Reactivated" : "Marked as resigned"} "${a?.name}"` });
    return null;
  };

  /* ---- categories ---- */
  const addCategory = async (name: string, color: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return "Name is required.";
    if (data?.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return "That category already exists.";
    const cat: Category = { id: "cat" + Date.now(), name: trimmed, color };
    try {
      await insertCategoryRow(cat);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to add category.";
    }
    persist((d) => ({ ...d, categories: [...d.categories, cat] }));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "create", detail: `Added category "${trimmed}"` });
    return null;
  };
  const updateCategory = async (id: string, patch: { name?: string; color?: string }): Promise<string | null> => {
    const clean = { ...patch };
    if (clean.name != null) {
      clean.name = clean.name.trim();
      if (!clean.name) return "Name is required.";
      if (data?.categories.some((c) => c.id !== id && c.name.toLowerCase() === clean.name!.toLowerCase())) return "That category already exists.";
    }
    try {
      await updateCategoryRow(id, clean);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to update category.";
    }
    persist((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...clean } : c)) }));
    return null;
  };
  const removeCategory = async (id: string): Promise<string | null> => {
    const c = data?.categories.find((x) => x.id === id);
    try {
      await deleteCategoryRow(id);
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to remove category.";
    }
    persist((d) => ({ ...d, categories: d.categories.filter((x) => x.id !== id) }));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Removed category "${c?.name}"` });
    return null;
  };

  /* ---- task-specific wrappers (keep existing components working) ----
     Daily tasks are just addRec("daily", ...) etc. — see DailyTasking.tsx,
     which is wired up via trackerProps("daily") below like every other
     collection. */
  const updateTask = (id: string, patch: Partial<TaskRecord>) => updateRec("tasks", id, patch);
  const setStatus = (id: string, status: Status) => setRecStatus("tasks", id, status);
  const reassignTask = (id: string, n: string) => reassignRec("tasks", id, n);
  const completeRec = (col: ColKey, id: string, { hours, itemsTotal, itemsError, publish }: CompletePayload) => {
    const t = data?.[col]?.find((x) => x.id === id);
    const now = Date.now();
    const status: Status = publish ? "published" : "completed";
    const patch: Partial<TaskRecord> = { status, completedAt: now, completedBy: actor().name, progress: 100, startedAt: now - Math.max(hours, 0.05) * H, itemsTotal, itemsError, updatedAt: now, updatedBy: actor().name };
    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    runMutation(
      () => updateRecordRow(id, patch),
      () => { if (t) persistCol(col, (l) => l.map((x) => (x.id === id ? t : x))); },
      () => log({ userId: actor().id, name: actor().name, role: actor().role, type: publish ? "publish" : "complete", detail: `${publish ? "Published" : "Completed"} "${t?.title}"` })
    );
  };

  const doLogin = (result: LoginResult) => {
    // result.team is only set when the match came from `agents` — a hybrid
    // admin (is_admin=true) keeps their agentId instead of an admins-row id,
    // so "My Account" and any agent-aware logic can find their real record.
    const sess: Session = result.role === "admin"
      ? (result.team
          ? { role: "admin", agentId: result.id, name: result.name }
          : { role: "admin", id: result.id, username: result.username, name: result.name })
      : { role: "agent", agentId: result.id, name: result.name };
    setSession(sess); setAdminTab("home"); setAgentTab("home"); setSelTeam(null); setSelAgent(null);
    log({ userId: result.id, name: sess.name, role: sess.role, type: "login", detail: "Signed in" });
  };

  if (loading) return <div style={{ padding: 40, color: C.sub, fontFamily: "ui-sans-serif, system-ui" }}>Loading dashboard…</div>;
  if (loadError || !data) return <div style={{ padding: 40, color: C.rose, fontFamily: "ui-sans-serif, system-ui" }}>Couldn't load the dashboard: {loadError || "no data returned"}. Check your Supabase connection and try refreshing.</div>;

  const font = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const openTaskDetail = (id: string) => setDetail({ col: "tasks", id });
  const goToTracker = (col: ColKey) => {
    if (session?.role === "admin") setAdminTab(col); else setAgentTab(col);
    setDetail(null);
  };
  const trackerProps = (col: ColKey) => ({
    data, isAdmin: session?.role === "admin", meId: session?.agentId,
    addRec, updateRec, setRecStatus, reassignRec, deleteRec,
    openDetail: (id: string, recCol?: ColKey) => setDetail({ col: recCol || col, id })
  });
  const detailRec = detail ? (data[detail.col] || []).find((r) => r.id === detail.id) : null;
  const reassignedForMe = flattenRecords(data).filter((t) => !DONEISH(t.status) && (t.activity || []).some((a) => a.type === "reassign") && (session?.role === "admin" || t.agentId === session?.agentId)).length;
  const reportProps = {
    data, isAdmin: session?.role === "admin", meId: session?.agentId, actorName: session?.name,
    openAny: (col: ColKey, id: string) => setDetail({ col, id }), submitReport, approveReport, reopenReport
  };

  return (
    <div style={{
      fontFamily: font,
      color: C.text,
      minHeight: "100vh",
      width: "100%",
      position: "relative",
    }}>
      <TravelBackdrop />
      <div style={{ position: "relative", zIndex: 1 }}>
      {!session ? (
        <Login onLogin={doLogin} />
      ) : session.role === "admin" ? (
        <Shell session={session} onLogout={() => setSession(null)} onAccount={() => setShowAccount(true)}
          tabs={[["home", "Dashboard", <LayoutDashboard size={16} />], ["teams", "Teams", <Users size={16} />], ["daily", "Daily Tasking", <CalendarCheck size={16} />], ["reassigned", "Reassigned Tasks", <ArrowRightLeft size={16} />, reassignedForMe], ["users", "Users", <UserCog size={16} />], ["categories", "Categories", <Tag size={16} />], ["kpi", "KPI Targets", <Target size={16} />], ["premium", "PREMIUM", <Sparkles size={16} />], ["gladex", "GLADEX", <Package size={16} />], ["tariff", "Tariff", <FileText size={16} />], ["report", "Monthly Report", <Gauge size={16} />], ["logs", "Logs", <ScrollText size={16} />]]}
          active={adminTab} setActive={(t) => { setAdminTab(t); setSelTeam(null); setSelAgent(null); }}>
          {adminTab === "home" && <AdminHome data={data} go={(team) => { setAdminTab("teams"); setSelTeam(team as Team); }} />}
            {adminTab === "daily" && <DailyTasking {...trackerProps("daily")} isAdmin />}
          {adminTab === "reassigned" && <ReassignedTasks data={data} isAdmin meId={session?.agentId} openDetail={(col, id) => setDetail({ col, id })} />}
          {adminTab === "users" && <UserManagement data={data} addAgent={addAgent} updateAgent={updateAgent} removeAgent={removeAgent} setAgentAdmin={setAgentAdminFlag} setAgentActive={setAgentActiveFlag} />}
          {adminTab === "categories" && <CategoryManagement categories={data.categories} addCategory={addCategory} updateCategory={updateCategory} removeCategory={removeCategory} />}
          {adminTab === "kpi" && <KpiDashboard data={data} isAdmin addDef={addKpiDef} updateDef={updateKpiDef} removeDef={removeKpiDef} />}
          {adminTab === "logs" && <Logs logs={data.logs} />}
          {adminTab === "premium" && <TrackerView col="premium" config={TRACKERS.premium} {...trackerProps("premium")} />}
          {adminTab === "gladex" && <TrackerView col="gladex" config={TRACKERS.gladex} {...trackerProps("gladex")} />}
          {adminTab === "tariff" && <TrackerView col="tariff" config={TRACKERS.tariff} {...trackerProps("tariff")} />}
          {adminTab === "report" && <MonthlyReport {...reportProps} />}
          {adminTab === "teams" && (
            selAgent ? <MemberDetail agent={data.agents.find((a) => a.id === selAgent)!} data={data}
              onBack={() => setSelAgent(null)} addRec={addRec} completeRec={completeRec} deleteRec={deleteRec} setRecStatus={setRecStatus}
              openDetail={(col, id) => setDetail({ col, id })} isAdmin />
              : <Teams data={data} selTeam={selTeam} setSelTeam={setSelTeam} openMember={setSelAgent} setStatus={setStatus} updateTask={updateTask} reassignTask={reassignTask} openDetail={openTaskDetail} />
          )}
        </Shell>
      ) : (
        <Shell session={session} onLogout={() => setSession(null)}
          tabs={[["home", "My work", <LayoutDashboard size={16} />], ["daily", "Daily Tasking", <CalendarCheck size={16} />], ["reassigned", "Reassigned Tasks", <ArrowRightLeft size={16} />, reassignedForMe], ["kpi", "KPI Targets", <Target size={16} />], ["premium", "PREMIUM", <Sparkles size={16} />], ["gladex", "GLADEX", <Package size={16} />], ["tariff", "Tariff", <FileText size={16} />], ["report", "My Report", <Gauge size={16} />], ["activity", "Activity", <Activity size={16} />]]}
          active={agentTab} setActive={setAgentTab}>
          {agentTab === "home"
            ? <MemberDetail agent={data.agents.find((a) => a.id === session.agentId)!} data={data}
                completeRec={completeRec} setRecStatus={setRecStatus} openDetail={(col, id) => setDetail({ col, id })} isAdmin={false} selfView />
            : agentTab === "daily" ? <DailyTasking {...trackerProps("daily")} isAdmin={false} />
            : agentTab === "reassigned" ? <ReassignedTasks data={data} isAdmin={false} meId={session.agentId} openDetail={(col, id) => setDetail({ col, id })} />
            : agentTab === "kpi" ? <KpiDashboard data={data} isAdmin={false} />
            : agentTab === "premium" ? <TrackerView col="premium" config={TRACKERS.premium} {...trackerProps("premium")} />
            : agentTab === "gladex" ? <TrackerView col="gladex" config={TRACKERS.gladex} {...trackerProps("gladex")} />
            : agentTab === "tariff" ? <TrackerView col="tariff" config={TRACKERS.tariff} {...trackerProps("tariff")} />
            : agentTab === "report" ? <MonthlyReport {...reportProps} />
            : <Logs logs={data.logs.filter((l) => l.userId === session.agentId)} title="My access & activity log" />}
        </Shell>
      )}
      {session && detail && detailRec && (
        <TaskDetail
          task={detailRec} data={data} actor={actor()}
          isAdmin={session.role === "admin"}
          canEdit={session.role === "admin" || detailRec.agentId === session.agentId || (!!session.agentId && (detailRec.collaboratorIds || []).includes(session.agentId))}
          onClose={() => setDetail(null)}
          updateTask={(id, patch) => updateRec(detail.col, id, patch)}
          setStatus={(id, s) => setRecStatus(detail.col, id, s)}
          reassignTask={(id, n) => reassignRec(detail.col, id, n)}
          addComment={(id, text) => addRecComment(detail.col, id, text)}
          pushActivity={(id, ty, tx) => pushRecActivity(detail.col, id, ty, tx)}
          appendProof={(id, item) => addRecProof(detail.col, id, item)}
          appendLink={(id, link) => addRecLink(detail.col, id, link)}
          deleteTask={(id) => { deleteRec(detail.col, id); setDetail(null); }}
          createFollowUp={(input) => createFollowUpTask(detail.col, detailRec.id, input)}
          onGoToTracker={goToTracker} />
      )}
      {showAccount && session?.role === "admin" && (
        <AdminAccount session={session} onSave={updateAdmin} onClose={() => setShowAccount(false)} />
      )}
      {toast && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
          background: C.rose, color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: "90vw"
        }}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 15, lineHeight: 1, opacity: 0.85 }}>×</button>
        </div>
      )}
      </div>
    </div>
  );
}
