export type Team = "Domestic" | "International";

export type Status =
  | "pending" | "in_progress" | "for_review" | "revisions"
  | "on_hold" | "completed" | "published" | "canceled" | "removed";

export type Priority = "high" | "medium" | "low";

// "daily" is just another collection of TaskRecord, same as tasks/premium/gladex/tariff —
// this is what makes daily tasks automatically count in KPI/productivity math.
export type ColKey = "tasks" | "premium" | "gladex" | "tariff" | "daily";

export interface StyleMeta {
  txt: string;
  c: string;
  soft: string;
}

export interface KpiStatusMeta {
  txt: string;
  c: string;
  soft: string;
  dot: string;
}

// Note: no `password` field — the client never receives it. Agents are
// fetched via the password-free `agents_public` view (see src/lib/api.ts),
// and login/credential checks happen server-side via the `login` RPC.
export interface Agent {
  id: string;
  name: string;
  team: Team;
  username: string;
}

export interface CommentEntry {
  id: string;
  by: string;
  role: string;
  text: string;
  ts: number;
}

export interface ActivityEntry {
  id: string;
  type: string;
  text: string;
  by: string;
  role: string;
  ts: number;
  // populated only when type === "status" — lets UIs (e.g. Daily Tasking's
  // per-day timeline) color-code by the specific status reached without
  // parsing it back out of `text`.
  status?: Status;
}

export interface LinkItem {
  id: string;
  label: string;
  url: string;
}

export interface ProofItem {
  id: string;
  kind: "image" | "file" | "link";
  name: string;
  dataUrl?: string;
  url?: string;
  ts: number;
  by: string;
}

export interface TaskRecord {
  id: string;
  agentId: string | null;
  title: string;
  category?: string;
  department?: string;
  destination?: string;
  team?: string;
  status: Status;
  priority?: Priority;
  progress?: number;
  startDate?: number | null;
  dueDate?: number | null;
  startedAt?: number | null;
  completedAt?: number | null;
  estimatedHours?: number;
  itemsTotal?: number;
  itemsError?: number;
  special?: boolean;
  target?: string;
  requirements?: string;
  remarks?: string;
  description?: string;
  links?: LinkItem[];
  proof?: ProofItem[];
  proofCount?: number;
  comments?: CommentEntry[];
  activity?: ActivityEntry[];
  assignedBy?: string;
  completedBy?: string | null;
  updatedAt?: number;
  updatedBy?: string;
  // added only by flattenRecords() when building cross-collection reports
  _col?: ColKey;
  _isProject?: boolean;
}

export interface LogEntry {
  id: string;
  userId: string;
  name: string;
  role: string;
  type: string;
  detail: string;
  ts: number;
}

export interface KpiDef {
  id: string;
  staffId: string;
  task: string;
  target: number;
}

export interface KpiData {
  defs: KpiDef[];
  progress: Record<string, Record<string, number>>;
}

export interface ReportState {
  status: string;
  submittedAt?: number;
  submittedBy?: string;
  approvedAt?: number | null;
  approvedBy?: string;
}

export interface AppData {
  agents: Agent[];
  tasks: TaskRecord[];
  premium: TaskRecord[];
  gladex: TaskRecord[];
  tariff: TaskRecord[];
  daily: TaskRecord[];
  logs: LogEntry[];
  reports: Record<string, ReportState>;
  kpi: KpiData;
  seeded?: boolean;
}

export interface Session {
  role: "admin" | "agent";
  agentId?: string;
  id?: string; // admin row id (e.g. "admin") — lets the account panel target the right row
  username?: string;
  name: string;
}

export interface Actor {
  id: string;
  name: string;
  role: string;
}

export interface TrackerConfig {
  label: string;
  sub: string;
  titleLabel: string;
  columns: string[];
  addFields: string[];
}

export interface DetailTarget {
  col: ColKey;
  id: string;
}

// returned by the `login` RPC — see src/lib/api.ts
export interface LoginResult {
  role: "admin" | "agent";
  id: string;
  username: string;
  name: string;
  team?: Team;
}

export interface DueMeta {
  c: string;
  label: string;
  over: boolean;
}

export interface SpeedLabelMeta {
  txt: string;
  c: string;
}

export interface Band {
  txt: string;
  c: string;
}

export interface AgentStats {
  mine: TaskRecord[];
  active: TaskRecord[];
  completed: TaskRecord[];
  published: TaskRecord[];
  inprog: TaskRecord[];
  avgSpeed: number | null;
  accuracy: number | null;
  errorRate: number | null;
  productivity: number;
  totItems: number;
  totErr: number;
}

export interface GroupStats {
  count: number;
  completed: number;
  published: number;
  inprog: number;
  avgSpeed: number | null;
  accuracy: number | null;
  productivity: number;
}

export interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface StaffMonthStats {
  mine: TaskRecord[];
  completed: TaskRecord[];
  started: TaskRecord[];
  pending: TaskRecord[];
  overdue: TaskRecord[];
  high: TaskRecord[];
  onTime: TaskRecord[];
  delayed: TaskRecord[];
  projects: TaskRecord[];
  completedProjects: TaskRecord[];
  activeProjects: TaskRecord[];
  dests: string[];
  reassigned: number;
  assignedN: number;
  completedN: number;
  startedN: number;
  pendingN: number;
  overdueN: number;
  completionPct: number;
  onTimePct: number;
  productivity: number;
  kpi: number;
  avgTime: number | null;
  lastActivity: number | null;
}
