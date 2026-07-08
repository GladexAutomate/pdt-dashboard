import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, ScrollText, Target, Sparkles, Package, FileText, Gauge, Activity, CalendarCheck, UserCog
} from "lucide-react";

import { C } from "./lib/theme";
import { TRACKERS, DONEISH, H, STATUS_META } from "./lib/constants";
import { fetchAppData, insertRecord, updateRecordRow, deleteRecordRow, insertLog, upsertReport, setKpiProgressRow, insertKpiDefRow, updateKpiDefRow, deleteKpiDefRow, subscribeToChanges, createAgent, updateAgentRow, deleteAgentRow } from "./lib/api";
import type {
  AppData, TaskRecord, Status, Team, ColKey, LogEntry, ReportState, Session,
  LoginResult, DetailTarget, Agent, ActivityEntry, CommentEntry, KpiDef
} from "./lib/types";
import { Login } from "./components/Login";
import { Shell } from "./components/Shell";
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

  /* ---- generalized record mutators (work on any collection) ---- */
  const addRec = (col: ColKey, r: Partial<TaskRecord>) => {
    const id = (col === "tasks" ? "t" : col.slice(0, 2)) + Date.now();
    const now = Date.now();
    const full: TaskRecord = {
      id, agentId: null, title: "", status: "pending", startedAt: null, completedAt: null, itemsTotal: 0, itemsError: 0, startDate: null, dueDate: null,
      requirements: "", remarks: "", description: "", links: [], proof: [], proofCount: 0, priority: "medium", progress: 0,
      comments: [], activity: [], category: "", department: "", destination: "", team: "",
      assignedBy: actor().name, completedBy: null, updatedAt: now, updatedBy: actor().name, ...r
    };
    persistCol(col, (list) => [...list, full]);
    insertRecord(col, full).catch((e) => console.error("Failed to save record", e));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "create", detail: `Added "${r.title}"` });
  };
  const updateRec = (col: ColKey, id: string, patch: Partial<TaskRecord>) => {
    const stamp = { updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((r) => (r.id === id ? { ...r, ...patch, ...stamp } : r)));
    updateRecordRow(id, { ...patch, ...stamp }).catch((e) => console.error("Failed to update record", e));
  };
  const setRecStatus = (col: ColKey, id: string, status: Status) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const patch: Partial<TaskRecord> = { status, updatedAt: Date.now(), updatedBy: actor().name };
    if (DONEISH(status)) {
      patch.completedAt = t.completedAt ?? Date.now();
      patch.progress = 100;
      patch.completedBy = actor().name;
      if (!t.startedAt) patch.startedAt = t.startDate || (Date.now() - (t.estimatedHours || 4) * H);
    }
    if (status === "in_progress" && !t.startedAt) patch.startedAt = Date.now();
    const entry: ActivityEntry = { id: actId(), type: "status", text: `Status → ${STATUS_META[status].txt}`, by: actor().name, role: actor().role, ts: Date.now(), status };
    patch.activity = [...(t.activity || []), entry];

    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    updateRecordRow(id, patch).catch((e) => console.error("Failed to update status", e));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Set "${t.title}" → ${STATUS_META[status].txt}` });
  };
  const reassignRec = (col: ColKey, id: string, newAgentId: string) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t || t.agentId === newAgentId) return;
    const from = data?.agents.find((a) => a.id === t.agentId)?.name || "Unassigned";
    const toA = data?.agents.find((a) => a.id === newAgentId);
    const entry: ActivityEntry = { id: actId(), type: "reassign", text: `Reassigned ${from} → ${toA?.name || "—"}`, by: actor().name, role: actor().role, ts: Date.now() };
    const patch: Partial<TaskRecord> = { agentId: newAgentId, team: toA?.team || t.team, activity: [...(t.activity || []), entry], updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    updateRecordRow(id, patch).catch((e) => console.error("Failed to reassign record", e));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "reassign", detail: `Reassigned "${t.title}" → ${toA?.name || "—"}` });
  };
  const addRecComment = (col: ColKey, id: string, text: string) => {
    if (!text || !text.trim()) return;
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const comment: CommentEntry = { id: "cm" + Date.now(), by: actor().name, role: actor().role, text: text.trim(), ts: Date.now() };
    const patch: Partial<TaskRecord> = { comments: [...(t.comments || []), comment], updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    updateRecordRow(id, patch).catch((e) => console.error("Failed to add comment", e));
    log({ userId: actor().id, name: actor().name, role: actor().role, type: "comment", detail: `Commented on "${t.title}"` });
  };
  const pushRecActivity = (col: ColKey, id: string, type: string, text: string) => {
    const t = (data?.[col] || []).find((x) => x.id === id);
    if (!t) return;
    const entry: ActivityEntry = { id: actId(), type, text, by: actor().name, role: actor().role, ts: Date.now() };
    const patch: Partial<TaskRecord> = { activity: [...(t.activity || []), entry], updatedAt: Date.now(), updatedBy: actor().name };
    persistCol(col, (l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    updateRecordRow(id, patch).catch((e) => console.error("Failed to push activity", e));
  };
  const deleteRec = (col: ColKey, id: string) => {
    persistCol(col, (l) => l.filter((r) => r.id !== id));
    deleteRecordRow(id).catch((e) => console.error("Failed to delete record", e));
  };

  /* ---- monthly report approval state ---- */
  const setReport = (key: string, patch: Partial<ReportState>) => {
    persist((d) => ({ ...d, reports: { ...(d.reports || {}), [key]: { ...(d.reports?.[key] || { status: "in_progress" }), ...patch } } }));
    upsertReport(key, patch).catch((e) => console.error("Failed to save report", e));
  };
  const submitReport = (key: string, who?: string) => { setReport(key, { status: "for_review", submittedAt: Date.now(), submittedBy: who }); log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Submitted monthly report ${key} for review` }); };
  const approveReport = (key: string) => { setReport(key, { status: "locked", approvedAt: Date.now(), approvedBy: actor().name }); log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Approved & locked report ${key}` }); };
  const reopenReport = (key: string) => { setReport(key, { status: "in_progress", approvedAt: null }); log({ userId: actor().id, name: actor().name, role: actor().role, type: "status", detail: `Reopened report ${key}` }); };

  /* ---- monthly KPI accomplishments ---- */
  const setKpiValue = (month: string, kkey: string, value: number) => {
    const v = Math.max(0, isNaN(value) ? 0 : value);
    persist((d) => {
      const prog = { ...(d.kpi?.progress || {}) };
      const m = { ...(prog[month] || {}) };
      m[kkey] = v; prog[month] = m;
      return { ...d, kpi: { ...(d.kpi || { defs: [] }), progress: prog } };
    });
    setKpiProgressRow(month, kkey, v).catch((e) => console.error("Failed to save KPI progress", e));
  };
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
    const agent: Agent = { id, name: input.name.trim(), team: input.team, username };
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

  /* ---- task-specific wrappers (keep existing components working) ----
     Daily tasks are just addRec("daily", ...) etc. — see DailyTasking.tsx,
     which is wired up via trackerProps("daily") below like every other
     collection. */
  const updateTask = (id: string, patch: Partial<TaskRecord>) => updateRec("tasks", id, patch);
  const setStatus = (id: string, status: Status) => setRecStatus("tasks", id, status);
  const reassignTask = (id: string, n: string) => reassignRec("tasks", id, n);
  const completeRec = (col: ColKey, id: string, { hours, itemsTotal, itemsError, publish }: CompletePayload) => {
    const now = Date.now();
    const status: Status = publish ? "published" : "completed";
    const patch: Partial<TaskRecord> = { status, completedAt: now, completedBy: actor().name, progress: 100, startedAt: now - Math.max(hours, 0.05) * H, itemsTotal, itemsError, updatedAt: now, updatedBy: actor().name };
    persistCol(col, (l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    updateRecordRow(id, patch).catch((e) => console.error("Failed to complete task", e));
    const t = data?.[col]?.find((x) => x.id === id);
    log({ userId: actor().id, name: actor().name, role: actor().role, type: publish ? "publish" : "complete", detail: `${publish ? "Published" : "Completed"} "${t?.title}"` });
  };

  const doLogin = (result: LoginResult) => {
    const sess: Session = result.role === "admin"
      ? { role: "admin", name: result.name }
      : { role: "agent", agentId: result.id, name: result.name };
    setSession(sess); setAdminTab("home"); setAgentTab("home"); setSelTeam(null); setSelAgent(null);
    log({ userId: result.role === "admin" ? "admin" : result.id, name: sess.name, role: sess.role, type: "login", detail: "Signed in" });
  };

  if (loading) return <div style={{ padding: 40, color: C.sub, fontFamily: "ui-sans-serif, system-ui" }}>Loading dashboard…</div>;
  if (loadError || !data) return <div style={{ padding: 40, color: C.rose, fontFamily: "ui-sans-serif, system-ui" }}>Couldn't load the dashboard: {loadError || "no data returned"}. Check your Supabase connection and try refreshing.</div>;

  const font = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const openTaskDetail = (id: string) => setDetail({ col: "tasks", id });
  const trackerProps = (col: ColKey) => ({
    data, isAdmin: session?.role === "admin", meId: session?.agentId,
    addRec, updateRec, setRecStatus, reassignRec, deleteRec,
    openDetail: (id: string) => setDetail({ col, id })
  });
  const detailRec = detail ? (data[detail.col] || []).find((r) => r.id === detail.id) : null;
  const reportProps = {
    data, isAdmin: session?.role === "admin", meId: session?.agentId, actorName: session?.name,
    openAny: (col: ColKey, id: string) => setDetail({ col, id }), submitReport, approveReport, reopenReport
  };

  return (
    <div style={{
      fontFamily: font,
      color: C.text,
      background: C.paper,
      minHeight: "100vh",
      width: "100%",
    }}>
      {!session ? (
        <Login onLogin={doLogin} />
      ) : session.role === "admin" ? (
        <Shell session={session} onLogout={() => setSession(null)}
          tabs={[["home", "Dashboard", <LayoutDashboard size={16} />], ["teams", "Teams", <Users size={16} />], ["daily", "Daily Tasking", <CalendarCheck size={16} />], ["users", "Users", <UserCog size={16} />], ["kpi", "KPI Targets", <Target size={16} />], ["premium", "PREMIUM", <Sparkles size={16} />], ["gladex", "GLADEX", <Package size={16} />], ["tariff", "Tariff", <FileText size={16} />], ["report", "Monthly Report", <Gauge size={16} />], ["logs", "Logs", <ScrollText size={16} />]]}
          active={adminTab} setActive={(t) => { setAdminTab(t); setSelTeam(null); setSelAgent(null); }}>
          {adminTab === "home" && <AdminHome data={data} go={(team) => { setAdminTab("teams"); setSelTeam(team as Team); }} />}
            {adminTab === "daily" && <DailyTasking {...trackerProps("daily")} isAdmin />}
          {adminTab === "users" && <UserManagement data={data} addAgent={addAgent} updateAgent={updateAgent} removeAgent={removeAgent} />}
          {adminTab === "kpi" && <KpiDashboard data={data} isAdmin setKpi={setKpiValue} addDef={addKpiDef} updateDef={updateKpiDef} removeDef={removeKpiDef} />}
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
          tabs={[["home", "My work", <LayoutDashboard size={16} />], ["daily", "Daily Tasking", <CalendarCheck size={16} />], ["kpi", "KPI Targets", <Target size={16} />], ["premium", "PREMIUM", <Sparkles size={16} />], ["gladex", "GLADEX", <Package size={16} />], ["tariff", "Tariff", <FileText size={16} />], ["report", "My Report", <Gauge size={16} />], ["activity", "Activity", <Activity size={16} />]]}
          active={agentTab} setActive={setAgentTab}>
          {agentTab === "home"
            ? <MemberDetail agent={data.agents.find((a) => a.id === session.agentId)!} data={data}
                completeRec={completeRec} setRecStatus={setRecStatus} openDetail={(col, id) => setDetail({ col, id })} isAdmin={false} selfView />
            : agentTab === "daily" ? <DailyTasking {...trackerProps("daily")} isAdmin={false} />
            : agentTab === "kpi" ? <KpiDashboard data={data} isAdmin={false} setKpi={setKpiValue} />
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
          canEdit={session.role === "admin" || detailRec.agentId === session.agentId}
          onClose={() => setDetail(null)}
          updateTask={(id, patch) => updateRec(detail.col, id, patch)}
          setStatus={(id, s) => setRecStatus(detail.col, id, s)}
          reassignTask={(id, n) => reassignRec(detail.col, id, n)}
          addComment={(id, text) => addRecComment(detail.col, id, text)}
          pushActivity={(id, ty, tx) => pushRecActivity(detail.col, id, ty, tx)}
          deleteTask={(id) => { deleteRec(detail.col, id); setDetail(null); }} />
      )}
    </div>
  );
}
