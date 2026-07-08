import { C } from "./theme";
import type { Team, Status, Priority, StyleMeta, TrackerConfig, ColKey } from "./types";

/* ----------------------------------------------------------------
   Product Development Team — Work Dashboard
   Roles: admin (supervisor/manager) + agents
   Teams: Domestic (Ann, Jess, Roselle) / International (Ange, Axel, Pat, Krisha)
   ---------------------------------------------------------------- */

export const CATEGORIES = ["BOT", "Website", "Lakbayhub", "Land arrangement", "Collectives"];
export const DEPARTMENTS = ["Product Dev", "Operations", "Marketing", "Tech", "Sales", "Finance"];
export const DESTINATIONS = ["Boracay", "Cebu", "Palawan", "Tokyo", "Bangkok", "Singapore", "Bali", "Seoul", "El Nido"];
export const COLLECTIONS: ColKey[] = ["tasks", "premium", "gladex", "tariff", "daily"];
export const PROJECT_COLS: ColKey[] = ["premium", "gladex", "tariff"];

export interface KpiStaffEntry {
  id: string;
  name: string;
  team: Team;
  agentId: string;
}
export interface KpiDefSeed {
  staffId: string;
  task: string;
  target: number;
  seed: number;
}

/* ---------- Monthly KPI targets ---------- */
export const KPI_STAFF: KpiStaffEntry[] = [
  { id: "angelee", name: "Angelee", team: "International", agentId: "a4" },
  { id: "patty", name: "Patty", team: "International", agentId: "a6" },
  { id: "krisha", name: "Krisha", team: "International", agentId: "a7" },
  { id: "celine", name: "Celine", team: "International", agentId: "a8" },
  { id: "roselle", name: "Roselle", team: "Domestic", agentId: "a3" },
  { id: "jessy", name: "Jessy", team: "Domestic", agentId: "a2" },
  { id: "anne", name: "Anne", team: "Domestic", agentId: "a1" }
];
// def: { staffId, task, target, seed }  (seed = current-month starting accomplishment for demo)
export const KPI_DEFS: KpiDefSeed[] = [
  { staffId: "angelee", task: "Land Arrangement Destinations", target: 4, seed: 3 },
  { staffId: "angelee", task: "New Packages", target: 4, seed: 4 },
  { staffId: "angelee", task: "New Optional Tours", target: 8, seed: 6 },
  { staffId: "angelee", task: "New Operators", target: 4, seed: 2 },
  { staffId: "angelee", task: "Tariff Updates", target: 25, seed: 20 },
  { staffId: "patty", task: "New Collective Destinations", target: 15, seed: 12 },
  { staffId: "patty", task: "New Promos & FAM Tours", target: 5, seed: 3 },
  { staffId: "patty", task: "New Operators", target: 3, seed: 3 },
  { staffId: "krisha", task: "New Collective Destinations", target: 15, seed: 15 },
  { staffId: "krisha", task: "Tariff Uploads", target: 25, seed: 18 },
  { staffId: "krisha", task: "New Operators", target: 3, seed: 2 },
  { staffId: "celine", task: "Botcake Updates", target: 50, seed: 45 },
  { staffId: "celine", task: "LBH Package Rate Updates", target: 25, seed: 25 },
  { staffId: "roselle", task: "New Destinations", target: 2, seed: 2 },
  { staffId: "roselle", task: "New Packages", target: 4, seed: 3 },
  { staffId: "roselle", task: "New Optional Tours", target: 4, seed: 4 },
  { staffId: "roselle", task: "New Operators", target: 2, seed: 1 },
  { staffId: "jessy", task: "Botcake New Packages", target: 9, seed: 8 },
  { staffId: "jessy", task: "OTA New Packages", target: 9, seed: 9 },
  { staffId: "jessy", task: "LBH Package Updates", target: 10, seed: 7 },
  { staffId: "anne", task: "Website Updates", target: 10, seed: 10 },
  { staffId: "anne", task: "Botcake Updates", target: 50, seed: 30 },
  { staffId: "anne", task: "LBH Updates", target: 5, seed: 4 }
];

export const H = 3600000, D = 86400000, KEY = "pdt:appdata";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const REPORT_FLOW: Record<string, StyleMeta> = {
  in_progress: { txt: "In progress", c: C.sub, soft: C.paper },
  for_review: { txt: "For review", c: C.international, soft: "#E7EDFB" },
  approved: { txt: "Approved", c: C.teal, soft: C.tealSoft },
  locked: { txt: "Locked", c: C.ink2, soft: "#E7EBF3" }
};

export const STATUSES: Status[] = ["pending", "in_progress", "for_review", "revisions", "on_hold", "completed", "published", "canceled", "removed"];
export const STATUS_META: Record<Status, StyleMeta> = {
  pending: { txt: "Not Started", c: C.sub, soft: C.paper },
  in_progress: { txt: "In Progress", c: C.amber, soft: C.amberSoft },
  for_review: { txt: "For Review", c: C.international, soft: "#E7EDFB" },
  revisions: { txt: "Revisions", c: "#7C5CE0", soft: "#EFEAFB" },
  on_hold: { txt: "On Hold", c: "#8A6D3B", soft: "#F2ECDD" },
  completed: { txt: "Completed", c: C.ink2, soft: "#E7EBF3" },
  published: { txt: "Published", c: C.teal, soft: C.tealSoft },
  canceled: { txt: "Canceled", c: C.rose, soft: C.roseSoft },
  removed: { txt: "Removed", c: "#9AA3B5", soft: C.paper }
};
export const STATUS_ORDER: Record<Status, number> = { in_progress: 0, for_review: 1, revisions: 2, on_hold: 3, pending: 4, completed: 5, published: 6, canceled: 7, removed: 8 };
export const DONEISH = (st: Status | undefined): boolean => st === "completed" || st === "published";
export const DEAD = (st: Status | undefined): boolean => st === "canceled" || st === "removed";

export const PRIORITIES: Priority[] = ["high", "medium", "low"];
export const PRIORITY_META: Record<Priority, StyleMeta> = {
  high: { txt: "High", c: C.rose, soft: C.roseSoft },
  medium: { txt: "Medium", c: C.amber, soft: C.amberSoft },
  low: { txt: "Low", c: C.teal, soft: C.tealSoft }
};

/* ---------- Project / file trackers ---------- */
export const TRACKERS: Record<"premium" | "gladex" | "tariff", TrackerConfig> = {
  premium: { label: "PREMIUM Projects", sub: "POTB · Product-of-the-Week premium projects", titleLabel: "Project Title",
    columns: ["title", "category", "priority", "status", "progress", "assignee", "team", "start", "due", "updated"],
    addFields: ["title", "category", "destination", "priority", "assignee", "start", "due", "description"] },
  gladex: { label: "GLADEX Projects", sub: "Internal GLADEX department projects", titleLabel: "Project Name",
    columns: ["title", "department", "assignee", "priority", "status", "progress", "start", "due", "updated"],
    addFields: ["title", "department", "priority", "assignee", "start", "due", "description"] },
  tariff: { label: "Tariff File Monitoring", sub: "Daily tariff file updates submitted per staff member", titleLabel: "Tariff File Name",
    columns: ["title", "assignee", "team", "destination", "category", "priority", "status", "progress", "start", "due", "updated"],
    addFields: ["title", "destination", "category", "priority", "assignee", "start", "due", "description"] }
};
export const COL_LABEL: Record<string, string> = { title: "Title", category: "Category", department: "Department", destination: "Destination", assignee: "Assigned To", team: "Team", priority: "Priority", status: "Status", progress: "Progress", start: "Start Date", due: "Due Date", updated: "Last Updated" };
