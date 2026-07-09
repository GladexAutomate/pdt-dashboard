import type { CSSProperties } from "react";
import type { Team, Category } from "./types";

export const C = {
  ink: "#16203A", ink2: "#1F2C4D", paper: "#EDF0F6", surface: "#FFFFFF",
  line: "#DCE2EC", text: "#16203A", sub: "#5C6880",
  teal: "#0E9E8E", tealSoft: "#E1F3F0",
  amber: "#D9852A", amberSoft: "#FBEEDB",
  rose: "#D6536A", roseSoft: "#FBE6EA",
  domestic: "#E0663F", international: "#3C6CE0",
  gold: "#E9B949"
};
export const teamColor = (t: Team | string | undefined): string => (t === "Domestic" ? C.domestic : C.international);
export const catC = (name: string | undefined, categories?: Category[]): string => (name && categories?.find((c) => c.name === name)?.color) || "#64708A";

export const card: CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16 };
export const inputStyle: CSSProperties = { width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", fontSize: 14, color: C.text, background: "#fff", outline: "none" };
export const cellStyle: CSSProperties = { padding: "10px 12px", verticalAlign: "top", fontSize: 13 };
export const dateInputStyle: CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 7px", fontSize: 12.5, color: C.text, background: "#fff", outline: "none", fontFamily: "inherit" };
export const lbl: CSSProperties = { fontSize: 11, color: C.sub, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 5 };
export const selStyleBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${C.line}`, background: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, color: C.text };
export const kpiSelect: CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, color: C.text, background: "#fff", outline: "none", fontWeight: 600 };
