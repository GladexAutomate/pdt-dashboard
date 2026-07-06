import { useState } from "react";
import { Plus, Trash2, Pencil, Eye, EyeOff, Check, X, UserCog } from "lucide-react";
import { C, card, inputStyle, teamColor } from "../lib/theme";
import { Avatar, Btn, Field, Chip } from "./ui";
import type { AppData, Agent, Team } from "../lib/types";

export interface NewAgentInput {
  name: string;
  team: Team;
  username: string;
  password: string;
}

interface UserManagementProps {
  data: AppData;
  addAgent: (input: NewAgentInput) => Promise<string | null>;
  updateAgent: (id: string, patch: Partial<Agent>) => Promise<string | null>;
  removeAgent: (id: string) => Promise<string | null>;
}

const TEAMS: Team[] = ["Domestic", "International"];

function PasswordReveal({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{show ? value : "•".repeat(Math.max(6, value.length))}</span>
      <button type="button" onClick={() => setShow((v) => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub, display: "flex" }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  );
}

function AddUserForm({ onAdd, onCancel }: { onAdd: (input: NewAgentInput) => Promise<string | null>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<Team>("Domestic");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length > 1 && username.trim().length > 1 && password.trim().length > 3;

  const submit = async () => {
    setErr(""); setBusy(true);
    const result = await onAdd({ name: name.trim(), team, username: username.trim(), password: password.trim() });
    setBusy(false);
    if (result) { setErr(result); return; }
    setName(""); setUsername(""); setPassword(""); onCancel();
  };

  return (
    <div style={{ ...card, padding: 16, marginBottom: 14, borderColor: C.teal }}>
      <div className="flex items-center gap-2 mb-3"><Plus size={16} color={C.teal} /><span style={{ fontWeight: 700, fontSize: 14 }}>Add a user</span></div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Santos" style={inputStyle} /></Field>
        <Field label="Team">
          <select value={team} onChange={(e) => setTeam(e.target.value as Team)} style={inputStyle}>
            {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="e.g. maria" style={inputStyle} /></Field>
        <Field label="Password">
          <div className="flex items-center gap-2" style={{ ...inputStyle, padding: 0, paddingLeft: 11 }}>
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password"
              style={{ border: "none", outline: "none", padding: "9px 4px 9px 0", flex: 1, fontSize: 14, background: "transparent" }} />
            <button type="button" onClick={() => setShowPw((v) => !v)} style={{ background: "transparent", border: "none", padding: "9px 11px 9px 0", cursor: "pointer", display: "flex", color: C.sub }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
      </div>
      {err && <div style={{ color: C.rose, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
      <div className="flex gap-2 mt-3">
        <Btn kind="teal" sm disabled={!valid || busy} onClick={submit}>{busy ? "Adding…" : "Add user"}</Btn>
        <Btn kind="ghost" sm onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function UserRow({ agent, onUpdate, onRemove }: { agent: Agent; onUpdate: (id: string, patch: Partial<Agent>) => Promise<string | null>; onRemove: (id: string) => Promise<string | null> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [team, setTeam] = useState<Team>(agent.team);
  const [username, setUsername] = useState(agent.username);
  const [password, setPassword] = useState(agent.password);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const startEdit = () => { setName(agent.name); setTeam(agent.team); setUsername(agent.username); setPassword(agent.password); setErr(""); setEditing(true); };
  const save = async () => {
    setErr(""); setBusy(true);
    const result = await onUpdate(agent.id, { name: name.trim(), team, username: username.trim(), password: password.trim() });
    setBusy(false);
    if (result) { setErr(result); return; }
    setEditing(false);
  };
  const remove = () => {
    if (!window.confirm(`Remove ${agent.name}? Their past tasks and history stay, but they won't be able to log in anymore.`)) return;
    onRemove(agent.id);
  };

  if (editing) {
    return (
      <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.paper }}>
        <td style={{ padding: "8px 10px" }}><input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 13 }} /></td>
        <td style={{ padding: "8px 10px" }}>
          <select value={team} onChange={(e) => setTeam(e.target.value as Team)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 13 }}>
            {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td style={{ padding: "8px 10px" }}><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} style={{ ...inputStyle, padding: "6px 8px", fontSize: 13 }} /></td>
        <td style={{ padding: "8px 10px" }}>
          <div className="flex items-center gap-1.5" style={{ ...inputStyle, padding: "2px 6px" }}>
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} style={{ border: "none", outline: "none", flex: 1, fontSize: 13, background: "transparent", padding: "4px 0" }} />
            <button type="button" onClick={() => setShowPw((v) => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub, display: "flex" }}>{showPw ? <EyeOff size={13} /> : <Eye size={13} />}</button>
          </div>
        </td>
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
        <div className="flex items-center gap-2"><Avatar name={agent.name} team={agent.team} size={28} /><span style={{ fontWeight: 600, fontSize: 13.5 }}>{agent.name}</span></div>
      </td>
      <td style={{ padding: "10px" }}><Chip color={teamColor(agent.team)} soft={agent.team === "Domestic" ? "#FBEAE4" : "#E7EDFB"}>{agent.team}</Chip></td>
      <td style={{ padding: "10px", fontSize: 13 }}>@{agent.username}</td>
      <td style={{ padding: "10px" }}><PasswordReveal value={agent.password} /></td>
      <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
        <div className="flex gap-1.5">
          <button onClick={startEdit} title="Edit" style={{ color: C.sub, background: "transparent", border: "none", cursor: "pointer" }}><Pencil size={15} /></button>
          <button onClick={remove} title="Remove" style={{ color: C.rose, background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={15} /></button>
        </div>
      </td>
    </tr>
  );
}

export function UserManagement({ data, addAgent, updateAgent, removeAgent }: UserManagementProps) {
  const [showAdd, setShowAdd] = useState(false);
  const sorted = [...data.agents].sort((a, b) => (a.team === b.team ? a.name.localeCompare(b.name) : a.team.localeCompare(b.team)));

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2"><UserCog size={19} color={C.ink} /><h2 style={{ fontSize: 20, fontWeight: 700 }}>User Management</h2></div>
          <div style={{ fontSize: 12.5, color: C.sub }}>Add, edit, or remove agent accounts. Changes apply immediately.</div>
        </div>
        <Btn kind="teal" sm icon={<Plus size={15} />} onClick={() => setShowAdd((v) => !v)}>Add user</Btn>
      </div>

      {showAdd && <AddUserForm onAdd={addAgent} onCancel={() => setShowAdd(false)} />}

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
            <thead>
              <tr style={{ background: C.paper }}>
                {["Name", "Team", "Username", "Password", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: C.sub, fontWeight: 700, padding: "10px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={5} style={{ padding: 18, color: C.sub, fontSize: 13 }}>No users yet.</td></tr>}
              {sorted.map((a) => <UserRow key={a.id} agent={a} onUpdate={updateAgent} onRemove={removeAgent} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
