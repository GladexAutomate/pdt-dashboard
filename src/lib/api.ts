import { supabase } from "./supabase";
import { COLLECTIONS } from "./constants";
import type {
  AppData, Agent, TaskRecord, LogEntry, KpiDef, ReportState, ColKey,
  Status, Priority, ProofItem, CommentEntry, ActivityEntry, LinkItem,
  DailyTask, DailyEvent, DailyStatus
} from "./types";

/* ---------- timestamp helpers (DB uses ISO strings, the app uses epoch ms) ---------- */
const toIso = (ms: number | null | undefined): string | null => (ms == null ? null : new Date(ms).toISOString());
const toMs = (iso: string | null | undefined): number | null => (iso == null ? null : new Date(iso).getTime());

/* ---------- records: DB row <-> TaskRecord ---------- */
interface RecordRow {
  id: string;
  collection: ColKey;
  agent_id: string | null;
  title: string;
  category: string | null;
  department: string | null;
  destination: string | null;
  team: string | null;
  status: string;
  priority: string | null;
  progress: number | null;
  start_date: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  items_total: number | null;
  items_error: number | null;
  special: boolean | null;
  target: string | null;
  requirements: string | null;
  remarks: string | null;
  description: string | null;
  links: LinkItem[] | null;
  proof: ProofItem[] | null;
  proof_count: number | null;
  comments: CommentEntry[] | null;
  activity: ActivityEntry[] | null;
  assigned_by: string | null;
  completed_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

function rowToRecord(row: RecordRow): TaskRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    category: row.category ?? undefined,
    department: row.department ?? undefined,
    destination: row.destination ?? undefined,
    team: row.team ?? undefined,
    status: row.status as Status,
    priority: (row.priority as Priority | null) ?? undefined,
    progress: row.progress ?? 0,
    startDate: toMs(row.start_date),
    dueDate: toMs(row.due_date),
    startedAt: toMs(row.started_at),
    completedAt: toMs(row.completed_at),
    estimatedHours: row.estimated_hours ?? undefined,
    itemsTotal: row.items_total ?? 0,
    itemsError: row.items_error ?? 0,
    special: row.special ?? false,
    target: row.target ?? undefined,
    requirements: row.requirements ?? undefined,
    remarks: row.remarks ?? undefined,
    description: row.description ?? undefined,
    links: row.links ?? [],
    proof: row.proof ?? [],
    proofCount: row.proof_count ?? 0,
    comments: row.comments ?? [],
    activity: row.activity ?? [],
    assignedBy: row.assigned_by ?? undefined,
    completedBy: row.completed_by,
    updatedAt: toMs(row.updated_at) ?? undefined,
    updatedBy: row.updated_by ?? undefined
  };
}

/** Only serializes keys actually present on `patch`, so partial updates only touch the columns that changed. */
function recordPatchToRow(patch: Partial<TaskRecord>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("agentId" in patch) row.agent_id = patch.agentId;
  if ("title" in patch) row.title = patch.title;
  if ("category" in patch) row.category = patch.category;
  if ("department" in patch) row.department = patch.department;
  if ("destination" in patch) row.destination = patch.destination;
  if ("team" in patch) row.team = patch.team;
  if ("status" in patch) row.status = patch.status;
  if ("priority" in patch) row.priority = patch.priority;
  if ("progress" in patch) row.progress = patch.progress;
  if ("startDate" in patch) row.start_date = toIso(patch.startDate);
  if ("dueDate" in patch) row.due_date = toIso(patch.dueDate);
  if ("startedAt" in patch) row.started_at = toIso(patch.startedAt);
  if ("completedAt" in patch) row.completed_at = toIso(patch.completedAt);
  if ("estimatedHours" in patch) row.estimated_hours = patch.estimatedHours;
  if ("itemsTotal" in patch) row.items_total = patch.itemsTotal;
  if ("itemsError" in patch) row.items_error = patch.itemsError;
  if ("special" in patch) row.special = patch.special;
  if ("target" in patch) row.target = patch.target;
  if ("requirements" in patch) row.requirements = patch.requirements;
  if ("remarks" in patch) row.remarks = patch.remarks;
  if ("description" in patch) row.description = patch.description;
  if ("links" in patch) row.links = patch.links;
  if ("proof" in patch) row.proof = patch.proof;
  if ("proofCount" in patch) row.proof_count = patch.proofCount;
  if ("comments" in patch) row.comments = patch.comments;
  if ("activity" in patch) row.activity = patch.activity;
  if ("assignedBy" in patch) row.assigned_by = patch.assignedBy;
  if ("completedBy" in patch) row.completed_by = patch.completedBy;
  if ("updatedAt" in patch) row.updated_at = toIso(patch.updatedAt);
  if ("updatedBy" in patch) row.updated_by = patch.updatedBy;
  return row;
}

interface DailyRow {
  id: string;
  agent_id: string | null;
  title: string;
  date: string;
  status: string;
  assigned_by: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  timeline: DailyEvent[] | null;
}
function rowToDaily(r: DailyRow): DailyTask {
  return {
    id: r.id,
    agentId: r.agent_id ?? "",
    title: r.title,
    date: r.date,
    status: r.status as DailyStatus,
    assignedBy: r.assigned_by ?? "—",
    assignedAt: toMs(r.assigned_at) ?? Date.now(),
    startedAt: toMs(r.started_at),
    completedAt: toMs(r.completed_at),
    timeline: r.timeline ?? []
  };
}
function dailyPatchToRow(patch: Partial<DailyTask>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("agentId" in patch) row.agent_id = patch.agentId;
  if ("title" in patch) row.title = patch.title;
  if ("date" in patch) row.date = patch.date;
  if ("status" in patch) row.status = patch.status;
  if ("assignedBy" in patch) row.assigned_by = patch.assignedBy;
  if ("assignedAt" in patch) row.assigned_at = toIso(patch.assignedAt);
  if ("startedAt" in patch) row.started_at = toIso(patch.startedAt);
  if ("completedAt" in patch) row.completed_at = toIso(patch.completedAt);
  if ("timeline" in patch) row.timeline = patch.timeline;
  return row;
}

/* ---------- full app data load ---------- */
export async function fetchAppData(): Promise<AppData> {
  const [agentsRes, adminRes, recordsRes, logsRes, kpiDefsRes, kpiProgressRes, reportsRes, dailyRes] = await Promise.all([
    supabase.from("agents").select("*").order("id"),
    supabase.from("admins").select("*").limit(1).maybeSingle(),
    supabase.from("records").select("*"),
    supabase.from("logs").select("*").order("ts", { ascending: false }).limit(300),
    supabase.from("kpi_defs").select("*"),
    supabase.from("kpi_progress").select("*"),
    supabase.from("reports").select("*"),
    supabase.from("daily_tasks").select("*")
  ]);
  for (const res of [agentsRes, adminRes, recordsRes, logsRes, kpiDefsRes, kpiProgressRes, reportsRes, dailyRes]) {
    if (res.error) throw res.error;
  }

  const agents: Agent[] = (agentsRes.data || []).map((r) => ({ id: r.id, name: r.name, team: r.team, username: r.username, password: r.password }));
  const admin = adminRes.data
    ? { username: adminRes.data.username, password: adminRes.data.password, name: adminRes.data.name }
    : { username: "admin", password: "", name: "Supervisor / Manager" };

  const byCol: Record<ColKey, TaskRecord[]> = { tasks: [], premium: [], gladex: [], tariff: [] };
  (recordsRes.data as RecordRow[] || []).forEach((row) => { byCol[row.collection].push(rowToRecord(row)); });
  // keep the same stable order the rest of the app expects (insertion order isn't guaranteed by the DB)
  for (const col of COLLECTIONS) byCol[col].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const logs: LogEntry[] = (logsRes.data || []).map((r) => ({ id: r.id, userId: r.user_id, name: r.name, role: r.role, type: r.type, detail: r.detail, ts: toMs(r.ts) ?? Date.now() }));

  const defs: KpiDef[] = (kpiDefsRes.data || []).map((r) => ({ id: r.id, staffId: r.staff_id, task: r.task, target: r.target }));
  const progress: Record<string, Record<string, number>> = {};
  (kpiProgressRes.data || []).forEach((r) => { (progress[r.month] ||= {})[r.def_id] = r.current; });

  const reports: Record<string, ReportState> = {};
  (reportsRes.data || []).forEach((r) => {
    reports[r.report_key] = {
      status: r.status,
      submittedAt: toMs(r.submitted_at) ?? undefined,
      submittedBy: r.submitted_by ?? undefined,
      approvedAt: toMs(r.approved_at),
      approvedBy: r.approved_by ?? undefined
    };
  });

  const daily: DailyTask[] = (dailyRes.data as DailyRow[] || []).map(rowToDaily).sort((a, b) => a.assignedAt - b.assignedAt);

  return { agents, admin, tasks: byCol.tasks, premium: byCol.premium, gladex: byCol.gladex, tariff: byCol.tariff, daily, logs, kpi: { defs, progress }, reports, seeded: true };
}

/* ---------- records ---------- */
export async function insertRecord(col: ColKey, r: TaskRecord): Promise<void> {
  const row = { id: r.id, collection: col, ...recordPatchToRow(r) };
  const { error } = await supabase.from("records").insert(row);
  if (error) throw error;
}
export async function updateRecordRow(id: string, patch: Partial<TaskRecord>): Promise<void> {
  const row = recordPatchToRow(patch);
  const { error } = await supabase.from("records").update(row).eq("id", id);
  if (error) throw error;
}
export async function deleteRecordRow(id: string): Promise<void> {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- logs ---------- */
export async function insertLog(entry: LogEntry): Promise<void> {
  const { error } = await supabase.from("logs").insert({
    id: entry.id, user_id: entry.userId, name: entry.name, role: entry.role,
    type: entry.type, detail: entry.detail, ts: toIso(entry.ts)
  });
  if (error) throw error;
}

/* ---------- reports ---------- */
export async function upsertReport(key: string, patch: Partial<ReportState>): Promise<void> {
  const row: Record<string, unknown> = { report_key: key };
  if ("status" in patch) row.status = patch.status;
  if ("submittedAt" in patch) row.submitted_at = toIso(patch.submittedAt);
  if ("submittedBy" in patch) row.submitted_by = patch.submittedBy;
  if ("approvedAt" in patch) row.approved_at = toIso(patch.approvedAt);
  if ("approvedBy" in patch) row.approved_by = patch.approvedBy;
  const { error } = await supabase.from("reports").upsert(row, { onConflict: "report_key" });
  if (error) throw error;
}

/* ---------- KPI ---------- */
export async function setKpiProgressRow(month: string, defId: string, value: number): Promise<void> {
  const { error } = await supabase.from("kpi_progress").upsert({ month, def_id: defId, current: value }, { onConflict: "month,def_id" });
  if (error) throw error;
}
export async function insertKpiDefRow(def: KpiDef): Promise<void> {
  const { error } = await supabase.from("kpi_defs").insert({ id: def.id, staff_id: def.staffId, task: def.task, target: def.target });
  if (error) throw error;
}
export async function updateKpiDefRow(id: string, patch: { target: number }): Promise<void> {
  const { error } = await supabase.from("kpi_defs").update({ target: patch.target }).eq("id", id);
  if (error) throw error;
}
export async function deleteKpiDefRow(id: string): Promise<void> {
  const { error } = await supabase.from("kpi_defs").delete().eq("id", id);
  if (error) throw error;
}
export async function insertDailyRow(d: DailyTask): Promise<void> {
  const row = { id: d.id, ...dailyPatchToRow(d) };
  const { error } = await supabase.from("daily_tasks").insert(row);
  if (error) throw error;
}
export async function updateDailyRow(id: string, patch: Partial<DailyTask>): Promise<void> {
  const { error } = await supabase.from("daily_tasks").update(dailyPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}
export async function deleteDailyRow(id: string): Promise<void> {
  const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
  if (error) throw error;
}
/* ---------- agents (user management) ---------- */
export async function insertAgentRow(agent: Agent): Promise<void> {
  const { error } = await supabase.from("agents").insert({ id: agent.id, name: agent.name, team: agent.team, username: agent.username, password: agent.password });
  if (error) throw error;
}
export async function updateAgentRow(id: string, patch: Partial<Agent>): Promise<void> {
  const row: Record<string, unknown> = {};
  if ("name" in patch) row.name = patch.name;
  if ("team" in patch) row.team = patch.team;
  if ("username" in patch) row.username = patch.username;
  if ("password" in patch) row.password = patch.password;
  const { error } = await supabase.from("agents").update(row).eq("id", id);
  if (error) throw error;
}
export async function deleteAgentRow(id: string): Promise<void> {
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw error;
}

export function subscribeToChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("pdt-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "records" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "daily_tasks" }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
