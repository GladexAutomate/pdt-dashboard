import { supabase } from "./supabase";
import { COLLECTIONS } from "./constants";
import type {
  AppData, Agent, TaskRecord, LogEntry, KpiDef, ReportState, ColKey,
  Status, Priority, ProofItem, CommentEntry, ActivityEntry, LinkItem,
  ChecklistItem, Team, LoginResult, Category, Gender
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
  checklist: ChecklistItem[] | null;
  proof_count: number | null;
  comments: CommentEntry[] | null;
  activity: ActivityEntry[] | null;
  collaborator_ids: string[] | null;
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
    checklist: row.checklist ?? [],
    proofCount: row.proof_count ?? 0,
    comments: row.comments ?? [],
    activity: row.activity ?? [],
    collaboratorIds: row.collaborator_ids ?? [],
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
  if ("checklist" in patch) row.checklist = patch.checklist;
  if ("proofCount" in patch) row.proof_count = patch.proofCount;
  if ("comments" in patch) row.comments = patch.comments;
  if ("activity" in patch) row.activity = patch.activity;
  if ("collaboratorIds" in patch) row.collaborator_ids = patch.collaboratorIds;
  if ("assignedBy" in patch) row.assigned_by = patch.assignedBy;
  if ("completedBy" in patch) row.completed_by = patch.completedBy;
  if ("updatedAt" in patch) row.updated_at = toIso(patch.updatedAt);
  if ("updatedBy" in patch) row.updated_by = patch.updatedBy;
  return row;
}

// Every column except `proof` — proof items are base64 screenshots/files
// that can each be several MB, so pulling them for every record on every
// dashboard load doesn't scale. `proof_count` (already a separate column)
// covers every place that just needs the count; the full array is fetched
// on demand for one record at a time, see fetchRecordProof below.
const RECORD_COLUMNS_NO_PROOF = "id,collection,agent_id,title,category,department,destination,team,status,priority,progress,start_date,due_date,started_at,completed_at,estimated_hours,items_total,items_error,special,target,requirements,remarks,description,links,proof_count,comments,activity,collaborator_ids,assigned_by,completed_by,updated_at,updated_by,checklist";

/* ---------- full app data load ---------- */
export async function fetchAppData(): Promise<AppData> {
  const [agentsRes, recordsRes, logsRes, kpiDefsRes, kpiProgressRes, reportsRes, categoriesRes] = await Promise.all([
    supabase.from("agents_public").select("*").order("id"),
    supabase.from("records").select(RECORD_COLUMNS_NO_PROOF),
    supabase.from("logs").select("*").order("ts", { ascending: false }).limit(300),
    supabase.from("kpi_defs").select("*"),
    supabase.from("kpi_progress").select("*"),
    supabase.from("reports").select("*"),
    supabase.from("categories").select("*").order("id")
  ]);
  for (const res of [agentsRes, recordsRes, logsRes, kpiDefsRes, kpiProgressRes, reportsRes, categoriesRes]) {
    if (res.error) throw res.error;
  }

  const agents: Agent[] = (agentsRes.data || []).map((r) => ({ id: r.id, name: r.name, team: r.team, username: r.username, isAdmin: r.is_admin, isActive: r.is_active, gender: r.gender ?? undefined }));
  const categories: Category[] = (categoriesRes.data || []).map((r) => ({ id: r.id, name: r.name, color: r.color }));

  const byCol: Record<ColKey, TaskRecord[]> = { tasks: [], premium: [], gladex: [], tariff: [], daily: [] };
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

  return { agents, tasks: byCol.tasks, premium: byCol.premium, gladex: byCol.gladex, tariff: byCol.tariff, daily: byCol.daily, logs, kpi: { defs, progress }, reports, categories, seeded: true };
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
// fetched on demand when a single task's detail is opened — see the note on
// RECORD_COLUMNS_NO_PROOF above for why proof isn't part of the bulk load.
export async function fetchRecordProof(id: string): Promise<ProofItem[]> {
  const { data, error } = await supabase.from("records").select("proof").eq("id", id).single();
  if (error) throw error;
  return (data?.proof as ProofItem[] | null) ?? [];
}

/* ---- atomic append-only writes: two people on the same task (see
   collaborator_ids) can each add a comment/activity/proof/link at the same
   moment without one overwriting the other's whole-array replace. ---- */
export async function appendComment(id: string, comment: CommentEntry, updatedBy: string): Promise<void> {
  const { error } = await supabase.rpc("append_comment", { p_record_id: id, p_comment: comment, p_updated_by: updatedBy });
  if (error) throw error;
}
export async function appendActivity(id: string, entry: ActivityEntry, updatedBy: string): Promise<void> {
  const { error } = await supabase.rpc("append_activity", { p_record_id: id, p_entry: entry, p_updated_by: updatedBy });
  if (error) throw error;
}
export async function appendProof(id: string, item: ProofItem, updatedBy: string): Promise<void> {
  const { error } = await supabase.rpc("append_proof", { p_record_id: id, p_item: item, p_updated_by: updatedBy });
  if (error) throw error;
}
export async function appendLink(id: string, link: LinkItem, updatedBy: string): Promise<void> {
  const { error } = await supabase.rpc("append_link", { p_record_id: id, p_link: link, p_updated_by: updatedBy });
  if (error) throw error;
}
export async function appendChecklistItem(id: string, item: ChecklistItem, updatedBy: string): Promise<void> {
  const { error } = await supabase.rpc("append_checklist_item", { p_record_id: id, p_item: item, p_updated_by: updatedBy });
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

/* ---------- categories ---------- */
export async function insertCategoryRow(cat: Category): Promise<void> {
  const { error } = await supabase.from("categories").insert({ id: cat.id, name: cat.name, color: cat.color });
  if (error) throw error;
}
export async function updateCategoryRow(id: string, patch: { name?: string; color?: string }): Promise<void> {
  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteCategoryRow(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- auth & agents (user management) ----------
   All credential reads/writes go through RPCs (see supabase/schema.sql) —
   the client has no direct table access to `agents`/`admins` and never
   sees a password or password hash. */
export async function login(username: string, password: string): Promise<LoginResult | null> {
  const { data, error } = await supabase.rpc("login", { p_username: username, p_password: password });
  if (error) throw error;
  return (data as LoginResult | null) ?? null;
}

export interface CreateAgentInput {
  id: string;
  name: string;
  team: Team;
  username: string;
  password: string;
  gender?: Gender;
}
export async function createAgent(input: CreateAgentInput): Promise<void> {
  const { error } = await supabase.rpc("create_agent", {
    p_id: input.id, p_name: input.name, p_team: input.team, p_username: input.username, p_password: input.password, p_gender: input.gender ?? null
  });
  if (error) throw error;
}

export interface UpdateAgentInput {
  name?: string;
  team?: Team;
  username?: string;
  password?: string;
  gender?: Gender;
}
export async function updateAgentRow(id: string, patch: UpdateAgentInput): Promise<void> {
  const { error } = await supabase.rpc("update_agent", {
    p_id: id, p_name: patch.name ?? null, p_team: patch.team ?? null, p_username: patch.username ?? null, p_password: patch.password ?? null, p_gender: patch.gender ?? null
  });
  if (error) throw error;
}
export async function deleteAgentRow(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_agent", { p_id: id });
  if (error) throw error;
}

export interface UpdateAdminInput {
  currentPassword: string;
  name?: string;
  username?: string;
  password?: string;
}
export async function updateAdminRow(id: string, input: UpdateAdminInput): Promise<void> {
  const { error } = await supabase.rpc("update_admin", {
    p_id: id, p_current_password: input.currentPassword, p_name: input.name ?? null, p_username: input.username ?? null, p_new_password: input.password ?? null
  });
  if (error) throw error;
}
export async function setAgentAdmin(id: string, isAdmin: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_agent_admin", { p_id: id, p_is_admin: isAdmin });
  if (error) throw error;
}
export async function setAgentActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_agent_active", { p_id: id, p_is_active: isActive });
  if (error) throw error;
}

/* ---------- congrats-shown log ----------
   Inserting IS the claim — a unique (agent_id, date) row can only exist
   once, so if two browsers race for the same day only one insert succeeds.
   That's checked instead of a read-then-write, which would have a race. */
export async function claimCongrats(agentId: string, date: string): Promise<boolean> {
  const { error } = await supabase.from("congrats_log").insert({ agent_id: agentId, date });
  if (!error) return true;
  if (error.code === "23505") return false; // already claimed by this or another browser
  throw error;
}

export function subscribeToChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("pdt-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "records" }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
