import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Tag } from "lucide-react";
import { C, card, inputStyle } from "../lib/theme";
import { Btn, Field } from "./ui";
import type { Category } from "../lib/types";

interface CategoryManagementProps {
  categories: Category[];
  addCategory: (name: string, color: string) => Promise<string | null>;
  updateCategory: (id: string, patch: { name?: string; color?: string }) => Promise<string | null>;
  removeCategory: (id: string) => Promise<string | null>;
}

const DEFAULT_COLOR = "#64708A";

function AddCategoryForm({ onAdd, onCancel }: { onAdd: (name: string, color: string) => Promise<string | null>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length > 1;

  const submit = async () => {
    setErr(""); setBusy(true);
    const result = await onAdd(name.trim(), color);
    setBusy(false);
    if (result) { setErr(result); return; }
    setName(""); setColor(DEFAULT_COLOR); onCancel();
  };

  return (
    <div style={{ ...card, padding: 16, marginBottom: 14, borderColor: C.teal }}>
      <div className="flex items-center gap-2 mb-3"><Plus size={16} color={C.teal} /><span style={{ fontWeight: 700, fontSize: 14 }}>Add a category</span></div>
      <div className="flex gap-3 items-end flex-wrap">
        <div style={{ flex: "1 1 200px" }}><Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing" style={inputStyle} /></Field></div>
        <Field label="Color"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48, height: 38, border: `1px solid ${C.line}`, borderRadius: 8, cursor: "pointer", padding: 2 }} /></Field>
      </div>
      {err && <div style={{ color: C.rose, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
      <div className="flex gap-2 mt-3">
        <Btn kind="teal" sm disabled={!valid || busy} onClick={submit}>{busy ? "Adding…" : "Add category"}</Btn>
        <Btn kind="ghost" sm onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function CategoryRow({ cat, onUpdate, onRemove }: {
  cat: Category; onUpdate: (id: string, patch: { name?: string; color?: string }) => Promise<string | null>; onRemove: (id: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(cat.color);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const startEdit = () => { setName(cat.name); setColor(cat.color); setErr(""); setEditing(true); };
  const save = async () => {
    setErr(""); setBusy(true);
    const result = await onUpdate(cat.id, { name: name.trim(), color });
    setBusy(false);
    if (result) { setErr(result); return; }
    setEditing(false);
  };
  const remove = async () => {
    if (!window.confirm(`Remove "${cat.name}"? Existing tasks keep this category as text, but it won't be selectable anymore.`)) return;
    const result = await onRemove(cat.id);
    if (result) window.alert(result);
  };

  if (editing) {
    return (
      <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.paper }}>
        <td style={{ padding: "8px 10px" }}><input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 13 }} /></td>
        <td style={{ padding: "8px 10px" }}><input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 40, height: 32, border: `1px solid ${C.line}`, borderRadius: 7, cursor: "pointer", padding: 2 }} /></td>
        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
          <div className="flex gap-1.5">
            <button onClick={save} disabled={busy} title="Save" style={{ color: C.teal, background: "transparent", border: "none", cursor: "pointer" }}><Check size={16} /></button>
            <button onClick={() => setEditing(false)} title="Cancel" style={{ color: C.sub, background: "transparent", border: "none", cursor: "pointer" }}><X size={16} /></button>
          </div>
          {err && <div style={{ color: C.rose, fontSize: 11.5, marginTop: 4, whiteSpace: "normal", maxWidth: 220 }}>{err}</div>}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: `1px solid ${C.line}` }}>
      <td style={{ padding: "10px" }}>
        <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} /><span style={{ fontWeight: 600, fontSize: 13.5 }}>{cat.name}</span></div>
      </td>
      <td style={{ padding: "10px", fontSize: 12.5, color: C.sub }}>{cat.color}</td>
      <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
        <div className="flex gap-1.5">
          <button onClick={startEdit} title="Edit" style={{ color: C.sub, background: "transparent", border: "none", cursor: "pointer" }}><Pencil size={15} /></button>
          <button onClick={remove} title="Remove" style={{ color: C.rose, background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={15} /></button>
        </div>
      </td>
    </tr>
  );
}

export function CategoryManagement({ categories, addCategory, updateCategory, removeCategory }: CategoryManagementProps) {
  const [showAdd, setShowAdd] = useState(false);
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2"><Tag size={19} color={C.ink} /><h2 style={{ fontSize: 20, fontWeight: 700 }}>Categories</h2></div>
          <div style={{ fontSize: 12.5, color: C.sub }}>Task categories used across Tasking, Daily Tasking, and PREMIUM/GLADEX/Tariff.</div>
        </div>
        <Btn kind="teal" sm icon={<Plus size={15} />} onClick={() => setShowAdd((v) => !v)}>Add category</Btn>
      </div>

      {showAdd && <AddCategoryForm onAdd={addCategory} onCancel={() => setShowAdd(false)} />}

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}>
            <thead>
              <tr style={{ background: C.paper }}>
                {["Name", "Color", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: C.sub, fontWeight: 700, padding: "10px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={3} style={{ padding: 18, color: C.sub, fontSize: 13 }}>No categories yet.</td></tr>}
              {sorted.map((c) => <CategoryRow key={c.id} cat={c} onUpdate={updateCategory} onRemove={removeCategory} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
