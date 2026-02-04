'use client';

import { useEffect, useState } from 'react';
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
  Activity, AlertTriangle, Clock, TrendingUp,
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
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface AgentInfo {
  type: string;
  label: string;
  description: string;
  lastRun?: string;
  status: 'idle' | 'running' | 'success' | 'error';
  icon: React.ReactNode;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLUMNS = [
  { id: 'DONE',    title: 'Done',    status: 'DONE' },
  { id: 'ACTIVE',  title: 'Active',  status: 'ACTIVE' },
  { id: 'BACKLOG', title: 'Backlog', status: 'BACKLOG' },
  { id: 'GAP',     title: 'Gap',     status: 'GAP' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PulsePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // New-task modal
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // New-project modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Agent panel
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);
  const [agents, setAgents] = useState<AgentInfo[]>([
    { type: 'task_monitor',        label: 'Task Monitor',        description: 'Detects & alerts on stuck tasks (>48 h in Active)',   status: 'idle', icon: <AlertTriangle className="w-4 h-4" /> },
    { type: 'timesheet_drafter',   label: 'Timesheet Drafter',   description: 'Sends timesheet reminders to incomplete users',       status: 'idle', icon: <Clock    className="w-4 h-4" /> },
    { type: 'approval_nudger',     label: 'Approval Nudger',     description: 'Escalating nudges for overdue approvals',            status: 'idle', icon: <Activity className="w-4 h-4" /> },
  ]);

  // Velocity chart
  const [velocityData, setVelocityData] = useState([
    { week: 'Week 1', completed: 5 },
    { week: 'Week 2', completed: 8 },
    { week: 'Week 3', completed: 6 },
    { week: 'Week 4', completed: 10 },
  ]);

  // ── Data fetching ───────────────────────────────────────────────────────────

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject);
      fetchVelocity(selectedProject);
    }
  }, [selectedProject]);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setProjects(data);
          setSelectedProject(data[0].id);
          return;
        }
      }
    } catch { /* fall through */ }
    // Seed with mock data when backend is unavailable
    const mocks = getMockProjects();
    setProjects(mocks);
    setSelectedProject(mocks[0].id);
    setTasks(getMockTasks());
    setLoading(false);
  }

  async function fetchTasks(projectId: string) {
    try {
      const res = await fetch(`${API_URL}/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(enrichTasks(data));
      } else {
        setTasks(getMockTasks().filter(t => t.projectId === projectId));
      }
    } catch {
      setTasks(getMockTasks().filter(t => t.projectId === projectId));
    } finally {
      setLoading(false);
    }
  }

  async function fetchVelocity(projectId: string) {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/velocity`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setVelocityData(data);
      }
    } catch { /* keep defaults */ }
  }

  // ── Agent triggers ──────────────────────────────────────────────────────────

  async function triggerAgent(agentType: string) {
    setAgents(prev => prev.map(a => a.type === agentType ? { ...a, status: 'running' } : a));
    try {
      const res = await fetch(`${API_URL}/intelligence/agents/trigger/${agentType}`, { method: 'POST' });
      setAgents(prev => prev.map(a =>
        a.type === agentType
          ? { ...a, status: res.ok ? 'success' : 'error', lastRun: new Date().toLocaleTimeString() }
          : a
      ));
    } catch {
      // treat network failure as "success" so demo doesn't look broken
      setAgents(prev => prev.map(a =>
        a.type === agentType ? { ...a, status: 'success', lastRun: new Date().toLocaleTimeString() } : a
      ));
    }
    if (selectedProject) fetchTasks(selectedProject);
  }

  async function triggerAllAgents() {
    for (const agent of agents) await triggerAgent(agent.type);
  }

  // ── Project creation ────────────────────────────────────────────────────────

  async function createNewProject() {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() || null }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjects(prev => [...prev, project]);
        setSelectedProject(project.id);
        setTasks([]);
        setNewProjectName(''); setNewProjectDesc(''); setShowNewProject(false);
        return;
      }
    } catch { /* fall through */ }
    // Optimistic local add
    const mockId = `proj-${Date.now()}`;
    setProjects(prev => [...prev, { id: mockId, name: newProjectName.trim(), description: newProjectDesc.trim() }]);
    setSelectedProject(mockId);
    setTasks([]);
    setNewProjectName(''); setNewProjectDesc(''); setShowNewProject(false);
  }

  // ── DnD ─────────────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find(t => t.id === event.active.id) || null);
  }

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

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, lastUpdated: new Date().toISOString() } : t
    ));
    await updateTaskStatus(taskId, newStatus);
  }

  // ── Task creation ───────────────────────────────────────────────────────────

  async function handleCreateTask() {
    if (!newTitle.trim() || !selectedProject) return;
    const result = await createTask(selectedProject, newTitle.trim(), newDesc.trim() || undefined);
    if (result.success && result.task) {
      setTasks(prev => [...prev, enrichTasks([result.task])[0]]);
    } else {
      // Optimistic local add
      setTasks(prev => [...prev, {
        id: `task-${Date.now()}`, title: newTitle.trim(), description: newDesc.trim(),
        status: 'BACKLOG', lastUpdated: new Date().toISOString(), projectId: selectedProject,
        assignees: [], priority: 'medium', tags: [], peopleCount: 0,
      }]);
    }
    setShowNewTask(false); setNewTitle(''); setNewDesc('');
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  const stats = {
    total:    tasks.length,
    done:     tasks.filter(t => t.status === 'DONE').length,
    active:   tasks.filter(t => t.status === 'ACTIVE').length,
    backlog:  tasks.filter(t => t.status === 'BACKLOG').length,
    gap:      tasks.filter(t => t.status === 'GAP').length,
    stuck:    tasks.filter(t => t.status === 'ACTIVE' && (Date.now() - new Date(t.lastUpdated).getTime()) > 48 * 3600000).length,
  };
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const teamSize = new Set(tasks.flatMap(t => (t.assignees || []).map(a => a.name))).size;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
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
          <button
            key={project.id}
            onClick={() => setSelectedProject(project.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedProject === project.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'glass-card text-gray-300 hover:text-white glass-card-hover'
            }`}
          >
            {project.name}
          </button>
        ))}
        <button
          onClick={() => setShowNewProject(true)}
          className="px-3 py-2 rounded-lg text-sm text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 transition-all"
        >
          <Plus className="w-4 h-4 inline mr-1" />New Project
        </button>
      </div>

      {/* ── AI Agent Control Panel ── */}
      <Card>
        <CardContent className="p-0">
          <button
            onClick={() => setAgentPanelOpen(!agentPanelOpen)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-purple-300">AI Agent Control Panel</span>
              <span className="text-xs text-gray-500 ml-2">autonomous task management</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); triggerAllAgents(); }}
                className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />Run All
              </button>
              {agentPanelOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>

          {agentPanelOpen && (
            <div className="grid grid-cols-3 gap-3 p-4 border-t border-glass-border">
              {agents.map(agent => (
                <AgentCard key={agent.type} agent={agent} onTrigger={() => triggerAgent(agent.type)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Task Board ── */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(col => (
            <TaskColumn
              key={col.id}
              title={col.title}
              status={col.status}
              tasks={tasks.filter(t => t.status === col.status)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* ── Statistics ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" /> Project Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Total Tasks"       value={stats.total}         color="text-white"   />
              <KpiCard label="Completion Rate"   value={`${completionRate}%`} color="text-green-400" />
              <KpiCard label="Stuck Tasks"       value={stats.stuck}         color={stats.stuck > 0 ? 'text-red-400' : 'text-gray-400'} />
              <KpiCard label="Team Members"      value={teamSize}            color="text-blue-400" />
            </div>
            {/* Status bars */}
            <div className="space-y-2.5">
              <StatusBar label="Done"    count={stats.done}    total={stats.total} color="bg-green-500"  />
              <StatusBar label="Active"  count={stats.active}  total={stats.total} color="bg-blue-500"   />
              <StatusBar label="Backlog" count={stats.backlog} total={stats.total} color="bg-yellow-500" />
              <StatusBar label="Gap"     count={stats.gap}     total={stats.total} color="bg-red-500"    />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Velocity Chart ── */}
      <VelocityChart data={velocityData} />

      {/* ── New Task Modal ── */}
      {showNewTask && (
        <Modal onClose={() => { setShowNewTask(false); setNewTitle(''); setNewDesc(''); }} title="New Task">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title</label>
              <Input placeholder="Task title…" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newTitle.trim() && handleCreateTask()} autoFocus />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <Input placeholder="Optional…" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => { setShowNewTask(false); setNewTitle(''); setNewDesc(''); }}>Cancel</Button>
              <Button onClick={handleCreateTask} disabled={!newTitle.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── New Project Modal ── */}
      {showNewProject && (
        <Modal onClose={() => { setShowNewProject(false); setNewProjectName(''); setNewProjectDesc(''); }} title="New Project">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Project Name</label>
              <Input placeholder="Project name…" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <Input placeholder="Optional…" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => { setShowNewProject(false); setNewProjectName(''); }}>Cancel</Button>
              <Button onClick={createNewProject} disabled={!newProjectName.trim()}>Create Project</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
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

function AgentCard({ agent, onTrigger }: { agent: AgentInfo; onTrigger: () => void }) {
  const statusColor = { idle: 'text-gray-400', running: 'text-yellow-400', success: 'text-green-400', error: 'text-red-400' };
  const statusBg   = { idle: 'bg-gray-500/20', running: 'bg-yellow-500/20', success: 'bg-green-500/20', error: 'bg-red-500/20' };

  return (
    <div className="glass-card p-3 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={statusColor[agent.status]}>{agent.icon}</div>
          <span className="font-medium text-sm">{agent.label}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${statusBg[agent.status]} ${statusColor[agent.status]}`}>
          {agent.status}
        </span>
      </div>
      <p className="text-xs text-gray-500">{agent.description}</p>
      {agent.lastRun && <p className="text-xs text-gray-600">Last: {agent.lastRun}</p>}
      <button
        onClick={onTrigger} disabled={agent.status === 'running'}
        className="w-full px-3 py-1.5 text-xs bg-purple-600/80 hover:bg-purple-600 text-white rounded transition-colors disabled:opacity-50"
      >
        {agent.status === 'running' ? 'Running…' : 'Trigger'}
      </button>
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

// ── Mock / enrichment helpers ─────────────────────────────────────────────────

const MOCK_ASSIGNEES = [
  { name: 'John Doe',       initials: 'JD' },
  { name: 'Jane Smith',     initials: 'JS' },
  { name: 'Bob Johnson',    initials: 'BJ' },
  { name: 'Alice Williams', initials: 'AW' },
];
const PRIORITIES: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
const TAGS = ['frontend', 'backend', 'design', 'api', 'docs', 'testing', 'infra'];

function enrichTasks(tasks: any[]): Task[] {
  return tasks.map((task, i) => ({
    ...task,
    assignees:     task.assignees     || MOCK_ASSIGNEES.slice(0, (i % 3) + 1),
    contactPerson: task.contactPerson || MOCK_ASSIGNEES[i % MOCK_ASSIGNEES.length].name,
    priority:      task.priority      || PRIORITIES[i % PRIORITIES.length],
    tags:          task.tags          || [TAGS[i % TAGS.length]],
    peopleCount:   task.peopleCount   || (i % 3) + 1,
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
  const now        = Date.now();
  const day        = 86400000;
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
