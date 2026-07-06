import { C } from "./theme";
import { COLLECTIONS, D, H, DONEISH, DEAD } from "./constants";
import type {
  TaskRecord, AppData, Agent, DueMeta, SpeedLabelMeta, Band,
  AgentStats, GroupStats, StaffMonthStats, KpiStatusMeta
} from "./types";

/* ---------- generic helpers ---------- */
export const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
export const avg = (a: number[]): number | null => (a.length ? sum(a) / a.length : null);
export const pct = (n: number | null | undefined): string => (n == null ? "—" : Math.round(n) + "%");
export const actualHrs = (t: TaskRecord): number | null => (t.startedAt && t.completedAt ? (t.completedAt - t.startedAt) / H : null);
export const speedRatio = (t: TaskRecord): number | null => { const a = actualHrs(t); return a && t.estimatedHours ? t.estimatedHours / Math.max(a, 0.05) : null; };
export function speedLabel(r: number | null): SpeedLabelMeta {
  if (r == null) return { txt: "—", c: C.sub };
  if (r >= 1.15) return { txt: "Fast", c: C.teal };
  if (r >= 0.9) return { txt: "On-time", c: C.amber };
  return { txt: "Behind", c: C.rose };
}
export function relTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}
export const fmtDate = (ts: number | null | undefined): string => (ts ? new Date(ts).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
export const toDateInput = (ms: number | null | undefined): string => (ms ? new Date(ms).toISOString().slice(0, 10) : "");
export const fromDateInput = (s: string): number | null => (s ? new Date(s + "T00:00:00").getTime() : null);
export const fmtDay = (ms: number | null | undefined): string => (ms ? new Date(ms).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—");

/* ---------- monthly report aggregation ---------- */
export const monthKey = (y: number, m: number): string => `${y}-${String(m + 1).padStart(2, "0")}`;
export const inMonth = (ms: number | null | undefined, y: number, m: number): boolean => { if (!ms) return false; const d = new Date(ms); return d.getFullYear() === y && d.getMonth() === m; };
// a record "belongs" to a month if it was scheduled, due, or completed in it
export const recInMonth = (r: TaskRecord, y: number, m: number): boolean => inMonth(r.startDate, y, m) || inMonth(r.completedAt, y, m) || inMonth(r.dueDate, y, m);
export function flattenRecords(data: AppData): TaskRecord[] {
  const out: TaskRecord[] = [];
  for (const col of COLLECTIONS) for (const r of (data[col] || [])) out.push({ ...r, _col: col, _isProject: col !== "tasks" });
  return out;
}
export function reassignCount(r: TaskRecord, y: number, m: number): number {
  return (r.activity || []).filter((a) => a.type === "reassign" && inMonth(a.ts, y, m)).length;
}
export function staffMonth(records: TaskRecord[], agentId: string, y: number, m: number): StaffMonthStats {
  const mine = records.filter((r) => r.agentId === agentId && recInMonth(r, y, m));
  const completed = mine.filter((r) => DONEISH(r.status) && inMonth(r.completedAt, y, m));
  const started = mine.filter((r) => r.startedAt || r.status !== "pending");
  const pending = mine.filter((r) => r.status === "pending");
  const overdue = mine.filter((r) => { const d = dueMeta(r); return d && d.over; });
  const high = completed.filter((r) => r.priority === "high");
  const onTime = completed.filter((r) => r.dueDate && r.completedAt && r.completedAt <= r.dueDate + D);
  const delayed = completed.filter((r) => r.dueDate && r.completedAt && r.completedAt > r.dueDate + D);
  const projects = mine.filter((r) => r._isProject);
  const completedProjects = completed.filter((r) => r._isProject);
  const activeProjects = projects.filter((r) => !DONEISH(r.status) && !DEAD(r.status));
  const dests = [...new Set(mine.map((r) => r.destination).filter(Boolean))] as string[];
  const reassigned = mine.reduce((s, r) => s + reassignCount(r, y, m), 0);
  const times = completed.map((r) => actualHrs(r)).filter((x): x is number => x != null);
  const assignedN = mine.length, completedN = completed.length;
  const completionPct = assignedN ? (completedN / assignedN) * 100 : 0;
  const onTimePct = completedN ? (onTime.length / completedN) * 100 : 0;
  const productivity = Math.min(100, Math.round(completedN * 12 + high.length * 6));
  const kpi = Math.round(completionPct * 0.45 + onTimePct * 0.30 + productivity * 0.25);
  const lastActivity = Math.max(0, ...mine.map((r) => r.updatedAt || 0), ...mine.flatMap((r) => (r.activity || []).map((a) => a.ts)));
  return {
    mine, completed, started, pending, overdue, high, onTime, delayed, projects, completedProjects, activeProjects, dests, reassigned,
    assignedN, completedN, startedN: started.length, pendingN: pending.length, overdueN: overdue.length,
    completionPct, onTimePct, productivity, kpi, avgTime: avg(times), lastActivity: lastActivity || null
  };
}
export const kpiBand = (k: number): Band => k >= 85 ? { txt: "Excellent", c: C.teal } : k >= 70 ? { txt: "Good", c: C.amber } : k >= 50 ? { txt: "Fair", c: C.gold } : { txt: "Needs work", c: C.rose };

export function dueMeta(t: TaskRecord): DueMeta | null {
  if (!t.dueDate) return null;
  if (DONEISH(t.status) || DEAD(t.status)) return { c: C.sub, label: "", over: false };
  const days = Math.ceil((t.dueDate - Date.now()) / D);
  if (days < 0) return { c: C.rose, label: `${-days}d overdue`, over: true };
  if (days === 0) return { c: C.amber, label: "due today", over: false };
  if (days <= 2) return { c: C.amber, label: `${days}d left`, over: false };
  return { c: C.sub, label: `${days}d left`, over: false };
}

export const normUrl = (u: string | null | undefined): string => { const t = (u || "").trim(); if (!t) return ""; return /^https?:\/\//i.test(t) ? t : "https://" + t; };
export function resizeImage(file: File, maxDim = 1100, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject; img.src = url;
  });
}
export function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); });
}

export function agentStats(agent: Agent, tasks: TaskRecord[]): AgentStats {
  const mine = tasks.filter((t) => t.agentId === agent.id);
  const active = mine.filter((t) => !DEAD(t.status));
  const completed = mine.filter((t) => DONEISH(t.status));
  const published = mine.filter((t) => t.status === "published");
  const inprog = mine.filter((t) => t.status === "in_progress");
  const speeds = completed.map(speedRatio).filter((r): r is number => r != null);
  const acced = mine.filter((t) => (t.itemsTotal ?? 0) > 0);
  const totItems = sum(acced.map((t) => t.itemsTotal ?? 0));
  const totErr = sum(acced.map((t) => t.itemsError ?? 0));
  return {
    mine, active, completed, published, inprog,
    avgSpeed: avg(speeds),
    accuracy: totItems ? (1 - totErr / totItems) * 100 : null,
    errorRate: totItems ? (totErr / totItems) * 100 : null,
    productivity: active.length ? (completed.length / active.length) * 100 : 0,
    totItems, totErr
  };
}
export function groupStats(agents: Agent[], tasks: TaskRecord[]): GroupStats {
  const ids = new Set(agents.map((a) => a.id));
  const mine = tasks.filter((t) => t.agentId != null && ids.has(t.agentId));
  const active = mine.filter((t) => !DEAD(t.status));
  const completed = mine.filter((t) => DONEISH(t.status));
  const published = mine.filter((t) => t.status === "published");
  const inprog = mine.filter((t) => t.status === "in_progress");
  const speeds = completed.map(speedRatio).filter((r): r is number => r != null);
  const acced = mine.filter((t) => (t.itemsTotal ?? 0) > 0);
  const totItems = sum(acced.map((t) => t.itemsTotal ?? 0));
  const totErr = sum(acced.map((t) => t.itemsError ?? 0));
  return {
    count: active.length, completed: completed.length, published: published.length, inprog: inprog.length,
    avgSpeed: avg(speeds),
    accuracy: totItems ? (1 - totErr / totItems) * 100 : null,
    productivity: active.length ? (completed.length / active.length) * 100 : 0
  };
}

export const csvCell = (v: unknown): string => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function downloadCSV(filename: string, rows: unknown[][]): void {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function kpiKey(staffId: string, task: string): string { return staffId + "::" + task; }
export function kpiStatus(p: number): KpiStatusMeta {
  if (p >= 100) return { txt: "Target Achieved", c: C.teal, soft: C.tealSoft, dot: "🟢" };
  if (p >= 80) return { txt: "On Track", c: "#C79A16", soft: "#FBF1CE", dot: "🟡" };
  if (p >= 60) return { txt: "Needs Improvement", c: C.amber, soft: C.amberSoft, dot: "🟠" };
  return { txt: "Critical", c: C.rose, soft: C.roseSoft, dot: "🔴" };
}

export function pdMonthKey(d: Date): string { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
export function pdMonthLabel(key: string): string { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }); }
