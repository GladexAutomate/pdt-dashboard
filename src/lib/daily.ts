import type { DailyTask, DailyStatus, DailyEvent } from "./types";

/* framework-free helpers for the Daily Tasking module.
   Kept separate from theme/constants so it can be imported anywhere. */

export const HOUR = 3600000;

export const dateKey = (d = new Date()): string =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const todayKey = (): string => dateKey(new Date());
export const fmtClock = (ts: number): string =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const fmtDayLabel = (key: string): string => {
  const [y, m, dd] = key.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
};

export const DAILY_LABEL: Record<DailyStatus, string> = {
  assigned: "Assigned", in_progress: "Started", completed: "Completed", published: "Published"
};
export const DAILY_DONE = (s: DailyStatus): boolean => s === "completed" || s === "published";

export const DAILY_META: Record<DailyStatus, { txt: string; c: string; soft: string }> = {
  assigned: { txt: "Assigned", c: "#5C6880", soft: "#EDF0F6" },
  in_progress: { txt: "In progress", c: "#D9852A", soft: "#FBEEDB" },
  completed: { txt: "Completed", c: "#1F2C4D", soft: "#E7EBF3" },
  published: { txt: "Published", c: "#0E9E8E", soft: "#E1F3F0" }
};
export const dailyDotColor = (a: string): string =>
  a === "published" ? "#0E9E8E" : a === "completed" ? "#1F2C4D" : a === "in_progress" ? "#D9852A" : "#5C6880";

export type TimelineEntry = DailyEvent & { title: string };
export function buildDayTimeline(tasks: DailyTask[]): TimelineEntry[] {
  return tasks
    .flatMap((t) => (t.timeline || []).map((e) => ({ ...e, title: t.title })))
    .sort((a, b) => a.ts - b.ts);
}

export interface Eod {
  completed: DailyTask[];
  published: DailyTask[];
  pending: DailyTask[];
  hours: number | null;
}
export function eodOf(tasks: DailyTask[]): Eod {
  const completed = tasks.filter((t) => DAILY_DONE(t.status));
  const published = tasks.filter((t) => t.status === "published");
  const pending = tasks.filter((t) => !DAILY_DONE(t.status));
  const tl = buildDayTimeline(tasks);
  const hours = tl.length ? (tl[tl.length - 1].ts - tl[0].ts) / HOUR : null;
  return { completed, published, pending, hours };
}
export const fmtHours = (h: number | null): string =>
  h == null ? "—" : `${Math.floor(h)}h ${Math.round((h - Math.floor(h)) * 60)}m`;