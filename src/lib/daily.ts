import { H, STATUS_META, DONEISH } from "./constants";
import type { TaskRecord } from "./types";

/* framework-free helpers for the Daily Tasking module.
   Daily tasks are just TaskRecords (collection "daily") — these helpers only
   deal with the day-grouping/EOD-report parts that are specific to that view. */

export const dateKey = (d = new Date()): string =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const todayKey = (): string => dateKey(new Date());
export const fmtClock = (ts: number): string =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const fmtDayLabel = (key: string): string => {
  const [y, m, dd] = key.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
};

export interface TimelineEntry {
  ts: number;
  text: string;
  title: string;
  color: string;
}
export function buildDayTimeline(tasks: TaskRecord[]): TimelineEntry[] {
  return tasks
    .flatMap((t) => (t.activity || []).map((e) => ({ ts: e.ts, text: e.text, title: t.title, color: e.status ? STATUS_META[e.status].c : "#5C6880" })))
    .sort((a, b) => a.ts - b.ts);
}

export interface Eod {
  completed: TaskRecord[];
  published: TaskRecord[];
  pending: TaskRecord[];
  hours: number | null;
}
export function eodOf(tasks: TaskRecord[]): Eod {
  const completed = tasks.filter((t) => DONEISH(t.status));
  const published = tasks.filter((t) => t.status === "published");
  const pending = tasks.filter((t) => !DONEISH(t.status));
  const tl = buildDayTimeline(tasks);
  const hours = tl.length ? (tl[tl.length - 1].ts - tl[0].ts) / H : null;
  return { completed, published, pending, hours };
}
export const fmtHours = (h: number | null): string =>
  h == null ? "—" : `${Math.floor(h)}h ${Math.round((h - Math.floor(h)) * 60)}m`;
