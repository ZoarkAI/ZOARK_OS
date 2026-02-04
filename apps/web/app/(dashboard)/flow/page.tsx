'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, X, Edit2, Trash2, Save,
  CheckCircle, XCircle, Mail, Loader2,
  FileText, Clock, User,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  name: string;
  assigneeName: string;
  assigneeEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requiredDocs: string[];
  submittedDocs: string[];
  deadline: string;
  notes?: string;
  lastNudgedAt?: string;
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FlowPage() {
  const [pipelines,         setPipelines]         = useState<Pipeline[]>([]);
  const [selectedId,        setSelectedId]        = useState<string>('');
  const [loading,           setLoading]           = useState(true);
  const [showNewPipeline,   setShowNewPipeline]   = useState(false);
  const [newName,           setNewName]           = useState('');
  const [newDesc,           setNewDesc]           = useState('');
  const [showStageEditor,   setShowStageEditor]   = useState(false);
  const [editingStage,      setEditingStage]      = useState<PipelineStage | null>(null);

  useEffect(() => { loadPipelines(); }, []);

  async function loadPipelines() {
    try {
      const res = await fetch(`${API_URL}/invoices`);
      if (res.ok) {
        const invoices = await res.json();
        if (invoices.length > 0) {
          const pipes: Pipeline[] = [];
          for (const inv of invoices) {
            const stepsRes = await fetch(`${API_URL}/invoices/${inv.id}/approval-steps`);
            const steps    = stepsRes.ok ? await stepsRes.json() : [];
            pipes.push({
              id: inv.id,
              name: `Invoice $${inv.amount.toLocaleString()}`,
              description: `Status: ${inv.status}`,
              stages: steps.map(mapApiStep),
            });
          }
          setPipelines(pipes);
          setSelectedId(pipes[0].id);
          setLoading(false);
          return;
        }
      }
    } catch { /* fall through */ }
    const mocks = getMockPipelines();
    setPipelines(mocks);
    setSelectedId(mocks[0].id);
    setLoading(false);
  }

  const pipeline = pipelines.find(p => p.id === selectedId);

  // ── CRUD helpers ──────────────────────────────────────────────────────────

  function createPipeline() {
    if (!newName.trim()) return;
    const pipe: Pipeline = { id: `pipe-${Date.now()}`, name: newName.trim(), description: newDesc.trim() || undefined, stages: [] };
    setPipelines(prev => [...prev, pipe]);
    setSelectedId(pipe.id);
    setNewName(''); setNewDesc(''); setShowNewPipeline(false);
  }

  function addStage(stage: PipelineStage) {
    setPipelines(prev => prev.map(p => p.id === selectedId ? { ...p, stages: [...p.stages, stage] } : p));
    setShowStageEditor(false); setEditingStage(null);
  }

  function updateStage(stage: PipelineStage) {
    setPipelines(prev => prev.map(p =>
      p.id === selectedId ? { ...p, stages: p.stages.map(s => s.id === stage.id ? stage : s) } : p
    ));
    setShowStageEditor(false); setEditingStage(null);
  }

  function deleteStage(stageId: string) {
    setPipelines(prev => prev.map(p =>
      p.id === selectedId ? { ...p, stages: p.stages.filter(s => s.id !== stageId) } : p
    ));
  }

  async function setStageStatus(stageId: string, status: 'APPROVED' | 'REJECTED') {
    const action = status === 'APPROVED' ? 'approve' : 'reject';
    try { await fetch(`${API_URL}/invoices/${selectedId}/approval-steps/${stageId}/${action}`, { method: 'POST' }); } catch { /* optimistic */ }
    setPipelines(prev => prev.map(p =>
      p.id === selectedId ? { ...p, stages: p.stages.map(s => s.id === stageId ? { ...s, status } : s) } : p
    ));
  }

  async function nudgeStage(stageId: string) {
    try { await fetch(`${API_URL}/invoices/${selectedId}/approval-steps/${stageId}/nudge`, { method: 'POST' }); } catch { /* optimistic */ }
    setPipelines(prev => prev.map(p =>
      p.id === selectedId ? { ...p, stages: p.stages.map(s => s.id === stageId ? { ...s, lastNudgedAt: new Date().toISOString() } : s) } : p
    ));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-400">Loading pipelines…</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-1">Flow Engine</h1>
        <p className="text-gray-400">End-to-end approval pipeline management</p>
      </div>

      {/* Pipeline tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {pipelines.map(p => (
          <button key={p.id} onClick={() => setSelectedId(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedId === p.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'glass-card text-gray-300 hover:text-white glass-card-hover'
            }`}
          >
            {p.name}
          </button>
        ))}
        <button onClick={() => setShowNewPipeline(true)}
          className="px-3 py-2 rounded-lg text-sm text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 transition-all"
        >
          <Plus className="w-4 h-4 inline mr-1" />New Pipeline
        </button>
      </div>

      {/* ── Pipeline content ── */}
      {pipeline && (
        <>
          {/* Header card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{pipeline.name}</h2>
                  {pipeline.description && <p className="text-sm text-gray-400">{pipeline.description}</p>}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Approved: {pipeline.stages.filter(s => s.status === 'APPROVED').length}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Pending:  {pipeline.stages.filter(s => s.status === 'PENDING').length}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />   Rejected: {pipeline.stages.filter(s => s.status === 'REJECTED').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Horizontal stage cards */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-start gap-3 min-w-max">
              {pipeline.stages.map((stage, i) => (
                <StageCard
                  key={stage.id} stage={stage} index={i}
                  isLast={i === pipeline.stages.length - 1}
                  prevApproved={i === 0 || pipeline.stages[i - 1].status === 'APPROVED'}
                  onApprove={() => setStageStatus(stage.id, 'APPROVED')}
                  onReject={()  => setStageStatus(stage.id, 'REJECTED')}
                  onNudge={()   => nudgeStage(stage.id)}
                  onEdit={()    => { setEditingStage(stage); setShowStageEditor(true); }}
                  onDelete={()  => deleteStage(stage.id)}
                />
              ))}

              {/* + Add stage */}
              <button
                onClick={() => { setEditingStage(null); setShowStageEditor(true); }}
                className="w-[220px] min-h-[260px] border-2 border-dashed border-purple-500/40 rounded-xl flex flex-col items-center justify-center gap-2 text-purple-400 hover:text-purple-300 hover:border-purple-400 transition-all"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Add Stage</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Pipeline Progress</span>
                <span>{pipeline.stages.filter(s => s.status === 'APPROVED').length} / {pipeline.stages.length} stages approved</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${pipeline.stages.length > 0 ? (pipeline.stages.filter(s => s.status === 'APPROVED').length / pipeline.stages.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── New Pipeline Modal ── */}
      {showNewPipeline && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>New Pipeline</span>
                <button onClick={() => { setShowNewPipeline(false); setNewName(''); setNewDesc(''); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm text-gray-400 mb-1 block">Pipeline Name</label><Input placeholder="e.g. Contract Review Q1" value={newName} onChange={e => setNewName(e.target.value)} autoFocus /></div>
              <div><label className="text-sm text-gray-400 mb-1 block">Description</label><Input placeholder="What this pipeline is for…" value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setShowNewPipeline(false); setNewName(''); }}>Cancel</Button>
                <Button onClick={createPipeline} disabled={!newName.trim()}>Create Pipeline</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Stage Editor Modal ── */}
      {showStageEditor && (
        <StageEditorModal
          stage={editingStage}
          onSave={editingStage ? updateStage : addStage}
          onClose={() => { setShowStageEditor(false); setEditingStage(null); }}
        />
      )}
    </div>
  );
}

// ── Stage card ────────────────────────────────────────────────────────────────

function StageCard({
  stage, index, isLast, prevApproved,
  onApprove, onReject, onNudge, onEdit, onDelete,
}: {
  stage: PipelineStage; index: number; isLast: boolean; prevApproved: boolean;
  onApprove: () => void; onReject: () => void; onNudge: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const [nudging, setNudging] = useState(false);

  const color = {
    PENDING:  { border: 'border-yellow-500/50', bg: 'bg-yellow-500/10', badge: 'bg-yellow-500/20 text-yellow-400' },
    APPROVED: { border: 'border-green-500/50',  bg: 'bg-green-500/10',  badge: 'bg-green-500/20 text-green-400'  },
    REJECTED: { border: 'border-red-500/50',    bg: 'bg-red-500/10',    badge: 'bg-red-500/20 text-red-400'      },
  }[stage.status];

  const isOverdue    = stage.status === 'PENDING' && new Date(stage.deadline) < new Date();
  const canAct       = stage.status === 'PENDING' && prevApproved;
  const docsRequired = stage.requiredDocs.length;
  const docsSubmitted = stage.submittedDocs.length;
  const docsOk       = docsRequired === 0 || docsSubmitted >= docsRequired;

  return (
    <div className="flex items-start gap-1.5">
      <div className={`w-[220px] glass-card border-2 ${color.border} ${color.bg} rounded-xl p-4 space-y-3`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold">#{index + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${color.badge}`}>{stage.status}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onEdit}   className="text-gray-500 hover:text-white p-0.5"><Edit2  className="w-3 h-3" /></button>
            <button onClick={onDelete} className="text-gray-500 hover:text-red-400 p-0.5"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-bold text-sm">{stage.name}</h3>

        {/* Assignee */}
        <div>
          <p className="text-xs text-gray-500 flex items-center gap-1"><User className="w-2.5 h-2.5" /> Assignee</p>
          <p className="text-sm font-medium">{stage.assigneeName}</p>
          <p className="text-xs text-gray-500">{stage.assigneeEmail}</p>
        </div>

        {/* Deadline */}
        <div>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Deadline</p>
          <p className={`text-sm ${isOverdue ? 'text-red-400' : ''}`}>
            {new Date(stage.deadline).toLocaleDateString()}
            {isOverdue && <span className="text-xs ml-1">(Overdue)</span>}
          </p>
        </div>

        {/* Documents */}
        {docsRequired > 0 && (
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><FileText className="w-2.5 h-2.5" /> Documents</p>
            <div className="flex flex-wrap gap-1">
              {stage.requiredDocs.map(doc => {
                const submitted = stage.submittedDocs.includes(doc);
                return (
                  <span key={doc} className={`text-xs px-1.5 py-0.5 rounded ${submitted ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {submitted ? '✓ ' : ''}{doc}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-1">{docsSubmitted}/{docsRequired} submitted</p>
          </div>
        )}

        {/* Notes */}
        {stage.notes && <p className="text-xs text-gray-500 italic">"{stage.notes}"</p>}

        {/* Actions for pending stages */}
        {stage.status === 'PENDING' && (
          <div className="space-y-2 pt-1 border-t border-glass-border">
            <div className="flex gap-2">
              <button onClick={onApprove} disabled={!canAct || !docsOk}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button onClick={onReject} disabled={!canAct}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle className="w-3 h-3" /> Reject
              </button>
            </div>
            <button
              onClick={async () => { setNudging(true); await onNudge(); setNudging(false); }}
              disabled={nudging}
              className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded glass-card-hover disabled:opacity-50"
            >
              {nudging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
              {nudging ? 'Sending…' : 'Send Nudge'}
            </button>
            {stage.lastNudgedAt && <p className="text-xs text-gray-600 text-center">Nudged {formatAgo(stage.lastNudgedAt)}</p>}
          </div>
        )}

        {/* Blocked message */}
        {!prevApproved && stage.status === 'PENDING' && (
          <p className="text-xs text-yellow-500 text-center">⏳ Waiting for previous stage</p>
        )}

        {/* Docs gate warning */}
        {canAct && !docsOk && (
          <p className="text-xs text-orange-400 text-center">📎 Submit required docs first</p>
        )}
      </div>

      {/* Arrow */}
      {!isLast && (
        <div className="flex items-center self-start mt-[120px]">
          <div className="h-0.5 w-5 bg-gray-600" />
          <div className="border-r-2 border-t-2 border-gray-600 w-3 h-3 rotate-45 -ml-1.5" />
        </div>
      )}
    </div>
  );
}

// ── Stage editor modal ────────────────────────────────────────────────────────

function StageEditorModal({
  stage, onSave, onClose,
}: {
  stage: PipelineStage | null;
  onSave: (s: PipelineStage) => void;
  onClose: () => void;
}) {
  const [name,          setName]          = useState(stage?.name || '');
  const [assigneeName,  setAssigneeName]  = useState(stage?.assigneeName || '');
  const [assigneeEmail, setAssigneeEmail] = useState(stage?.assigneeEmail || '');
  const [deadline,      setDeadline]      = useState(stage?.deadline ? new Date(stage.deadline).toISOString().slice(0, 16) : '');
  const [requiredDocs,  setRequiredDocs]  = useState<string[]>(stage?.requiredDocs || []);
  const [newDoc,        setNewDoc]        = useState('');
  const [notes,         setNotes]         = useState(stage?.notes || '');

  function addDoc() { if (newDoc.trim()) { setRequiredDocs(p => [...p, newDoc.trim()]); setNewDoc(''); } }
  function removeDoc(d: string) { setRequiredDocs(p => p.filter(x => x !== d)); }

  function handleSave() {
    if (!name.trim() || !assigneeEmail.trim() || !deadline) return;
    onSave({
      id:            stage?.id || `stage-${Date.now()}`,
      name:          name.trim(),
      assigneeName:  assigneeName.trim() || assigneeEmail.split('@')[0],
      assigneeEmail: assigneeEmail.trim(),
      status:        stage?.status || 'PENDING',
      requiredDocs,
      submittedDocs: stage?.submittedDocs || [],
      deadline:      new Date(deadline).toISOString(),
      notes:         notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="max-w-lg w-full mx-4 max-h-[85vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{stage ? 'Edit Stage' : 'Add New Stage'}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Stage Name *</label>
            <Input placeholder="e.g. Legal Review, Finance Check" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Assignee Name</label>
              <Input placeholder="John Doe" value={assigneeName} onChange={e => setAssigneeName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Assignee Email *</label>
              <Input placeholder="john@company.com" value={assigneeEmail} onChange={e => setAssigneeEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Deadline *</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Required Documents</label>
            <div className="flex gap-2">
              <Input placeholder="e.g. contract.pdf" value={newDoc} onChange={e => setNewDoc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDoc(); } }} className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={addDoc}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {requiredDocs.map(doc => (
                <span key={doc} className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
                  {doc} <button onClick={() => removeDoc(doc)} className="text-blue-300 hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional instructions…" rows={2}
              className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !assigneeEmail.trim() || !deadline}>
              <Save className="w-4 h-4 mr-2" />{stage ? 'Save Changes' : 'Add Stage'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0)  return `${hrs}h ago`;
  return 'Recently';
}

function mapApiStep(s: any): PipelineStage {
  return {
    id: s.id, name: s.stage?.replace(/_/g, ' ') || 'Stage',
    assigneeName: s.assigneeName || s.assigneeEmail?.split('@')[0] || 'Assignee',
    assigneeEmail: s.assigneeEmail || '',
    status: s.status || 'PENDING',
    requiredDocs: s.requiredDocs || [],
    submittedDocs: s.submittedDocs || [],
    deadline: s.deadline || new Date().toISOString(),
    notes: s.notes,
    lastNudgedAt: s.lastNudgedAt,
  };
}

function getMockPipelines(): Pipeline[] {
  const now      = Date.now();
  const day      = 86400000;
  const iso = (ms: number) => new Date(ms).toISOString();

  return [
    {
      id: 'pipe-1', name: 'Invoice #50,000',
      description: 'Software development services — Q1 2024',
      stages: [
        { id: 's1', name: 'Legal Review',       assigneeName: 'Sarah Legal',  assigneeEmail: 'sarah@legal.com',   status: 'APPROVED', requiredDocs: ['contract.pdf', 'sow.pdf'],  submittedDocs: ['contract.pdf', 'sow.pdf'], deadline: iso(now - day),     notes: 'Standard NDA clause included' },
        { id: 's2', name: 'Finance Check',      assigneeName: 'Mike Finance', assigneeEmail: 'mike@finance.com',  status: 'PENDING',  requiredDocs: ['invoice.pdf'],             submittedDocs: [],                          deadline: iso(now - day),     notes: 'Verify budget allocation' },
        { id: 's3', name: 'Manager Approval',   assigneeName: 'Lisa Manager', assigneeEmail: 'lisa@manager.com',  status: 'PENDING',  requiredDocs: [],                         submittedDocs: [],                          deadline: iso(now + day) },
        { id: 's4', name: 'Executive Sign-off', assigneeName: 'Tom Exec',     assigneeEmail: 'tom@exec.com',      status: 'PENDING',  requiredDocs: ['budget.xlsx'],            submittedDocs: [],                          deadline: iso(now + 7*day),   notes: 'Final sign-off required' },
      ],
    },
    {
      id: 'pipe-2', name: 'Contract Review',
      description: 'Vendor partnership — 12-month term',
      stages: [
        { id: 's5', name: 'Terms Review',       assigneeName: 'Rachel Terms', assigneeEmail: 'rachel@terms.com',        status: 'APPROVED', requiredDocs: ['draft_contract.pdf'], submittedDocs: ['draft_contract.pdf'], deadline: iso(now - day) },
        { id: 's6', name: 'Compliance Check',   assigneeName: 'Dan Compliance', assigneeEmail: 'dan@compliance.com',    status: 'PENDING',  requiredDocs: ['compliance_form.pdf'], submittedDocs: [],                   deadline: iso(now + day),   notes: 'Ensure GDPR compliance' },
        { id: 's7', name: 'Board Approval',     assigneeName: 'Karen Board',  assigneeEmail: 'karen@board.com',         status: 'PENDING',  requiredDocs: [],                     submittedDocs: [],                   deadline: iso(now + 7*day) },
      ],
    },
    {
      id: 'pipe-3', name: 'Project Kickoff',
      description: 'New client onboarding pipeline — empty, ready to build',
      stages: [],
    },
  ];
}
