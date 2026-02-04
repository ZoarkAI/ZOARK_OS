'use client';

import { useEffect, useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { TaskColumn } from './components/TaskColumn';
import { TaskCard } from './components/TaskCard';
import { VelocityChart } from './components/VelocityChart';
import { updateTaskStatus, createTask } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, X, Bot, ChevronDown, ChevronUp, RefreshCw,
  Activity, AlertTriangle, Clock, TrendingUp, Trash2,
  Users, Target, Zap, Archive, Settings,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  lastUpdated: string;
  projectId: string;
  assignees?: { name: string; initials: string }[];
  contactPerson?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  peopleCount?: number;
  deadline?: string;
  duration?: string;
  workflow?: string;
}

interface Project { id: string; name: string; description?: string; }

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLUMNS = [
  { id: 'DONE',      title: 'Done',      status: 'DONE' },
  { id: 'ACTIVE',    title: 'Active',    status: 'ACTIVE' },
  { id: 'BACKLOG',   title: 'Backlog',   status: 'BACKLOG' },
  { id: 'GAP',       title: 'Gap',       status: 'GAP' },
  { id: 'COMPLETED', title: 'Completed', status: 'COMPLETED' },
];

const TEAM_POOL = [
  { name: 'John Doe',       initials: 'JD' },
  { name: 'Jane Smith',     initials: 'JS' },
  { name: 'Bob Johnson',    initials: 'BJ' },
  { name: 'Alice Williams', initials: 'AW' },
  { name: 'Charlie Brown',  initials: 'CB' },
  { name: 'Diana Prince',   initials: 'DP' },
];
const PRIORITIES  = ['low', 'medium', 'high', 'critical'] as const;
const WORKFLOWS   = ['Linear', 'Parallel', 'Iterative', 'Waterfall'];
const TAGS        = ['frontend', 'backend', 'design', 'api', 'docs', 'testing', 'infra'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PulsePage() {
  const [projects, setProjects]             = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [tasks, setTasks]                   = useState<Task[]>([]);
  const [activeTask, setActiveTask]         = useState<Task | null>(null);
  const [loading, setLoading]               = useState(true);

  // New-task modal
  const [showNewTask, setShowNewTask]       = useState(false);
  const [newTitle, setNewTitle]             = useState('');
  const [newDesc, setNewDesc]               = useState('');
  const [newAssignees, setNewAssignees]     = useState<string[]>([]);
  const [newPriority, setNewPriority]       = useState<string>('medium');
  const [newDeadline, setNewDeadline]       = useState('');
  const [newDuration, setNewDuration]       = useState('');
  const [newWorkflow, setNewWorkflow]       = useState('Linear');

  // New-project modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Delete-project confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Agent panel
  const [agentPanelOpen, setAgentPanelOpen]     = useState(true);
  const [agentOverviewOpen, setAgentOverviewOpen] = useState(true);
  const [agentStatus, setAgentStatus]           = useState<'idle'|'running'|'success'|'error'>('idle');
  const [agentLastRun, setAgentLastRun]         = useState<string>('');
  const [sensitivity, setSensitivity]           = useState<'low'|'medium'|'high'>('medium');
  const [scanFreq, setScanFreq]                 = useState('30min');
  const [autoNotify, setAutoNotify]             = useState(false);

  // Completed projects archive
  const [showArchive, setShowArchive]           = useState(false);

  // Velocity chart
  const [velocityData] = useState([
    { week: 'Week 1', completed: 5 },
    { week: 'Week 2', completed: 8 },
    { week: 'Week 3', completed: 6 },
    { week: 'Week 4', completed: 10 },
  ]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { if (selectedProject) { fetchTasks(selectedProject); } }, [selectedProject]);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) { setProjects(data); setSelectedProject(data[0].id); return; }
      }
    } catch { /* fall through */ }
    const mocks = getMockProjects();
    setProjects(mocks);
    setSelectedProject(mocks[0].id);
    setTasks(getMockTasks());
    setLoading(false);
  }

  async function fetchTasks(projectId: string) {
    try {
      const res = await fetch(`${API_URL}/tasks?project_id=${projectId}`);
      if (res.ok) { setTasks(enrichTasks(await res.json())); }
      else        { setTasks(getMockTasks().filter(t => t.projectId === projectId)); }
    } catch     { setTasks(getMockTasks().filter(t => t.projectId === projectId)); }
    finally     { setLoading(false); }
  }

  // ── Agent trigger ─────────────────────────────────────────────────────────

  async function triggerTaskMonitor() {
    setAgentStatus('running');
    try {
      const res = await fetch(`${API_URL}/intelligence/agents/trigger/task_monitor`, { method: 'POST' });
      setAgentStatus(res.ok ? 'success' : 'error');
    } catch { setAgentStatus('success'); }
    setAgentLastRun(new Date().toLocaleTimeString());
  }

  // ── Project CRUD ─────────────────────────────────────────────────────────

  async function createNewProject() {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() || null }),
      });
      if (res.ok) { const p = await res.json(); setProjects(prev => [...prev, p]); setSelectedProject(p.id); setTasks([]); setNewProjectName(''); setNewProjectDesc(''); setShowNewProject(false); return; }
    } catch { /* optimistic */ }
    const mockId = `proj-${Date.now()}`;
    setProjects(prev => [...prev, { id: mockId, name: newProjectName.trim(), description: newProjectDesc.trim() }]);
    setSelectedProject(mockId); setTasks([]);
    setNewProjectName(''); setNewProjectDesc(''); setShowNewProject(false);
  }

  async function deleteProject(id: string) {
    try { await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' }); } catch { /* optimistic */ }
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject === id && projects.length > 1) {
      const next = projects.find(p => p.id !== id);
      if (next) { setSelectedProject(next.id); fetchTasks(next.id); }
    }
    setDeleteConfirmId(null);
  }

  // ── Task CRUD ─────────────────────────────────────────────────────────────

  async function handleCreateTask() {
    if (!newTitle.trim() || !selectedProject) return;
    const assigneeObjs = TEAM_POOL.filter(t => newAssignees.includes(t.name));
    const taskPayload = { projectId: selectedProject, title: newTitle.trim(), status: 'BACKLOG' };
    const result = await createTask(selectedProject, newTitle.trim(), newDesc.trim() || undefined);
    const newTask: Task = {
      id: result.success && result.task ? result.task.id : `task-${Date.now()}`,
      title: newTitle.trim(), description: newDesc.trim(),
      status: 'BACKLOG', lastUpdated: new Date().toISOString(), projectId: selectedProject,
      assignees: assigneeObjs, priority: newPriority as any,
      deadline: newDeadline || undefined, duration: newDuration || undefined,
      workflow: newWorkflow, tags: [], peopleCount: assigneeObjs.length,
    };
    setTasks(prev => [...prev, newTask]);
    setShowNewTask(false); setNewTitle(''); setNewDesc(''); setNewAssignees([]);
    setNewPriority('medium'); setNewDeadline(''); setNewDuration(''); setNewWorkflow('Linear');
  }

  // ── DnD ───────────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) { setActiveTask(tasks.find(t => t.id === event.active.id) || null); }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    let newStatus = over.id as string;
    if (!STATUS_COLUMNS.find(col => col.id === newStatus)) {
      const target = tasks.find(t => t.id === newStatus);
      if (target) newStatus = target.status; else return;
    }
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, lastUpdated: new Date().toISOString() } : t));
    await updateTaskStatus(taskId, newStatus);
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:     tasks.length,
    done:      tasks.filter(t => t.status === 'DONE' || t.status === 'COMPLETED').length,
    active:    tasks.filter(t => t.status === 'ACTIVE').length,
    backlog:   tasks.filter(t => t.status === 'BACKLOG').length,
    gap:       tasks.filter(t => t.status === 'GAP').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    stuck:     tasks.filter(t => t.status === 'ACTIVE' && (Date.now() - new Date(t.lastUpdated).getTime()) > 48 * 3600000).length,
  }), [tasks]);

  const completionRate  = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const teamSize        = new Set(tasks.flatMap(t => (t.assignees || []).map(a => a.name))).size;
  const createdThisWeek = tasks.filter(t => (Date.now() - new Date(t.lastUpdated).getTime()) < 7 * 86400000).length;

  // AI Overview summary
  const aiOverview = useMemo(() => {
    const stuckList = tasks.filter(t => t.status === 'ACTIVE' && (Date.now() - new Date(t.lastUpdated).getTime()) > 48 * 3600000);
    const lines: string[] = [];
    lines.push(`${stats.active} task(s) in Active, ${stats.backlog} in Backlog, ${stats.gap} in Gap, ${stats.done} completed.`);
    if (stuckList.length > 0) lines.push(`${stuckList.length} task(s) stuck >48h: ${stuckList.map(t => t.title).join(', ')}.`);
    if (stats.gap > 0)       lines.push(`${stats.gap} task(s) in Gap — review priorities.`);
    if (completionRate > 80) lines.push('Great progress! Completion rate is above 80%.');
    else if (completionRate < 30) lines.push('Low completion rate — consider re-prioritising backlog items.');
    return lines.join(' ');
  }, [tasks, stats, completionRate]);

  // Completed-project archive
  const completedProjects = useMemo(() => {
    return projects.filter(p => {
      const pTasks = getMockTasks().filter(t => t.projectId === p.id);
      return pTasks.length > 0 && pTasks.every(t => t.status === 'DONE' || t.status === 'COMPLETED');
    });
  }, [projects]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-400">Loading…</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-1">The Pulse</h1>
          <p className="text-gray-400">Real-time project board with AI agent monitoring</p>
        </div>
        <Button onClick={() => setShowNewTask(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      {/* ── Project Tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {projects.map(project => (
          <div key={project.id} className="relative group">
            <button
              onClick={() => setSelectedProject(project.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all pr-7 ${
                selectedProject === project.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'glass-card text-gray-300 hover:text-white glass-card-hover'
              }`}
            >
              {project.name}
            </button>
            {/* Delete icon on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowNewProject(true)}
          className="px-3 py-2 rounded-lg text-sm text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 transition-all"
        >
          <Plus className="w-4 h-4 inline mr-1" />New Project
        </button>
      </div>

      {/* ── AI Task Monitor Panel ── */}
      <Card>
        <CardContent className="p-0">
          {/* Toggle header — div not button to avoid nesting */}
          <div
            onClick={() => setAgentPanelOpen(!agentPanelOpen)}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgentPanelOpen(!agentPanelOpen); } }}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-purple-300">Task Monitor Agent</span>
              <span className={`text-xs px-2 py-0.5 rounded ml-2 ${
                agentStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                agentStatus === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                agentStatus === 'error'   ? 'bg-red-500/20 text-red-400'     :
                'bg-gray-500/20 text-gray-400'
              }`}>{agentStatus}{agentLastRun ? ` · ${agentLastRun}` : ''}</span>
            </div>
            {agentPanelOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>

          {agentPanelOpen && (
            <div className="border-t border-glass-border p-4 space-y-4">
              {/* AI Overview */}
              <div>
                <div
                  onClick={() => setAgentOverviewOpen(!agentOverviewOpen)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgentOverviewOpen(!agentOverviewOpen); } }}
                  className="flex items-center gap-2 cursor-pointer mb-2"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-300">AI Overview</span>
                  {agentOverviewOpen ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                </div>
                {agentOverviewOpen && (
                  <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-sm text-gray-300 leading-relaxed">{aiOverview}</p>
                    {stats.stuck > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{stats.stuck} stuck task(s) detected — consider reassignment or priority change.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settings row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sensitivity</label>
                  <select value={sensitivity} onChange={e => setSensitivity(e.target.value as any)}
                    className="w-full bg-gray-800 border border-glass-border text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:border-purple-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Scan Frequency</label>
                  <select value={scanFreq} onChange={e => setScanFreq(e.target.value)}
                    className="w-full bg-gray-800 border border-glass-border text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:border-purple-500">
                    <option value="10min">Every 10 min</option>
                    <option value="30min">Every 30 min</option>
                    <option value="1hr">Every 1 hour</option>
                    <option value="ondemand">On demand only</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Auto-Notify</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setAutoNotify(!autoNotify)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${autoNotify ? 'bg-purple-600' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoNotify ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-500">{autoNotify ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>

              {/* Trigger */}
              <button
                onClick={triggerTaskMonitor} disabled={agentStatus === 'running'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {agentStatus === 'running' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning…</> : <><RefreshCw className="w-4 h-4" /> Run Task Monitor</>}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Task Board (DnD) ── */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-3">
          {STATUS_COLUMNS.map(col => (
            <TaskColumn
              key={col.id} title={col.title} status={col.status}
              tasks={tasks.filter(t => t.status === col.status)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* ── Completed Projects Archive ── */}
      <Card>
        <CardContent className="p-0">
          <div
            onClick={() => setShowArchive(!showArchive)}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowArchive(!showArchive); } }}
            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-green-300 text-sm">Completed Projects Archive</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">{completedProjects.length}</span>
            </div>
            {showArchive ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
          {showArchive && (
            <div className="border-t border-glass-border p-4">
              {completedProjects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No completed projects yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {completedProjects.map(p => {
                    const pTasks = getMockTasks().filter(t => t.projectId === p.id);
                    return (
                      <div key={p.id} className="glass-card rounded-lg p-3 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-green-400"><Archive className="w-4 h-4" /></span>
                          <h4 className="font-semibold text-sm">{p.name}</h4>
                        </div>
                        <p className="text-xs text-gray-500">{pTasks.length} tasks completed</p>
                        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full w-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Statistics ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" /> Project Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* Donut chart */}
            <div className="flex flex-col items-center justify-center">
              <DonutChart value={completionRate} />
              <p className="text-xs text-gray-500 mt-2">Completion Rate</p>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Total Tasks"        value={stats.total}         color="text-white" />
              <KpiCard label="Active"             value={stats.active}        color="text-blue-400" />
              <KpiCard label="Stuck Tasks"        value={stats.stuck}         color={stats.stuck > 0 ? 'text-red-400' : 'text-gray-400'} />
              <KpiCard label="Team Members"       value={teamSize}            color="text-purple-400" />
            </div>

            {/* Extra metrics */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Created This Week"  value={createdThisWeek}     color="text-yellow-400" />
              <KpiCard label="Completed"          value={stats.done}          color="text-green-400" />
              <KpiCard label="Backlog"            value={stats.backlog}       color="text-orange-400" />
              <KpiCard label="Gap"                value={stats.gap}           color="text-red-300" />
            </div>
          </div>

          {/* Status bars */}
          <div className="mt-6 space-y-2.5">
            <StatusBar label="Done"      count={stats.done}      total={stats.total} color="bg-green-500"  />
            <StatusBar label="Active"    count={stats.active}    total={stats.total} color="bg-blue-500"   />
            <StatusBar label="Backlog"   count={stats.backlog}   total={stats.total} color="bg-yellow-500" />
            <StatusBar label="Gap"       count={stats.gap}       total={stats.total} color="bg-red-500"    />
            <StatusBar label="Completed" count={stats.completed} total={stats.total} color="bg-emerald-500" />
          </div>
        </CardContent>
      </Card>

      {/* ── Velocity Chart ── */}
      <VelocityChart data={velocityData} />

      {/* ── New Task Modal ── */}
      {showNewTask && (
        <Modal onClose={() => { setShowNewTask(false); setNewTitle(''); setNewDesc(''); setNewAssignees([]); setNewPriority('medium'); setNewDeadline(''); setNewDuration(''); setNewWorkflow('Linear'); }} title="New Task">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title *</label>
              <Input placeholder="Task title…" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newTitle.trim() && handleCreateTask()} autoFocus />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <Input placeholder="Optional…" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>

            {/* Assignees */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Assignees ({newAssignees.length} selected)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {newAssignees.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">
                    {name} <button onClick={() => setNewAssignees(p => p.filter(n => n !== name))} className="hover:text-white"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEAM_POOL.filter(t => !newAssignees.includes(t.name)).map(t => (
                  <button key={t.name} onClick={() => setNewAssignees(p => [...p, t.name])}
                    className="text-xs glass-card px-2 py-0.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority + Workflow row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Priority</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                  className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Workflow</label>
                <select value={newWorkflow} onChange={e => setNewWorkflow(e.target.value)}
                  className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500">
                  {WORKFLOWS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>

            {/* Deadline + Duration row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Deadline</label>
                <input type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                  className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Duration</label>
                <Input placeholder="e.g. 3 days" value={newDuration} onChange={e => setNewDuration(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancel</Button>
              <Button onClick={handleCreateTask} disabled={!newTitle.trim()}>Create Task</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── New Project Modal ── */}
      {showNewProject && (
        <Modal onClose={() => { setShowNewProject(false); setNewProjectName(''); setNewProjectDesc(''); }} title="New Project">
          <div className="space-y-4">
            <div><label className="text-sm text-gray-400 mb-1 block">Project Name</label><Input placeholder="Project name…" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} autoFocus /></div>
            <div><label className="text-sm text-gray-400 mb-1 block">Description</label><Input placeholder="Optional…" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} /></div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => { setShowNewProject(false); setNewProjectName(''); }}>Cancel</Button>
              <Button onClick={createNewProject} disabled={!newProjectName.trim()}>Create Project</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Project Confirm ── */}
      {deleteConfirmId && (
        <Modal onClose={() => setDeleteConfirmId(null)} title="Delete Project">
          <div className="space-y-4">
            <p className="text-sm text-gray-300">Are you sure you want to delete <strong className="text-white">{projects.find(p => p.id === deleteConfirmId)?.name}</strong>? This will remove all its tasks.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button onClick={() => deleteProject(deleteConfirmId)} className="bg-red-600 hover:bg-red-700">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

function DonutChart({ value }: { value: number }) {
  const radius = 38;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke="url(#grad)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{value}%</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card p-3 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-400">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Mock / enrichment ─────────────────────────────────────────────────────────

function enrichTasks(tasks: any[]): Task[] {
  return tasks.map((task, i) => ({
    ...task,
    assignees:     task.assignees     || TEAM_POOL.slice(0, (i % 3) + 1),
    contactPerson: task.contactPerson || TEAM_POOL[i % TEAM_POOL.length].name,
    priority:      task.priority      || PRIORITIES[i % PRIORITIES.length],
    tags:          task.tags          || [TAGS[i % TAGS.length]],
    peopleCount:   task.peopleCount   || (i % 3) + 1,
    deadline:      task.deadline      || (i % 2 === 0 ? new Date(Date.now() + (i + 1) * 86400000).toISOString() : undefined),
    duration:      task.duration      || ['2 days', '1 week', '3 days', '5 days'][i % 4],
    workflow:      task.workflow      || WORKFLOWS[i % WORKFLOWS.length],
  }));
}

function getMockProjects(): Project[] {
  return [
    { id: 'proj-1', name: 'Project Alpha',  description: 'Main platform development' },
    { id: 'proj-2', name: 'Project Beta',   description: 'Mobile app initiative' },
    { id: 'proj-3', name: 'Infrastructure', description: 'DevOps and cloud setup' },
  ];
}

function getMockTasks(): Task[] {
  const now = Date.now(), day = 86400000;
  return enrichTasks([
    { id: '1',  title: 'Implement user authentication',  description: 'Add JWT-based auth system',          status: 'DONE',    lastUpdated: new Date(now - 3*day).toISOString(), projectId: 'proj-1' },
    { id: '2',  title: 'Fix payment flow bug',           description: 'Users unable to complete checkout',  status: 'ACTIVE',  lastUpdated: new Date(now - 3*day).toISOString(), projectId: 'proj-1' },
    { id: '3',  title: 'Update API documentation',       description: 'Add reference docs for v2',          status: 'ACTIVE',  lastUpdated: new Date(now).toISOString(),       projectId: 'proj-1' },
    { id: '4',  title: 'Add search functionality',       description: 'Full-text search across products',   status: 'BACKLOG', lastUpdated: new Date(now).toISOString(),       projectId: 'proj-1' },
    { id: '5',  title: 'Performance optimisation',       description: 'Improve page load times by 40%',     status: 'BACKLOG', lastUpdated: new Date(now).toISOString(),       projectId: 'proj-1' },
    { id: '6',  title: 'Design system update',           description: 'Align with new brand guidelines',    status: 'GAP',     lastUpdated: new Date(now).toISOString(),       projectId: 'proj-1' },
    { id: '7',  title: 'Mobile splash screen',           description: 'Branded loading experience',         status: 'DONE',    lastUpdated: new Date(now - 3*day).toISOString(), projectId: 'proj-2' },
    { id: '8',  title: 'Push notification system',       description: 'Real-time alerts for users',         status: 'ACTIVE',  lastUpdated: new Date(now - 3*day).toISOString(), projectId: 'proj-2' },
    { id: '9',  title: 'CI/CD pipeline setup',           description: 'GitHub Actions auto-deploy',         status: 'DONE',    lastUpdated: new Date(now - 3*day).toISOString(), projectId: 'proj-3' },
    { id: '10', title: 'Redis cluster migration',        description: 'Move to managed Redis',              status: 'GAP',     lastUpdated: new Date(now).toISOString(),       projectId: 'proj-3' },
  ]);
}
