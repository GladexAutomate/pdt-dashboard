import { useState, useEffect, useMemo } from "react";
import {
  X, Sparkles, MapPin, Link2, Paperclip, MessageSquare, FileText, Target,
  ExternalLink, Plus, Send, Trash2, CalendarCheck, Image as ImageIcon,
  ArrowRightLeft, Activity, History, Users, ListChecks
} from "lucide-react";
import { C, inputStyle, dateInputStyle, lbl, selStyleBtn, catC } from "../lib/theme";
import { STATUS_META, PRIORITY_META, DONEISH, TRACKERS } from "../lib/constants";
import { relTime, fmtDay, toDateInput, fromDateInput, dueMeta, normUrl, resizeImage, readFileDataUrl, trackerColForCategory, flattenRecords } from "../lib/helpers";
import { Chip, Btn, ProgressBar, StatusSelect, PrioritySelect, DetailSection, EditableArea } from "./ui";
import type { TaskRecord, AppData, Actor, Status, ProofItem, CommentEntry, ActivityEntry, LinkItem, ChecklistItem, ColKey } from "../lib/types";

type TimelineItem = (CommentEntry & { kind: "comment" }) | (ActivityEntry & { kind: "event" });

interface TaskDetailProps {
  task: TaskRecord;
  data: AppData;
  actor: Actor;
  isAdmin: boolean;
  canEdit: boolean;
  onClose: () => void;
  updateTask: (id: string, patch: Partial<TaskRecord>) => void;
  setStatus: (id: string, status: Status) => void;
  addComment: (id: string, text: string) => void;
  pushActivity: (id: string, type: string, text: string) => void;
  appendProof: (id: string, item: ProofItem) => void;
  appendLink: (id: string, link: LinkItem) => void;
  appendChecklistItem: (id: string, item: ChecklistItem) => void;
  createChecklistTask: (input: { text: string; assigneeId: string; category: string; targetCol: ColKey }) => void;
  deleteTask: (id: string) => void;
  onGoToTracker?: (col: ColKey) => void;
}

/* ---------------- Task detail drawer ---------------- */
export function TaskDetail({ task, data, actor, canEdit, onClose, updateTask, setStatus, addComment, pushActivity, appendProof, appendLink, appendChecklistItem, createChecklistTask, deleteTask, onGoToTracker }: TaskDetailProps) {
  const t = task;
  const [proof, setProof] = useState<ProofItem[]>(task.proof || []);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [proofLabel, setProofLabel] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [checklistAssignee, setChecklistAssignee] = useState("");
  const [checklistCategory, setChecklistCategory] = useState(t.category || data.categories[0]?.name || "");
  const allRecords = useMemo(() => flattenRecords(data), [data]);
  const [addCollabId, setAddCollabId] = useState("");

  // proof isn't part of the bulk dashboard load (see api.ts) — App.tsx
  // fetches it just for this task once the drawer opens, so re-sync once
  // that arrives (task.proof only changes reference when it actually does).
  useEffect(() => { setProof(task.proof || []); }, [task.id, task.proof]);

  // adds go through the atomic append RPC (appendProof) so two collaborators
  // uploading proof at the same instant both land; removals stay a plain
  // whole-array replace since that race is rarer and lower-stakes.
  const saveProof = (next: ProofItem[]) => { setProof(next); updateTask(t.id, { proof: next, proofCount: next.length }); };
  const addProofItem = (att: ProofItem) => { setProof([...proof, att]); appendProof(t.id, att); };
  const addImage = async (file: File) => {
    setErr(""); setBusy(true);
    try {
      const dataUrl = await resizeImage(file);
      const att: ProofItem = { id: "pf" + Date.now(), kind: "image", name: file.name, dataUrl, ts: Date.now(), by: actor.name };
      addProofItem(att);
      pushActivity(t.id, "proof", `Uploaded screenshot: ${file.name}`);
    } catch (e) { setErr("Could not process that image."); }
    setBusy(false);
  };
  const addFile = async (file: File) => {
    if (!file) return;
    if (file.type.startsWith("image/")) return addImage(file);
    if (file.size > 5 * 1024 * 1024) { setErr("File too large (max 5MB). Add a link instead for big files."); return; }
    setErr(""); setBusy(true);
    try {
      const dataUrl = await readFileDataUrl(file);
      const att: ProofItem = { id: "pf" + Date.now(), kind: "file", name: file.name, dataUrl, ts: Date.now(), by: actor.name };
      addProofItem(att);
      pushActivity(t.id, "proof", `Uploaded file: ${file.name}`);
    } catch (e) { setErr("Could not read that file."); }
    setBusy(false);
  };
  const addProofLink = () => {
    if (!proofUrl.trim()) return;
    const att: ProofItem = { id: "pf" + Date.now(), kind: "link", name: proofLabel.trim() || proofUrl.trim(), url: normUrl(proofUrl), ts: Date.now(), by: actor.name };
    addProofItem(att); pushActivity(t.id, "proof", `Linked proof: ${att.name}`);
    setProofLabel(""); setProofUrl("");
  };
  const removeProof = (id: string) => { const a = proof.find((p) => p.id === id); saveProof(proof.filter((p) => p.id !== id)); if (a) pushActivity(t.id, "proof", `Removed proof: ${a.name}`); };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    const link = { id: "lk" + Date.now(), label: linkLabel.trim() || linkUrl.trim(), url: normUrl(linkUrl) };
    appendLink(t.id, link); pushActivity(t.id, "link", `Added link: ${link.label}`);
    setLinkLabel(""); setLinkUrl("");
  };
  const removeLink = (id: string) => updateTask(t.id, { links: (t.links || []).filter((l) => l.id !== id) });

  const addChecklistItem = () => {
    if (!checklistText.trim()) return;
    if (checklistAssignee) {
      const category = checklistCategory || t.category || data.categories[0]?.name || "";
      const targetCol = trackerColForCategory(category) || "daily";
      createChecklistTask({ text: checklistText.trim(), assigneeId: checklistAssignee, category, targetCol });
      setChecklistAssignee("");
    } else {
      const item: ChecklistItem = { id: "ck" + Date.now(), text: checklistText.trim(), done: false, ts: Date.now(), by: actor.name };
      appendChecklistItem(t.id, item);
      pushActivity(t.id, "checklist", `Added checklist item: ${item.text}`);
    }
    setChecklistText("");
  };
  const toggleChecklistItem = (id: string) => {
    const item = (t.checklist || []).find((c) => c.id === id);
    if (!item || item.linkedTaskId) return; // linked items track their own task's status, not a manual toggle
    updateTask(t.id, { checklist: (t.checklist || []).map((c) => (c.id === id ? { ...c, done: !c.done } : c)) });
    pushActivity(t.id, "checklist", `${item.done ? "Unchecked" : "Checked off"}: ${item.text}`);
  };
  const removeChecklistItem = (id: string) => {
    const item = (t.checklist || []).find((c) => c.id === id);
    updateTask(t.id, { checklist: (t.checklist || []).filter((c) => c.id !== id) });
    if (item) pushActivity(t.id, "checklist", `Removed checklist item: ${item.text}`);
  };
  const checklistDone = (t.checklist || []).filter((c) => {
    if (c.linkedTaskId) { const lt = allRecords.find((r) => r.id === c.linkedTaskId); return lt ? DONEISH(lt.status) : false; }
    return c.done;
  }).length;

  const availableCollabs = data.agents.filter((a) => a.isActive && a.id !== t.agentId && !(t.collaboratorIds || []).includes(a.id));
  const addCollaborator = () => {
    if (!addCollabId) return;
    const name = data.agents.find((a) => a.id === addCollabId)?.name || "someone";
    updateTask(t.id, { collaboratorIds: [...(t.collaboratorIds || []), addCollabId] });
    pushActivity(t.id, "edit", `Added ${name} as a collaborator`);
    setAddCollabId("");
  };
  const removeCollaborator = (id: string) => {
    const name = data.agents.find((a) => a.id === id)?.name || "someone";
    updateTask(t.id, { collaboratorIds: (t.collaboratorIds || []).filter((cid) => cid !== id) });
    pushActivity(t.id, "edit", `Removed ${name} as a collaborator`);
  };

  const timeline: TimelineItem[] = [
    ...(t.comments || []).map((c) => ({ ...c, kind: "comment" as const })),
    ...(t.activity || []).map((a) => ({ ...a, kind: "event" as const }))
  ].sort((x, y) => y.ts - x.ts);

  const pm = PRIORITY_META[t.priority || "medium"];
  const dm = dueMeta(t);
  const ro = !canEdit;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,28,46,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720, marginTop: 24, marginBottom: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        {/* header */}
        <div className="flex items-start justify-between gap-3" style={{ padding: 18, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {t.category && <><span style={{ width: 10, height: 10, borderRadius: 3, background: catC(t.category, data.categories) }} />
              <span style={{ fontSize: 11.5, color: catC(t.category, data.categories), fontWeight: 700 }}>{t.category}</span></>}
              {t.department && <Chip color={C.ink2} soft={C.paper}>{t.department}</Chip>}
              {t.destination && <Chip color={C.international} soft="#E7EDFB" icon={<MapPin size={10} />}>{t.destination}</Chip>}
              {t.special && <Chip color={C.amber} soft={C.amberSoft} icon={<Sparkles size={10} />}>Special</Chip>}
            </div>
            <input disabled={ro} defaultValue={t.title} onBlur={(e) => canEdit && e.target.value.trim() && e.target.value !== t.title && updateTask(t.id, { title: e.target.value.trim() })}
              style={{ fontWeight: 700, fontSize: 19, border: "none", outline: "none", width: "100%", color: C.text, background: "transparent" }} />
            <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>
              {t.team && <span>Team {t.team} · </span>}Last updated {relTime(t.updatedAt)}{t.updatedBy && t.updatedBy !== "—" ? ` by ${t.updatedBy}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.paper, border: "none", borderRadius: 9, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={17} color={C.sub} /></button>
        </div>

        <div style={{ padding: "4px 18px 18px" }}>
          {/* control grid */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", paddingTop: 14 }}>
            <div><div style={lbl}>Category</div>
              {canEdit ? (
                <select value={t.category || ""} onChange={(e) => updateTask(t.id, { category: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  {data.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : t.category ? (
                <div className="flex items-center gap-1.5" style={{ paddingTop: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: catC(t.category, data.categories) }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: catC(t.category, data.categories) }}>{t.category}</span>
                </div>
              ) : <span style={{ fontSize: 13, color: C.sub, paddingTop: 5, display: "block" }}>—</span>}
              {onGoToTracker && trackerColForCategory(t.category) && (
                <button onClick={() => onGoToTracker(trackerColForCategory(t.category)!)}
                  className="flex items-center gap-1" style={{ marginTop: 5, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: 11.5, fontWeight: 700, color: C.international }}>
                  <ExternalLink size={11} /> Open in {TRACKERS[trackerColForCategory(t.category)!].label}
                </button>
              )}
            </div>
            <div><div style={lbl}>Status</div>{canEdit ? <StatusSelect value={t.status} onChange={(s) => setStatus(t.id, s)} /> : <Chip color={STATUS_META[t.status].c} soft={STATUS_META[t.status].soft}>{STATUS_META[t.status].txt}</Chip>}</div>
            <div><div style={lbl}>Priority</div>{canEdit ? <PrioritySelect value={t.priority || "medium"} onChange={(p) => { updateTask(t.id, { priority: p }); }} /> : <Chip color={pm.c} soft={pm.soft}>{pm.txt}</Chip>}</div>
            <div><div style={lbl}>Assignee</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{data.agents.find((a) => a.id === t.agentId)?.name || "Unassigned"}</span>
            </div>
          </div>

          <div className="mt-3">
            <div style={lbl}>Progress · {t.progress || 0}%</div>
            <div className="flex items-center gap-3">
              <ProgressBar value={t.progress || 0} height={9} />
              {canEdit && <input type="range" min={0} max={100} step={5} value={t.progress || 0} onChange={(e) => updateTask(t.id, { progress: parseInt(e.target.value) })} style={{ width: 160 }} />}
            </div>
          </div>

          <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            <div><div style={lbl}>Start date</div><input disabled={ro} type="date" value={toDateInput(t.startDate)} onChange={(e) => updateTask(t.id, { startDate: fromDateInput(e.target.value) })} style={dateInputStyle} /></div>
            <div><div style={lbl}>Due date</div><input disabled={ro} type="date" value={toDateInput(t.dueDate)} onChange={(e) => updateTask(t.id, { dueDate: fromDateInput(e.target.value) })} style={dateInputStyle} />{dm && dm.label && <span style={{ fontSize: 11, color: dm.c, fontWeight: 600, marginLeft: 6 }}>{dm.label}</span>}</div>
            <div><div style={lbl}>Completed</div><div className="flex items-center gap-1" style={{ fontSize: 13, color: DONEISH(t.status) ? C.teal : C.sub, fontWeight: 600, paddingTop: 5 }}><CalendarCheck size={14} /> {DONEISH(t.status) && t.completedAt ? fmtDay(t.completedAt) : "—"}</div></div>
          </div>

          {/* collaborators */}
          <DetailSection icon={<Users size={15} color={C.ink} />} title={`Collaborators${(t.collaboratorIds || []).length ? ` (${(t.collaboratorIds || []).length})` : ""}`}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
              Add a plain note, or pick someone to assign it to — assigning turns it into a real ticket in their Pending. Pick a category (e.g. a Tariff category) and it'll automatically land on the matching board.
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              {(t.collaboratorIds || []).length === 0 && <div style={{ fontSize: 12.5, color: C.sub }}>No collaborators yet.</div>}
              {(t.collaboratorIds || []).map((id) => {
                const a = data.agents.find((x) => x.id === id);
                return (
                  <div key={id} className="flex items-center gap-1.5" style={{ background: C.paper, borderRadius: 999, padding: "5px 6px 5px 11px", fontSize: 12.5, fontWeight: 600 }}>
                    {a?.name || "Unknown"}
                    {canEdit && <button onClick={() => removeCollaborator(id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub, display: "flex", padding: 2 }}><X size={12} /></button>}
                  </div>
                );
              })}
            </div>
            {canEdit && availableCollabs.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <select value={addCollabId} onChange={(e) => setAddCollabId(e.target.value)} style={{ ...inputStyle, flex: "1 1 180px" }}>
                  <option value="">Add collaborator…</option>
                  {availableCollabs.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.team}</option>)}
                </select>
                <Btn sm kind="ghost" icon={<Plus size={13} />} disabled={!addCollabId} onClick={addCollaborator}>Add</Btn>
              </div>
            )}
          </DetailSection>

          {/* description */}
          <DetailSection icon={<FileText size={15} color={C.ink} />} title="Description & work done">
            <EditableArea disabled={ro} value={t.description} placeholder="Describe the task, work completed, and updates…" onSave={(v) => { updateTask(t.id, { description: v }); pushActivity(t.id, "edit", "Updated description"); }} rows={3} />
          </DetailSection>

          {/* requirements / remarks */}
          <DetailSection icon={<Target size={15} color={C.ink} />} title="Requirements & remarks">
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              <div><div style={lbl}>Requirements</div><EditableArea disabled={ro} value={t.requirements} placeholder="What's needed…" onSave={(v) => updateTask(t.id, { requirements: v })} rows={2} /></div>
              <div><div style={lbl}>Remarks</div><EditableArea disabled={ro} value={t.remarks} placeholder="Notes…" onSave={(v) => updateTask(t.id, { remarks: v })} rows={2} /></div>
            </div>
          </DetailSection>

          {/* checklist */}
          <DetailSection icon={<ListChecks size={15} color={C.ink} />} title={`Checklist${(t.checklist || []).length ? ` (${checklistDone}/${(t.checklist || []).length})` : ""}`}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
              Add a plain note, or pick someone to assign it to — assigning turns it into a real ticket in their Pending, with its own category.
            </div>
            <div className="space-y-1.5">
              {(t.checklist || []).length === 0 && <div style={{ fontSize: 12.5, color: C.sub }}>No checklist items yet.</div>}
              {(t.checklist || []).map((c) => {
                const linkedTask = c.linkedTaskId ? allRecords.find((r) => r.id === c.linkedTaskId) : null;
                const assigneeName = c.assigneeId ? data.agents.find((a) => a.id === c.assigneeId)?.name : null;
                const isDone = linkedTask ? DONEISH(linkedTask.status) : c.done;
                const sm = linkedTask ? STATUS_META[linkedTask.status] : null;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2" style={{ background: C.paper, borderRadius: 8, padding: "7px 10px" }}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ flex: 1, minWidth: 0 }}>
                      {linkedTask
                        ? <span style={{ width: 9, height: 9, borderRadius: 999, background: sm!.c, flexShrink: 0 }} />
                        : <input type="checkbox" checked={c.done} disabled={!canEdit} onChange={() => canEdit && toggleChecklistItem(c.id)} />}
                      <span style={{ fontSize: 13, textDecoration: isDone ? "line-through" : "none", color: isDone ? C.sub : C.text }}>{c.text}</span>
                      {assigneeName && <Chip color={C.international} soft="#E7EDFB">{assigneeName}</Chip>}
                      {c.category && <Chip color={catC(c.category, data.categories)} soft={C.paper}>{c.category}</Chip>}
                      {linkedTask && <Chip color={sm!.c} soft={sm!.soft}>{sm!.txt}</Chip>}
                    </div>
                    {canEdit && <button onClick={() => removeChecklistItem(c.id)} title={linkedTask ? "Remove from checklist (doesn't delete their ticket)" : "Remove"} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub, flexShrink: 0 }}><X size={14} /></button>}
                  </div>
                );
              })}
            </div>
            {canEdit && (
              <div className="flex gap-2 mt-2 flex-wrap">
                <input value={checklistText} onChange={(e) => setChecklistText(e.target.value)} placeholder="Add a checklist item…" onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} style={{ ...inputStyle, flex: "2 1 160px", padding: "7px 9px" }} />
                <select value={checklistAssignee} onChange={(e) => setChecklistAssignee(e.target.value)} style={{ ...inputStyle, flex: "1 1 150px", padding: "7px 9px" }}>
                  <option value="">No assignee (just a note)</option>
                  {data.agents.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.team}</option>)}
                </select>
                {checklistAssignee && (
                  <select value={checklistCategory} onChange={(e) => setChecklistCategory(e.target.value)} style={{ ...inputStyle, flex: "1 1 140px", padding: "7px 9px" }}>
                    {data.categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                )}
                <Btn sm kind="ghost" icon={<Plus size={13} />} onClick={addChecklistItem}>Add</Btn>
              </div>
            )}
          </DetailSection>

          {/* links */}
          <DetailSection icon={<Link2 size={15} color={C.ink} />} title={`Links & references${t.links?.length ? ` (${t.links.length})` : ""}`}>
            <div className="space-y-1.5">
              {(t.links || []).length === 0 && <div style={{ fontSize: 12.5, color: C.sub }}>No links yet.</div>}
              {(t.links || []).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2" style={{ background: C.paper, borderRadius: 8, padding: "7px 10px" }}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5" style={{ fontSize: 13, color: C.international, fontWeight: 600, textDecoration: "none", minWidth: 0 }}>
                    <ExternalLink size={13} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
                  </a>
                  {canEdit && <button onClick={() => removeLink(l.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub }}><X size={14} /></button>}
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-2 mt-2 flex-wrap">
                <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label (optional)" style={{ ...inputStyle, flex: "1 1 120px", padding: "7px 9px" }} />
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" onKeyDown={(e) => e.key === "Enter" && addLink()} style={{ ...inputStyle, flex: "2 1 180px", padding: "7px 9px" }} />
                <Btn sm kind="ghost" icon={<Plus size={13} />} onClick={addLink}>Add</Btn>
              </div>
            )}
          </DetailSection>

          {/* proof */}
          <DetailSection icon={<Paperclip size={15} color={C.ink} />} title={`Proof of completion${proof.length ? ` (${proof.length})` : ""}`}>
                {proof.length === 0 && <div style={{ fontSize: 12.5, color: C.sub }}>No proof attached yet. Add a screenshot, file, or link.</div>}
                <div className="flex gap-2 flex-wrap">
                  {proof.map((p) => (
                    <div key={p.id} style={{ position: "relative", border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", width: p.kind === "image" ? 120 : "auto" }}>
                      {p.kind === "image" ? (
                        <a href={p.dataUrl} target="_blank" rel="noopener noreferrer"><img src={p.dataUrl} alt={p.name} style={{ width: 120, height: 80, objectFit: "cover", display: "block" }} /></a>
                      ) : p.kind === "file" ? (
                        <a href={p.dataUrl} download={p.name} className="flex items-center gap-1.5" style={{ padding: "9px 11px", fontSize: 12.5, color: C.text, textDecoration: "none", fontWeight: 600 }}><FileText size={14} color={C.sub} /> {p.name}</a>
                      ) : (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5" style={{ padding: "9px 11px", fontSize: 12.5, color: C.international, textDecoration: "none", fontWeight: 600 }}><ExternalLink size={14} /> {p.name}</a>
                      )}
                      {canEdit && <button onClick={() => removeProof(p.id)} style={{ position: "absolute", top: 3, right: 3, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: 6, width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} color={C.rose} /></button>}
                    </div>
                  ))}
                </div>
                {err && <div style={{ fontSize: 12, color: C.rose, marginTop: 6 }}>{err}</div>}
                {canEdit && (
                  <div className="mt-2">
                    <div className="flex gap-2 flex-wrap items-center">
                      <label style={{ ...selStyleBtn, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                        <ImageIcon size={13} /> {busy ? "Uploading…" : "Upload screenshot / file"}
                        <input type="file" accept="image/*,.pdf,.doc,.docx,.txt,.csv" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) addFile(f); e.target.value = ""; }} style={{ display: "none" }} />
                      </label>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <input value={proofLabel} onChange={(e) => setProofLabel(e.target.value)} placeholder="Link label (optional)" style={{ ...inputStyle, flex: "1 1 120px", padding: "7px 9px" }} />
                      <input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Paste a link to proof (Drive, Figma…)" onKeyDown={(e) => e.key === "Enter" && addProofLink()} style={{ ...inputStyle, flex: "2 1 180px", padding: "7px 9px" }} />
                      <Btn sm kind="ghost" icon={<Plus size={13} />} onClick={addProofLink}>Add link</Btn>
                    </div>
                  </div>
                )}
          </DetailSection>

          {/* comments + activity */}
          <DetailSection icon={<MessageSquare size={15} color={C.ink} />} title="Comments & activity log">
            {canEdit && (
              <div className="flex gap-2 mb-3">
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment or update…" onKeyDown={(e) => { if (e.key === "Enter") { addComment(t.id, comment); setComment(""); } }} style={{ ...inputStyle, padding: "8px 10px" }} />
                <Btn sm kind="teal" icon={<Send size={13} />} onClick={() => { addComment(t.id, comment); setComment(""); }}>Send</Btn>
              </div>
            )}
            <div className="space-y-2.5">
              {timeline.length === 0 && <div style={{ fontSize: 12.5, color: C.sub }}>No comments or activity yet.</div>}
              {timeline.map((e) => (
                <div key={e.id} className="flex items-start gap-2.5">
                  <div style={{ marginTop: 2, width: 24, height: 24, borderRadius: 7, background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {e.kind === "comment" ? <MessageSquare size={12} color={C.ink2} /> : e.type === "reassign" ? <ArrowRightLeft size={12} color={C.international} /> : e.type === "status" ? <Activity size={12} color={C.amber} /> : e.type === "proof" ? <Paperclip size={12} color={C.sub} /> : e.type === "link" ? <Link2 size={12} color={C.sub} /> : <History size={12} color={C.sub} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {e.kind === "comment"
                      ? <div style={{ fontSize: 13 }}><b>{e.by}</b> <span style={{ color: C.sub, fontSize: 11.5 }}>· {relTime(e.ts)}</span><div style={{ marginTop: 1 }}>{e.text}</div></div>
                      : <div style={{ fontSize: 12.5, color: C.sub }}><b style={{ color: C.text }}>{e.by}</b> {e.text} · {relTime(e.ts)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>

          {canEdit && (
            <div className="flex justify-end" style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
              <Btn sm kind="danger" icon={<Trash2 size={13} />} onClick={() => { if (window.confirm(`Delete "${t.title}"? This can't be undone.`)) deleteTask(t.id); }}>Delete task</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
