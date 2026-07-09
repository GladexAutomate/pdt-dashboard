import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Pencil, Eye, EyeOff, Check, X, UserCog, ShieldPlus, ShieldMinus } from "lucide-react";
import { C, card, inputStyle, teamColor } from "../lib/theme";
import { Avatar, Btn, Field, Chip } from "./ui";
import type { AppData, Agent, Team } from "../lib/types";

export interface NewAgentInput {
  name: string;
  team: Team;
  username: string;
  password: string;
}

export interface UpdateAgentInput {
  name?: string;
  team?: Team;
  username?: string;
  password?: string;
}

interface UserManagementProps {
  data: AppData;
  addAgent: (input: NewAgentInput) => Promise<string | null>;
  updateAgent: (id: string, patch: UpdateAgentInput) => Promise<string | null>;
  removeAgent: (id: string) => Promise<string | null>;
  setAgentAdmin: (id: string, isAdmin: boolean) => Promise<string | null>;
}

const TEAMS: Team[] = ["Domestic", "International"];

export function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1.5" style={{ ...inputStyle, padding: "2px 6px" }}>
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: "none", outline: "none", flex: 1, fontSize: 13, background: "transparent", padding: "4px 0" }} />
      <button type="button" onClick={() => setShow((v) => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub, display: "flex" }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function AddUserForm({ onAdd, onCancel }: { onAdd: (input: NewAgentInput) => Promise<string | null>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<Team>("Domestic");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        <Field label="Password"><PasswordField value={password} onChange={setPassword} placeholder="Temporary password" /></Field>
      </div>
      {err && <div style={{ color: C.rose, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
      <div className="flex gap-2 mt-3">
        <Btn kind="teal" sm disabled={!valid || busy} onClick={submit}>{busy ? "Adding…" : "Add user"}</Btn>
        <Btn kind="ghost" sm onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function AdminAccessModal({ agent, grant, onConfirm, onClose }: { agent: Agent; grant: boolean; onConfirm: () => Promise<string | null>; onClose: () => void }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setErr(""); setBusy(true);
    const result = await onConfirm();
    setBusy(false);
    if (result) { setErr(result); return; }
    onClose();
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,28,46,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, marginTop: 24, marginBottom: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div className="flex items-start justify-between gap-3" style={{ padding: 18, borderBottom: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-2">
            {grant ? <ShieldPlus size={17} color={C.gold} /> : <ShieldMinus size={17} color={C.rose} />}
            <span style={{ fontWeight: 700, fontSize: 15.5 }}>{grant ? "Grant admin access" : "Revoke admin access"}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub }}><X size={18} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.text }}>
            {grant
              ? <>Grant <b>{agent.name}</b> admin access? They'll get full admin login using their current username and password, while keeping their team, task history, and eligibility for new assignments exactly as before.</>
              : <>Revoke admin access from <b>{agent.name}</b>? They'll go back to a regular agent login — their team, task history, and assignments are unaffected.</>}
          </div>
          {err && <div style={{ color: C.rose, fontSize: 12.5, marginTop: 10 }}>{err}</div>}
          <div className="flex gap-2 mt-4">
            <Btn kind={grant ? "teal" : "danger"} sm disabled={busy} onClick={confirm}>{busy ? "Saving…" : grant ? "Grant access" : "Revoke access"}</Btn>
            <Btn kind="ghost" sm onClick={onClose}>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UserRow({ agent, onUpdate, onRemove, onSetAdmin }: {
  agent: Agent; onUpdate: (id: string, patch: UpdateAgentInput) => Promise<string | null>; onRemove: (id: string) => Promise<string | null>; onSetAdmin: (id: string, isAdmin: boolean) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [team, setTeam] = useState<Team>(agent.team);
  const [username, setUsername] = useState(agent.username);
  const [password, setPassword] = useState(""); // blank = keep current password
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const startEdit = () => { setName(agent.name); setTeam(agent.team); setUsername(agent.username); setPassword(""); setErr(""); setEditing(true); };
  const save = async () => {
    setErr(""); setBusy(true);
    const patch: UpdateAgentInput = { name: name.trim(), team, username: username.trim() };
    if (password.trim()) patch.password = password.trim();
    const result = await onUpdate(agent.id, patch);
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
        <td style={{ padding: "8px 10px", minWidth: 180 }}><PasswordField value={password} onChange={setPassword} placeholder="Leave blank to keep current" /></td>
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
        <div className="flex items-center gap-2">
          <Avatar name={agent.name} team={agent.team} size={28} /><span style={{ fontWeight: 600, fontSize: 13.5 }}>{agent.name}</span>
          {agent.isAdmin && <Chip color={C.gold} soft="#FBF3DD">Admin</Chip>}
        </div>
      </td>
      <td style={{ padding: "10px" }}><Chip color={teamColor(agent.team)} soft={agent.team === "Domestic" ? "#FBEAE4" : "#E7EDFB"}>{agent.team}</Chip></td>
      <td style={{ padding: "10px", fontSize: 13 }}>@{agent.username}</td>
      <td style={{ padding: "10px", fontSize: 12.5, color: C.sub }}>••••••••</td>
      <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
        <div className="flex gap-1.5">
          <button onClick={startEdit} title="Edit / reset password" style={{ color: C.sub, background: "transparent", border: "none", cursor: "pointer" }}><Pencil size={15} /></button>
          {agent.isAdmin
            ? <button onClick={() => setShowAdminModal(true)} title="Revoke admin access" style={{ color: C.rose, background: "transparent", border: "none", cursor: "pointer" }}><ShieldMinus size={15} /></button>
            : <button onClick={() => setShowAdminModal(true)} title="Grant admin access" style={{ color: C.gold, background: "transparent", border: "none", cursor: "pointer" }}><ShieldPlus size={15} /></button>}
          <button onClick={remove} title="Remove" style={{ color: C.rose, background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={15} /></button>
        </div>
      </td>
      {showAdminModal && (
        <AdminAccessModal agent={agent} grant={!agent.isAdmin} onConfirm={() => onSetAdmin(agent.id, !agent.isAdmin)} onClose={() => setShowAdminModal(false)} />
      )}
    </tr>
  );
}

export function UserManagement({ data, addAgent, updateAgent, removeAgent, setAgentAdmin }: UserManagementProps) {
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
              {sorted.map((a) => <UserRow key={a.id} agent={a} onUpdate={updateAgent} onRemove={removeAgent} onSetAdmin={setAgentAdmin} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
