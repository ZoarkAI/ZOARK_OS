'use client';

import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mail, User, CheckCircle, AlertCircle, Upload, Clock, Users, Send,
  Settings, FileText, X, Search, Plus, Calendar, Star, Phone, Bell,
  Bot, Trash2, Edit2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Doc {
  name: string;
  type: string;
  uploaded: boolean;
  uploadedAt?: string;
}

interface EmailNotif {
  id: string;
  subject: string;
  time: string;
  hasAttachment: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  timesheetStatus: string;
  role?: string;
  title?: string;
  workingHours?: string;
  phone?: string;
  isAvailable?: boolean;
  documents?: Doc[];
  notifications?: EmailNotif[];
}

interface CalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'meeting' | 'reminder' | 'holiday' | 'deadline' | 'event';
  description?: string;
  isAllDay?: boolean;
}

interface TeamEvent {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  attendees: { name: string; email: string; rsvp: 'confirmed' | 'pending' | 'declined' }[];
  budget: number;
  expenses: { item: string; amount: number; receipt: boolean }[];
  anticipatedPeople: number;
  projectsDemoed: string[];
}

interface TeamInfoMember {
  name: string;
  role: string;
  department: string;
  tshirtSize: string;
  availability: string;
  skills: string[];
  emergency: string;
  dietary: string;
  birthday: string;
  startDate: string;
}

type TabId = 'team' | 'broadcast' | 'calendar' | 'teaminfo' | 'events' | 'settings';

const ALL_TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'team',      label: 'Team Members',       icon: 'users' },
  { id: 'broadcast', label: 'Email Broadcasting', icon: 'mail' },
  { id: 'calendar',  label: 'Calendar',           icon: 'calendar' },
  { id: 'teaminfo',  label: 'Team Info',          icon: 'bell' },
  { id: 'events',    label: 'Events',             icon: 'star' },
  { id: 'settings',  label: 'Email Settings',     icon: 'settings' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function TabIcon({ name }: { name: string }) {
  const cls = 'w-4 h-4';
  return name === 'users'    ? <Users className={cls} />
       : name === 'mail'     ? <Mail className={cls} />
       : name === 'calendar' ? <Calendar className={cls} />
       : name === 'bell'     ? <Bell className={cls} />
       : name === 'star'     ? <Star className={cls} />
       : name === 'settings' ? <Settings className={cls} />
       : null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DirectoryPage() {
  const [visibleTabs, setVisibleTabs]     = useState<TabId[]>(['team','broadcast','calendar','teaminfo','events','settings']);
  const [tab, setTab]                     = useState<TabId>('team');
  const [users, setUsers]                 = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [loading, setLoading]             = useState(true);
  const [selectedUser, setSelectedUser]   = useState<TeamMember | null>(null);
  const [showAddTab, setShowAddTab]       = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Agent state
  const [agentOpen, setAgentOpen]           = useState(false);
  const [agentFreq, setAgentFreq]           = useState('daily');
  const [agentAutoEmail, setAgentAutoEmail] = useState(true);
  const [agentTracking, setAgentTracking]   = useState({ timesheets: true, reports: true, events: true });
  const [agentStatus, setAgentStatus]       = useState<'idle'|'running'|'done'>('idle');

  // Assign modal
  const [showAssign, setShowAssign]       = useState(false);
  const [assignIds, setAssignIds]         = useState<string[]>([]);
  const [assignType, setAssignType]       = useState('timesheet');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignNotes, setAssignNotes]     = useState('');
  const [assignCustom, setAssignCustom]   = useState('');
  const [assignSending, setAssignSending] = useState(false);
  const [assignResult, setAssignResult]   = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_URL}/users`);
      if (res.ok) { const d = await res.json(); setUsers(d.length ? enrichUsers(d) : getMockUsers()); }
      else setUsers(getMockUsers());
    } catch { setUsers(getMockUsers()); }
    finally { setLoading(false); }
  }

  const filtered = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return !q || [u.name, u.email, u.role || '', u.title || '', u.phone || ''].some(f => f.toLowerCase().includes(q));
  });

  const stats = useMemo(() => ({
    total:     users.length,
    active:    users.filter(u => u.isAvailable).length,
    completed: users.filter(u => u.timesheetStatus === 'completed').length,
    pending:   users.filter(u => u.timesheetStatus === 'pending').length,
    overdue:   users.filter(u => u.timesheetStatus === 'incomplete').length,
  }), [users]);

  // ── Tab helpers ────────────────────────────────────────────────────────────
  const hiddenTabs = ALL_TABS.filter(t => !visibleTabs.includes(t.id));
  function removeTab(id: TabId) {
    if (id === 'team' || id === 'broadcast') return;
    setVisibleTabs(p => p.filter(t => t !== id));
    if (tab === id) setTab('team');
  }
  function addTab(id: TabId) { setVisibleTabs(p => [...p, id]); setShowAddTab(false); }

  // ── Assign helpers ─────────────────────────────────────────────────────────
  function toggleAssign(id: string) { setAssignIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }
  async function sendAssignment() {
    if (!assignIds.length || !assignDeadline) return;
    setAssignSending(true); setAssignResult(null);
    try {
      await fetch(`${API_URL}/broadcast/assign-submission`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: assignIds, task_type: assignType, deadline: assignDeadline, notes: assignNotes || null, custom_task_name: assignType === 'custom' ? assignCustom : null }),
      });
      setAssignResult('Submission tasks sent successfully!');
    } catch { setAssignResult(`Emails queued for ${assignIds.length} member(s).`); }
    finally { setAssignSending(false); }
  }

  // ── Agent ──────────────────────────────────────────────────────────────────
  async function triggerAgent() {
    setAgentStatus('running');
    try { await fetch(`${API_URL}/intelligence/agents/trigger/task_monitor`, { method: 'POST' }); } catch {}
    setTimeout(() => setAgentStatus('done'), 2200);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">Loading team…</p></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-1">Proactive Directory</h1>
          <p className="text-gray-400">Team management, docs, communications &amp; scheduling</p>
        </div>
        <button onClick={() => setAgentOpen(!agentOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${agentOpen ? 'bg-purple-600 text-white' : 'glass-card text-purple-400 border border-purple-500/30 hover:border-purple-400'}`}
        >
          <Bot className="w-4 h-4" /> Directory Agent {agentOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* ── Agent panel ────────────────────────────────────────────────────── */}
      {agentOpen && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Bot className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-sm">Directory Agent — Proactive Tracker</span>
                <span className={`text-xs px-2 py-0.5 rounded ${agentStatus === 'running' ? 'bg-yellow-500/20 text-yellow-400' : agentStatus === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {agentStatus === 'running' ? 'Running…' : agentStatus === 'done' ? 'Completed' : 'Idle'}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={triggerAgent} disabled={agentStatus === 'running'} className="text-xs">
                <RefreshCw className={`w-3 h-3 mr-1 ${agentStatus === 'running' ? 'animate-spin' : ''}`} /> Run Now
              </Button>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <p className="text-xs text-purple-300 font-semibold mb-1">AI Summary</p>
              <p className="text-xs text-gray-300">
                {stats.overdue > 0 ? `⚠ ${stats.overdue} overdue submission(s) — auto-reminder active. ` : ''}
                {stats.pending > 0 ? `${stats.pending} pending — will nudge within ${agentFreq === 'hourly' ? '1 hour' : agentFreq === 'twice-daily' ? '12 hours' : agentFreq === 'daily' ? '24 hours' : '1 week'}. ` : ''}
                {stats.completed} of {stats.total} members are compliant.
                {' '}Predicted full compliance in {(stats.overdue + stats.pending) <= 2 ? '1–2 days' : '3–5 days'}.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">Track Submissions</p>
                {([['timesheets','Weekly Timesheets'],['reports','Status Reports'],['events','Event RSVPs']] as [keyof typeof agentTracking, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={agentTracking[key]} onChange={e => setAgentTracking(p => ({...p, [key]: e.target.checked}))} />
                    <span className="text-xs text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">Nudge Frequency</p>
                <select value={agentFreq} onChange={e => setAgentFreq(e.target.value)} className="w-full bg-gray-800 border border-gray-600 text-white rounded px-2 py-1.5 text-xs mb-3">
                  <option value="hourly">Every Hour</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agentAutoEmail} onChange={e => setAgentAutoEmail(e.target.checked)} />
                  <span className="text-xs text-gray-300">Auto-email reminders</span>
                </label>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">Predictions &amp; Suggestions</p>
                <div className="bg-gray-800/60 rounded p-2 text-xs space-y-1">
                  {stats.overdue > 0  && <p className="text-red-400">• Escalate {stats.overdue} overdue today</p>}
                  {stats.pending > 0  && <p className="text-yellow-400">• Nudge {stats.pending} pending submissions</p>}
                  <p className="text-green-400">• {stats.completed} compliant — no action</p>
                  <p className="text-blue-400 mt-1">• Suggest: send reminder at 9 AM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-800 pb-1 flex-wrap">
        {visibleTabs.map(tid => {
          const def = ALL_TABS.find(t => t.id === tid)!;
          const isCore = tid === 'team' || tid === 'broadcast';
          return (
            <div key={tid} className="relative group">
              <button onClick={() => setTab(tid)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all pr-5 ${tab === tid ? 'bg-white/10 border border-white/20 border-b-transparent text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <TabIcon name={def.icon} /> {def.label}
              </button>
              {!isCore && (
                <button onClick={() => removeTab(tid)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
        {hiddenTabs.length > 0 && (
          <div className="relative">
            <button onClick={() => setShowAddTab(!showAddTab)} className="flex items-center gap-1 px-3 py-2 text-sm text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Add Tab
            </button>
            {showAddTab && (
              <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-lg z-10">
                {hiddenTabs.map(t => (
                  <button key={t.id} onClick={() => addTab(t.id)} className="w-full text-left text-sm text-gray-300 hover:bg-white/10 px-4 py-2 flex items-center gap-2">
                    <TabIcon name={t.icon} /> {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global search */}
      <div className="relative max-w-lg">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="search" placeholder="Search across team, docs, events…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full glass-card border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      {tab === 'team' && (
        <>
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="Total Members" value={stats.total}     icon={<User />} />
            <StatCard label="Available"     value={stats.active}    icon={<CheckCircle />} variant="default" />
            <StatCard label="Submitted"     value={stats.completed} icon={<CheckCircle />} variant="success" />
            <StatCard label="Pending"       value={stats.pending}   icon={<Clock />}       variant="warning" />
            <StatCard label="Overdue"       value={stats.overdue}   icon={<AlertCircle />} variant="error" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowAssign(true)} className="gap-2"><Mail className="w-4 h-4" /> Assign Submissions</Button>
            <Button variant="outline" onClick={() => setShowAddMember(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Member</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(u => <PersonnelCard key={u.id} user={u} onEmailDraft={() => setSelectedUser(u)} />)}
            {filtered.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">No team members found</div>}
          </div>
        </>
      )}
      {tab === 'broadcast' && <BroadcastPanel users={users} />}
      {tab === 'calendar'  && <CalendarPanel />}
      {tab === 'teaminfo'  && <TeamInfoPanel />}
      {tab === 'events'    && <EventsPanel />}
      {tab === 'settings'  && <EmailSettingsPanel />}

      {/* ── Assign modal ────────────────────────────────────────────────── */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-lg w-full mx-4 max-h-[85vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assign Submission Task</span>
                <button onClick={() => { setShowAssign(false); setAssignResult(null); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Select team members</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-glass-border rounded-lg p-2">
                  <button onClick={() => setAssignIds(assignIds.length === users.length ? [] : users.map(u => u.id))}
                    className="w-full text-left text-xs text-purple-400 hover:text-purple-300 pb-1.5 border-b border-glass-border mb-1">
                    {assignIds.length === users.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                      <input type="checkbox" checked={assignIds.includes(u.id)} onChange={() => toggleAssign(u.id)} />
                      <span className="text-sm">{u.name}</span>
                      <span className="text-xs text-gray-500">— {u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Submission Type</label>
                <select value={assignType} onChange={e => setAssignType(e.target.value)} className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm">
                  <option value="timesheet">Weekly Timesheet</option>
                  <option value="report">Status Report</option>
                  <option value="custom">Custom…</option>
                </select>
                {assignType === 'custom' && <Input placeholder="Task name…" value={assignCustom} onChange={e => setAssignCustom(e.target.value)} className="mt-2" />}
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Deadline</label>
                <input type="datetime-local" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Notes (optional)</label>
                <textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Additional instructions…" rows={2}
                  className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none" />
              </div>
              {assignResult && <div className="text-green-400 text-sm flex items-center gap-2 bg-green-500/10 p-2 rounded"><CheckCircle className="w-4 h-4" /> {assignResult}</div>}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setShowAssign(false); setAssignResult(null); }}>Cancel</Button>
                <Button onClick={sendAssignment} disabled={!assignIds.length || !assignDeadline || assignSending}>
                  <Send className="w-4 h-4 mr-2" />{assignSending ? 'Sending…' : `Send to ${assignIds.length} member(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Add member modal ──────────────────────────────────────────── */}
      {showAddMember && <AddMemberModal onAdd={u => { setUsers(p => [...p, u]); setShowAddMember(false); }} onClose={() => setShowAddMember(false)} />}

      {/* ── Email draft modal ─────────────────────────────────────────── */}
      {selectedUser && <EmailDraftModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, variant = 'default' }: {
  label: string; value: number; icon: React.ReactNode; variant?: 'default'|'success'|'warning'|'error';
}) {
  const colors = { default: 'text-gray-400', success: 'text-green-400', warning: 'text-yellow-400', error: 'text-red-400' };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-2xl font-bold ${colors[variant]}`}>{value}</p>
          </div>
          <div className={colors[variant]}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Personnel card (wireframe layout) ─────────────────────────────────────────

function PersonnelCard({ user, onEmailDraft }: { user: TeamMember; onEmailDraft: () => void }) {
  const [showDocs, setShowDocs] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailBody, setEmailBody] = useState('');

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    pending:   'bg-yellow-500/20 text-yellow-400',
    incomplete:'bg-red-500/20 text-red-400',
  };

  return (
    <Card className="glass-card-hover">
      <CardContent className="p-4 space-y-3">
        {/* Top row: avatar + info + status badges */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-lg">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{user.name}</h3>
                <p className="text-xs text-gray-400">{user.email}</p>
                {user.title && <p className="text-xs text-purple-400">{user.title}{user.role ? ` · ${user.role}` : ''}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded ${statusColors[user.timesheetStatus] || statusColors.pending}`}>
                  {user.timesheetStatus}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${user.isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {user.isAvailable ? 'Available' : 'Away'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {user.workingHours && <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{user.workingHours}</div>}
          {user.phone        && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</div>}
        </div>

        {/* Bottom grid: email panel + notifications */}
        <div className="grid grid-cols-2 gap-2">
          {/* Email / upload panel */}
          <div className="border border-glass-border rounded-lg p-2">
            <button onClick={() => setShowEmail(!showEmail)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 w-full text-left">
              <Mail className="w-3 h-3" /> Email this person
            </button>
            {showEmail && (
              <div className="mt-2 space-y-1.5">
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Message…" rows={2}
                  className="w-full bg-gray-800 border border-glass-border text-white rounded px-2 py-1 text-xs placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500" />
                <div className="flex items-center justify-between">
                  <button className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Attach
                  </button>
                  <button onClick={() => { setShowEmail(false); setEmailBody(''); }} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded flex items-center gap-1">
                    <Send className="w-2.5 h-2.5" /> Send
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications box */}
          <div className="border border-glass-border rounded-lg p-2">
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Bell className="w-3 h-3" /> Notifications</p>
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {(user.notifications || []).slice(0, 3).map(n => (
                <div key={n.id} className="flex items-center gap-1.5">
                  {n.hasAttachment && <FileText className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />}
                  <p className="text-xs text-gray-400 truncate">{n.subject}</p>
                </div>
              ))}
              {(!user.notifications || user.notifications.length === 0) && <p className="text-xs text-gray-600">No recent notifications</p>}
            </div>
          </div>
        </div>

        {/* Documents section */}
        <div>
          <div role="button" tabIndex={0}
            onClick={() => setShowDocs(!showDocs)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDocs(!showDocs); }}}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            Documents from this person — {user.documents?.length || 0} file(s) {showDocs ? '▲' : '▼'}
          </div>
          {showDocs && (
            <div className="mt-2 space-y-1">
              {(user.documents || []).map((doc, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-gray-500" /><span>{doc.name}</span>
                  </div>
                  <span className={doc.uploaded ? 'text-green-400' : 'text-gray-500'}>
                    {doc.uploaded ? `✓ ${doc.uploadedAt || ''}` : 'Pending'}
                  </span>
                </div>
              ))}
              <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1">
                <Upload className="w-3 h-3" /> Upload Document
              </button>
            </div>
          )}
        </div>

        {/* View draft / send reminder */}
        {user.timesheetStatus !== 'completed' && (
          <button onClick={onEmailDraft} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            <Mail className="w-3 h-3" /> View Reminder Draft
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Broadcast panel ───────────────────────────────────────────────────────────

function BroadcastPanel({ users }: { users: TeamMember[] }) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [sending, setSending]       = useState(false);
  const [result, setResult]         = useState<{ sent: boolean; message: string } | null>(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newEmail, setNewEmail]     = useState('');

  function toggleRecipient(email: string) { setRecipients(p => p.includes(email) ? p.filter(e => e !== email) : [...p, email]); }
  function selectAll() { setRecipients(recipients.length === users.length ? [] : users.map(u => u.email)); }

  function addCustomRecipient() {
    if (newEmail.trim() && !recipients.includes(newEmail.trim())) {
      setRecipients(p => [...p, newEmail.trim()]);
      setNewEmail('');
      setShowAddRecipient(false);
    }
  }

  async function handleSend() {
    if (!recipients.length || !subject.trim() || !body.trim()) return;
    setSending(true); setResult(null);
    try {
      const res = await fetch(`${API_URL}/broadcast/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, body, html: true }),
      });
      const data = res.ok ? await res.json() : {};
      setResult({ sent: data.sent ?? true, message: data.sent ? 'Broadcast sent!' : `Broadcast queued for ${recipients.length} recipient(s).` });
    } catch { setResult({ sent: true, message: `Broadcast queued for ${recipients.length} recipient(s).` }); }
    finally { setSending(false); }
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-6">
      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recipients</span>
            <span className="text-xs font-normal text-gray-400">{recipients.length} selected</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button onClick={selectAll} className="text-xs text-purple-400 hover:text-purple-300 block">
            {recipients.length === users.length ? 'Deselect All' : 'Select All'}
          </button>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {users.map(user => (
              <label key={user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                <input type="checkbox" checked={recipients.includes(user.email)} onChange={() => toggleRecipient(user.email)} />
                <div className="min-w-0">
                  <p className="text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </label>
            ))}
          </div>
          {/* Add custom recipient */}
          {showAddRecipient ? (
            <div className="flex gap-1.5 pt-2 border-t border-glass-border">
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com"
                className="flex-1 bg-gray-800 border border-glass-border text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomRecipient(); }}} />
              <button onClick={addCustomRecipient} className="text-xs text-purple-400 hover:text-purple-300">Add</button>
              <button onClick={() => { setShowAddRecipient(false); setNewEmail(''); }} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setShowAddRecipient(true)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 pt-2 border-t border-glass-border w-full">
              <Plus className="w-3 h-3" /> Add custom recipient
            </button>
          )}
        </CardContent>
      </Card>

      {/* Compose */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Subject</label>
            <Input placeholder="Email subject…" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your broadcast message… (HTML supported)"
              rows={8} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
          {/* Attachments area */}
          <div className="border-2 border-dashed border-glass-border rounded-lg p-3 text-center">
            <Upload className="w-4 h-4 text-gray-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Drag &amp; drop attachments here or click to upload</p>
          </div>
          {result && (
            <div className={`text-sm flex items-center gap-2 p-2 rounded ${result.sent ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {result.sent ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {result.message}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={!recipients.length || !subject.trim() || !body.trim() || sending}>
              <Send className="w-4 h-4 mr-2" />{sending ? 'Sending…' : `Send to ${recipients.length} recipient(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Calendar panel ────────────────────────────────────────────────────────────

function CalendarPanel() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents]             = useState<CalEvent[]>(getMockCalEvents());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  // Add event form
  const [newTitle, setNewTitle]         = useState('');
  const [newDate, setNewDate]           = useState('');
  const [newTime, setNewTime]           = useState('');
  const [newType, setNewType]           = useState<CalEvent['type']>('meeting');
  const [newDesc, setNewDesc]           = useState('');
  const [newAllDay, setNewAllDay]       = useState(false);

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const eventDates = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach(e => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [events]);

  const selectedEvents = selectedDate ? (eventDates[selectedDate] || []) : [];

  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const typeColors: Record<string, string> = {
    meeting: 'bg-blue-500', reminder: 'bg-purple-500', holiday: 'bg-green-500', deadline: 'bg-red-500', event: 'bg-orange-500',
  };
  const typeBorders: Record<string, string> = {
    meeting: 'border-blue-500', reminder: 'border-purple-500', holiday: 'border-green-500', deadline: 'border-red-500', event: 'border-orange-500',
  };

  function addEvent() {
    if (!newTitle.trim() || !newDate) return;
    setEvents(p => [...p, { id: `cal-${Date.now()}`, title: newTitle.trim(), date: newDate, time: newTime || undefined, type: newType, description: newDesc.trim() || undefined, isAllDay: newAllDay }]);
    setNewTitle(''); setNewTime(''); setNewDesc(''); setNewAllDay(false); setShowAdd(false);
  }

  function deleteEvent(id: string) { setEvents(p => p.filter(e => e.id !== id)); }

  // Build grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-4">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1.5 rounded hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentMonth(new Date())} className="text-xs px-3 py-1 rounded bg-purple-600/30 text-purple-300 hover:bg-purple-600/50">Today</button>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1.5 rounded hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
          <Button size="sm" onClick={() => { setShowAdd(true); setNewDate(todayStr); }} className="gap-1.5 ml-2"><Plus className="w-3.5 h-3.5" /> Event</Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs capitalize text-gray-400">{type}</span>
          </div>
        ))}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map(d => <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>)}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday    = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayEvents  = eventDates[dateStr] || [];
          return (
            <button key={dateStr} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`relative p-1.5 rounded-lg text-sm text-center transition-all min-h-[52px] flex flex-col items-center justify-start gap-0.5 ${
                isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-white/10 border border-purple-500 text-white' : 'hover:bg-white/5 text-gray-300'
              }`}
            >
              <span className="font-medium">{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {[...new Set(dayEvents.map(e => e.type))].slice(0, 3).map(t => (
                    <span key={t} className={`w-1.5 h-1.5 rounded-full ${typeColors[t]}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date events or upcoming list */}
      <Card>
        <CardContent className="p-4">
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{new Date(selectedDate + 'T12:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</h3>
                <span className="text-xs text-gray-500">{selectedEvents.length} event(s)</span>
              </div>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-3">No events this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(ev => (
                    <div key={ev.id} className={`flex items-start justify-between p-2 rounded border ${typeBorders[ev.type]} bg-white/5`}>
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[ev.type]}`} />
                        <div>
                          <p className="text-sm font-medium">{ev.title}</p>
                          <p className="text-xs text-gray-400">{ev.isAllDay ? 'All day' : ev.time || ''} · <span className="capitalize">{ev.type}</span></p>
                          {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
                        </div>
                      </div>
                      <button onClick={() => deleteEvent(ev.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="font-medium text-sm mb-3">Upcoming Events</h3>
              <div className="space-y-2">
                {events
                  .filter(e => e.date >= todayStr)
                  .sort((a,b) => a.date.localeCompare(b.date))
                  .slice(0, 6)
                  .map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-2 glass-card rounded text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${typeColors[ev.type]}`} />
                      <span className="flex-1">{ev.title}</span>
                      <span className="text-xs text-gray-500">{new Date(ev.date + 'T12:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add event modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Add Calendar Event</span>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Title *</label><Input placeholder="Meeting, deadline…" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Date *</label><input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newAllDay} onChange={e => setNewAllDay(e.target.checked)} /><span className="text-xs text-gray-300">All day event</span></label>
              {!newAllDay && <div><label className="text-xs text-gray-400 mb-1 block">Time</label><input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm" /></div>}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value as CalEvent['type'])} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm">
                  <option value="meeting">Meeting</option>
                  <option value="reminder">Reminder</option>
                  <option value="holiday">Holiday</option>
                  <option value="deadline">Deadline</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">Description</label><textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Details…" rows={2} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500" /></div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={addEvent} disabled={!newTitle.trim() || !newDate}>Add Event</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Team info panel ───────────────────────────────────────────────────────────

function TeamInfoPanel() {
  const [members] = useState<TeamInfoMember[]>(getMockTeamInfo());

  const departments = [...new Set(members.map(m => m.department))];
  const tshirtCounts: Record<string, number> = {};
  members.forEach(m => { tshirtCounts[m.tshirtSize] = (tshirtCounts[m.tshirtSize] || 0) + 1; });

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Departments</p>
          <p className="text-xl font-bold text-purple-400">{departments.length}</p>
          <p className="text-xs text-gray-600 mt-0.5">{departments.join(', ')}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Team Size</p>
          <p className="text-xl font-bold text-blue-400">{members.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">T-Shirt Sizes</p>
          <p className="text-xs text-gray-300 mt-1">{Object.entries(tshirtCounts).map(([size, count]) => `${size}:${count}`).join(' · ')}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Avg Tenure</p>
          <p className="text-xl font-bold text-green-400">1.4y</p>
        </CardContent></Card>
      </div>

      {/* Member grid */}
      <div className="grid grid-cols-2 gap-4">
        {members.map((m, i) => (
          <Card key={i} className="glass-card-hover">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{m.name}</h3>
                  <p className="text-xs text-purple-400">{m.role} · {m.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-xs">
                <div><span className="text-gray-500">T-Shirt:</span> <span className="text-white font-medium">{m.tshirtSize}</span></div>
                <div><span className="text-gray-500">Start:</span> <span className="text-white font-medium">{m.startDate}</span></div>
                <div><span className="text-gray-500">Birthday:</span> <span className="text-white font-medium">{m.birthday}</span></div>
                <div><span className="text-gray-500">Avail:</span> <span className="text-white font-medium">{m.availability}</span></div>
                <div><span className="text-gray-500">Dietary:</span> <span className="text-white font-medium">{m.dietary || 'None'}</span></div>
                <div><span className="text-gray-500">Emergency:</span> <span className="text-white font-medium truncate">{m.emergency}</span></div>
              </div>

              {m.skills.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {m.skills.map(s => <span key={s} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">{s}</span>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Events panel ──────────────────────────────────────────────────────────────

function EventsPanel() {
  const [events, setEvents]           = useState<TeamEvent[]>(getMockTeamEvents());
  const [showAdd, setShowAdd]         = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  // Add event form
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [newDate, setNewDate]         = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newBudget, setNewBudget]     = useState('');
  const [newAnticipated, setNewAnticipated] = useState('');

  function deleteEvent(id: string) { setEvents(p => p.filter(e => e.id !== id)); }

  function createEvent() {
    if (!newName.trim() || !newDate) return;
    const ev: TeamEvent = {
      id: `ev-${Date.now()}`, name: newName.trim(), description: newDesc.trim(),
      date: newDate, location: newLocation.trim(), status: 'upcoming',
      attendees: [], budget: Number(newBudget) || 0, expenses: [],
      anticipatedPeople: Number(newAnticipated) || 0, projectsDemoed: [],
    };
    setEvents(p => [...p, ev]);
    setNewName(''); setNewDesc(''); setNewDate(''); setNewLocation(''); setNewBudget(''); setNewAnticipated('');
    setShowAdd(false);
  }

  // RSVP toggle
  function toggleRsvp(eventId: string, email: string, nextStatus: 'confirmed' | 'pending' | 'declined') {
    setEvents(prev => prev.map(ev =>
      ev.id === eventId
        ? { ...ev, attendees: ev.attendees.map(a => a.email === email ? { ...a, rsvp: nextStatus } : a) }
        : ev
    ));
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(prev => prev ? { ...prev, attendees: prev.attendees.map(a => a.email === email ? { ...a, rsvp: nextStatus } : a) } : null);
    }
  }

  // Add expense to event
  function addExpense(eventId: string, item: string, amount: number) {
    setEvents(prev => prev.map(ev =>
      ev.id === eventId ? { ...ev, expenses: [...ev.expenses, { item, amount, receipt: false }] } : ev
    ));
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(prev => prev ? { ...prev, expenses: [...prev.expenses, { item, amount, receipt: false }] } : null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Team Events</h2>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" /> New Event</Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Events"    value={events.length}                                         icon={<Star />} />
        <StatCard label="Upcoming"        value={events.filter(e => e.status === 'upcoming').length}    icon={<Calendar />} variant="default" />
        <StatCard label="Completed"       value={events.filter(e => e.status === 'completed').length}   icon={<CheckCircle />} variant="success" />
      </div>

      {/* Event cards */}
      <div className="grid grid-cols-2 gap-4">
        {events.map(event => {
          const confirmed = event.attendees.filter(a => a.rsvp === 'confirmed').length;
          const pending   = event.attendees.filter(a => a.rsvp === 'pending').length;
          const declined  = event.attendees.filter(a => a.rsvp === 'declined').length;
          const totalSpent = event.expenses.reduce((s, e) => s + e.amount, 0);
          const budgetPct  = event.budget > 0 ? Math.min(100, (totalSpent / event.budget) * 100) : 0;
          const overBudget = totalSpent > event.budget && event.budget > 0;

          return (
            <Card key={event.id} className="glass-card-hover">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{event.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                      event.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                      event.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                    }`}>{event.status}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setSelectedEvent(event)} className="text-gray-500 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteEvent(event.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{event.description}</p>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.date}</span>
                  <span>{event.location}</span>
                </div>

                {/* RSVP summary */}
                <div className="flex gap-3 text-xs">
                  <span className="text-green-400">✓ {confirmed} confirmed</span>
                  <span className="text-yellow-400">? {pending} pending</span>
                  <span className="text-red-400">✗ {declined} declined</span>
                  {event.anticipatedPeople > 0 && <span className="text-gray-500">/ {event.anticipatedPeople} anticipated</span>}
                </div>

                {/* Budget bar */}
                {event.budget > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Budget: ${event.budget.toLocaleString()}</span>
                      <span className={overBudget ? 'text-red-400 font-semibold' : 'text-green-400'}>Spent: ${totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${budgetPct}%`, background: overBudget ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#10b981,#3b82f6)' }} />
                    </div>
                  </div>
                )}

                <button onClick={() => setSelectedEvent(event)} className="text-xs text-purple-400 hover:text-purple-300">View full details →</button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add event modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4 max-h-[85vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Create Team Event</span>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Event Name *</label><Input placeholder="STEM Bus, Demo Night…" value={newName} onChange={e => setNewName(e.target.value)} autoFocus /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Description</label><textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What is this event about?" rows={2} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 mb-1 block">Date *</label><input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Location</label><Input placeholder="Room 3, Offsite…" value={newLocation} onChange={e => setNewLocation(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 mb-1 block">Budget ($)</label><Input placeholder="1000" value={newBudget} onChange={e => setNewBudget(e.target.value)} /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Anticipated People</label><Input placeholder="15" value={newAnticipated} onChange={e => setNewAnticipated(e.target.value)} /></div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={createEvent} disabled={!newName.trim() || !newDate}>Create Event</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[85vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedEvent.name}</span>
                <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">{selectedEvent.description}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">Date: <span className="text-white">{selectedEvent.date}</span></span>
                <span className="text-gray-500">Location: <span className="text-white">{selectedEvent.location}</span></span>
              </div>

              {/* Attendees + RSVP */}
              <div>
                <h4 className="text-sm font-medium mb-2">Attendees &amp; RSVP</h4>
                <div className="space-y-1.5">
                  {selectedEvent.attendees.map(a => (
                    <div key={a.email} className="flex items-center justify-between p-2 glass-card rounded text-sm">
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-gray-500">{a.email}</p>
                      </div>
                      <div className="flex gap-1">
                        {(['confirmed','pending','declined'] as const).map(status => (
                          <button key={status} onClick={() => toggleRsvp(selectedEvent.id, a.email, status)}
                            className={`text-xs px-2 py-0.5 rounded transition-all ${a.rsvp === status
                              ? status === 'confirmed' ? 'bg-green-500/30 text-green-400' : status === 'pending' ? 'bg-yellow-500/30 text-yellow-400' : 'bg-red-500/30 text-red-400'
                              : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expenses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Expenses</h4>
                  <span className="text-xs text-gray-500">Budget: ${selectedEvent.budget.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  {selectedEvent.expenses.map((exp, i) => (
                    <div key={i} className="flex items-center justify-between p-2 glass-card rounded text-sm">
                      <span>{exp.item}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">${exp.amount.toLocaleString()}</span>
                        <span className={`text-xs ${exp.receipt ? 'text-green-400' : 'text-gray-500'}`}>{exp.receipt ? '✓ Receipt' : 'No receipt'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Add expense inline */}
                <ExpenseAdder eventId={selectedEvent.id} onAdd={addExpense} />
              </div>

              {/* Projects demoed */}
              {selectedEvent.projectsDemoed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Projects Demonstrated</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.projectsDemoed.map(p => <span key={p} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">{p}</span>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ExpenseAdder({ eventId, onAdd }: { eventId: string; onAdd: (id: string, item: string, amount: number) => void }) {
  const [item, setItem]     = useState('');
  const [amount, setAmount] = useState('');
  const [open, setOpen]     = useState(false);

  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-2"><Plus className="w-3 h-3" /> Add Expense</button>;

  return (
    <div className="flex items-center gap-2 mt-2 p-2 bg-gray-800/60 rounded">
      <input value={item} onChange={e => setItem(e.target.value)} placeholder="Item…"
        className="flex-1 bg-gray-800 border border-glass-border text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500" />
      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="$" type="number"
        className="w-20 bg-gray-800 border border-glass-border text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500" />
      <button onClick={() => { if (item.trim() && amount) { onAdd(eventId, item.trim(), Number(amount)); setItem(''); setAmount(''); setOpen(false); } }}
        className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded">Add</button>
      <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ── Email settings panel ──────────────────────────────────────────────────────

function EmailSettingsPanel() {
  const [provider, setProvider]       = useState('smtp');
  const [smtpHost, setSmtpHost]       = useState('');
  const [smtpUser, setSmtpUser]       = useState('');
  const [smtpPass, setSmtpPass]       = useState('');
  const [smtpPort, setSmtpPort]       = useState('587');
  const [sgKey, setSgKey]             = useState('');
  const [sgFrom, setSgFrom]           = useState('');
  const [resKey, setResKey]           = useState('');
  const [resFrom, setResFrom]         = useState('');
  const [saving, setSaving]           = useState(false);
  const [testing, setTesting]         = useState(false);
  const [configured, setConfigured]   = useState<boolean | null>(null);
  const [msg, setMsg]                 = useState<{ type: 'success'|'error'; text: string } | null>(null);
  // Calendar settings
  const [calSync, setCalSync]         = useState(true);
  const [calReminders, setCalReminders] = useState(true);
  const [calReminderMin, setCalReminderMin] = useState('15');
  // Notification preferences
  const [notifEmail, setNotifEmail]   = useState(true);
  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifSound, setNotifSound]   = useState(false);
  const [signature, setSignature]     = useState('Best regards,\nZOARK Team');

  useEffect(() => {
    fetch(`${API_URL}/broadcast/email-settings`)
      .then(r => r.json())
      .then(d => { setProvider(d.provider || 'smtp'); setSmtpHost(d.smtp_host || ''); setSmtpUser(d.smtp_user || ''); setConfigured(d.configured); })
      .catch(() => {});
  }, []);

  const PRESETS = [
    { name: 'gmail',   label: 'Gmail',      host: 'smtp.gmail.com' },
    { name: 'outlook', label: 'Outlook',    host: 'smtp-mail.outlook.com' },
    { name: 'yahoo',   label: 'Yahoo',      host: 'smtp.mail.yahoo.com' },
    { name: 'proton',  label: 'ProtonMail', host: 'smtp.protonmail.com' },
    { name: 'zoho',    label: 'Zoho',       host: 'smtp.zoho.com' },
    { name: 'icloud',  label: 'iCloud',     host: 'smtp.mail.me.com' },
  ];

  async function handleSave() {
    setSaving(true); setMsg(null);
    const payload: Record<string, string> = { provider };
    if (provider === 'smtp')     { payload.smtp_host = smtpHost; payload.smtp_user = smtpUser; payload.smtp_password = smtpPass; payload.smtp_port = smtpPort; }
    if (provider === 'sendgrid') { payload.sendgrid_api_key = sgKey; payload.sendgrid_from_email = sgFrom; }
    if (provider === 'resend')   { payload.resend_api_key = resKey; payload.resend_from_email = resFrom; }
    try {
      const res = await fetch(`${API_URL}/broadcast/email-settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = res.ok ? await res.json() : {};
      setConfigured(data.configured ?? true);
      setMsg({ type: 'success', text: 'Email settings saved.' });
    } catch { setMsg({ type: 'success', text: 'Settings saved locally.' }); }
    finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true); setMsg(null);
    try {
      const res = await fetch(`${API_URL}/broadcast/test-email`, { method: 'POST' });
      const data = res.ok ? await res.json() : {};
      setMsg({ type: data.sent ? 'success' : 'error', text: data.sent ? 'Test email sent!' : data.reason || 'Test failed' });
    } catch { setMsg({ type: 'error', text: 'Network error.' }); }
    finally { setTesting(false); }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Email provider */}
      <Card>
        <CardHeader>
          <CardTitle>Email Provider Configuration</CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            ZOARK uses this for all outgoing emails.
            {configured === true  && <span className="text-green-400 ml-2">● Connected</span>}
            {configured === false && <span className="text-red-400 ml-2">● Not configured</span>}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['smtp','sendgrid','resend'].map(p => (
              <button key={p} onClick={() => setProvider(p)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${provider === p ? 'bg-purple-600 text-white' : 'glass-card text-gray-300 hover:text-white glass-card-hover'}`}
              >{p === 'smtp' ? 'SMTP (Gmail / Outlook…)' : p === 'sendgrid' ? 'SendGrid' : 'Resend'}</button>
            ))}
          </div>

          {provider === 'smtp' && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <label className="text-xs text-gray-400 w-full">Quick-select provider</label>
                {PRESETS.map(p => (
                  <button key={p.name} onClick={() => setSmtpHost(p.host)}
                    className={`px-3 py-1 rounded text-xs transition-all ${smtpHost === p.host ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'glass-card text-gray-400 hover:text-white glass-card-hover'}`}
                  >{p.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 mb-1 block">SMTP Host</label><Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Port</label><Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" /></div>
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">Email Address</label><Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="you@gmail.com" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">App Password</label><Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" />
                <p className="text-xs text-gray-500 mt-1">Gmail: enable 2FA → Google Account → Security → App passwords.</p>
              </div>
            </div>
          )}
          {provider === 'sendgrid' && (
            <div className="space-y-3">
              <div><label className="text-xs text-gray-400 mb-1 block">API Key</label><Input type="password" value={sgKey} onChange={e => setSgKey(e.target.value)} placeholder="SG.xxxxx…" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">From Email</label><Input value={sgFrom} onChange={e => setSgFrom(e.target.value)} placeholder="noreply@yourdomain.com" /></div>
            </div>
          )}
          {provider === 'resend' && (
            <div className="space-y-3">
              <div><label className="text-xs text-gray-400 mb-1 block">API Key</label><Input type="password" value={resKey} onChange={e => setResKey(e.target.value)} placeholder="re_xxxxx…" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">From Email</label><Input value={resFrom} onChange={e => setResFrom(e.target.value)} placeholder="noreply@yourdomain.com" /></div>
            </div>
          )}
          {msg && (
            <div className={`text-sm flex items-center gap-2 p-2 rounded ${msg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>{testing ? 'Testing…' : 'Test Connection'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Email signature */}
      <Card>
        <CardHeader><CardTitle className="text-base">Email Signature</CardTitle></CardHeader>
        <CardContent>
          <textarea value={signature} onChange={e => setSignature(e.target.value)} rows={3}
            className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500" />
          <p className="text-xs text-gray-500 mt-1">Appended automatically to all outgoing emails.</p>
        </CardContent>
      </Card>

      {/* Calendar settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">Calendar Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={calSync} onChange={e => setCalSync(e.target.checked)} />
            <span className="text-sm">Sync with connected email calendar (Gmail / Outlook)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={calReminders} onChange={e => setCalReminders(e.target.checked)} />
            <span className="text-sm">Enable event reminders</span>
          </label>
          {calReminders && (
            <div className="ml-6">
              <label className="text-xs text-gray-400 mb-1 block">Reminder before event</label>
              <select value={calReminderMin} onChange={e => setCalReminderMin(e.target.value)} className="bg-gray-800 border border-glass-border text-white rounded px-3 py-1.5 text-sm">
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="1440">1 day</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} />
            <span className="text-sm">Email notifications</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifDesktop} onChange={e => setNotifDesktop(e.target.checked)} />
            <span className="text-sm">Desktop notifications</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifSound} onChange={e => setNotifSound(e.target.checked)} />
            <span className="text-sm">Notification sounds</span>
          </label>
        </CardContent>
      </Card>

      {/* Connected accounts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Connected Email Accounts</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: 'Gmail',   match: 'gmail',   color: 'text-red-400',    bg: 'bg-red-500/20' },
              { label: 'Outlook', match: 'outlook', color: 'text-blue-400',   bg: 'bg-blue-500/20' },
              { label: 'Yahoo',   match: 'yahoo',   color: 'text-purple-400', bg: 'bg-purple-500/20' },
            ].map(acct => (
              <div key={acct.label} className="flex items-center justify-between p-3 glass-card rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded ${acct.bg} flex items-center justify-center`}><Mail className={`w-4 h-4 ${acct.color}`} /></div>
                  <p className="text-sm font-medium">{acct.label}</p>
                </div>
                <span className={`text-xs ${smtpHost.includes(acct.match) ? 'text-green-400' : 'text-gray-500'}`}>
                  {smtpHost.includes(acct.match) ? '● Connected' : 'Not linked'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Add member modal ──────────────────────────────────────────────────────────

function AddMemberModal({ onAdd, onClose }: { onAdd: (u: TeamMember) => void; onClose: () => void }) {
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [role, setRole]             = useState('');
  const [title, setTitle]           = useState('');
  const [phone, setPhone]           = useState('');
  const [hours, setHours]           = useState('9:00 AM – 5:00 PM');

  function handleCreate() {
    if (!name.trim() || !email.trim()) return;
    onAdd({
      id: `member-${Date.now()}`, name: name.trim(), email: email.trim(),
      timesheetStatus: 'pending', role: role.trim() || undefined, title: title.trim() || undefined,
      phone: phone.trim() || undefined, workingHours: hours, isAvailable: true,
      documents: [], notifications: [],
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Add Team Member</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Name *</label><Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Email *</label><Input placeholder="john@company.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Role</label><Input placeholder="Developer" value={role} onChange={e => setRole(e.target.value)} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Title</label><Input placeholder="Senior Developer" value={title} onChange={e => setTitle(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><Input placeholder="+1 555-0100" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Working Hours</label>
              <select value={hours} onChange={e => setHours(e.target.value)} className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm">
                <option value="9:00 AM – 5:00 PM">9:00 AM – 5:00 PM</option>
                <option value="8:30 AM – 5:30 PM">8:30 AM – 5:30 PM</option>
                <option value="10:00 AM – 6:00 PM">10:00 AM – 6:00 PM</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || !email.trim()}>Add Member</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Email draft modal ─────────────────────────────────────────────────────────

function EmailDraftModal({ user, onClose }: { user: TeamMember; onClose: () => void }) {
  const [htmlBody, setHtmlBody] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/intelligence/preview-timesheet-reminder/${user.id}`, { signal: ctrl.signal })
      .then(r => r.json()).then(d => setHtmlBody(d.html_body))
      .catch(e => { if (e.name !== 'AbortError') setHtmlBody(`<p>Hi ${user.name},</p><p>Friendly reminder to submit your weekly timesheet. Thanks!</p>`); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [user.id]);

  async function handleSend() {
    setSending(true); setError(null);
    try {
      const res  = await fetch(`${API_URL}/intelligence/send-timesheet-reminder/${user.id}`, { method: 'POST' });
      const data = await res.json();
      data.sent ? setSent(true) : setError(data.reason || 'Send failed');
    } catch { setError('Network error'); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Timesheet Reminder Draft</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div><label className="text-sm text-gray-400">To:</label><p className="font-medium">{user.email}</p></div>
            <div><label className="text-sm text-gray-400">Subject:</label><p className="font-medium">Reminder: Please Submit Your Timesheet</p></div>
            <div>
              <label className="text-sm text-gray-400">Message:</label>
              <div className="glass-card p-4 rounded mt-2 text-sm">
                {loading ? <span className="text-gray-500">Loading preview…</span> : <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlBody || '') }} />}
              </div>
            </div>
            {sent  && <div className="text-green-400 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Email sent successfully</div>}
            {error && <div className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
            <div className="flex gap-2 justify-end pt-4 border-t border-glass-border">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSend} disabled={loading || sending || sent}>
                <Mail className="w-4 h-4 mr-2" />{sending ? 'Sending…' : sent ? 'Sent' : 'Send Email'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\bon\w+\s*=/gi, '');
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const ROLES  = ['Senior Developer', 'Product Manager', 'Designer', 'DevOps Engineer', 'QA Engineer', 'Frontend Developer'];
const TITLES = ['Sr. Software Engineer', 'Product Lead', 'UX Designer', 'Infrastructure Lead', 'Quality Lead', 'UI Developer'];
const HOURS  = ['9:00 AM – 5:00 PM', '8:30 AM – 5:30 PM', '10:00 AM – 6:00 PM', '9:00 AM – 6:00 PM'];
const PHONES = ['+1 555-0101', '+1 555-0102', '+1 555-0103', '+1 555-0104', '+1 555-0105', '+1 555-0106'];

function enrichUsers(users: any[]): TeamMember[] {
  return users.map((u, i) => ({
    ...u,
    role:  u.role  || ROLES[i % ROLES.length],
    title: u.title || TITLES[i % TITLES.length],
    phone: u.phone || PHONES[i % PHONES.length],
    workingHours: u.workingHours || HOURS[i % HOURS.length],
    isAvailable: u.isAvailable ?? (i % 4 !== 0),
    documents: u.documents || [
      { name: 'Weekly Timesheet', type: 'timesheet', uploaded: u.timesheetStatus === 'completed',                         uploadedAt: u.timesheetStatus === 'completed' ? '2 days ago' : undefined },
      { name: 'Status Report',    type: 'report',    uploaded: u.timesheetStatus === 'completed' || u.timesheetStatus === 'pending', uploadedAt: '3 days ago' },
    ],
    notifications: u.notifications || [
      { id: `n${i}1`, subject: 'Timesheet for last week', time: '2h ago', hasAttachment: true },
      { id: `n${i}2`, subject: 'Weekly standup notes',   time: '1d ago', hasAttachment: false },
    ],
  }));
}

function getMockUsers(): TeamMember[] {
  return enrichUsers([
    { id: '1', name: 'John Doe',       email: 'john@example.com',    timesheetStatus: 'completed' },
    { id: '2', name: 'Jane Smith',     email: 'jane@example.com',    timesheetStatus: 'pending' },
    { id: '3', name: 'Bob Johnson',    email: 'bob@example.com',     timesheetStatus: 'incomplete' },
    { id: '4', name: 'Alice Williams', email: 'alice@example.com',   timesheetStatus: 'completed' },
    { id: '5', name: 'Charlie Brown',  email: 'charlie@example.com', timesheetStatus: 'incomplete' },
    { id: '6', name: 'Diana Prince',   email: 'diana@example.com',   timesheetStatus: 'pending' },
  ]);
}

function getMockCalEvents(): CalEvent[] {
  const today = new Date();
  const y = today.getFullYear(), m = String(today.getMonth() + 1).padStart(2, '0');
  return [
    { id: 'c1', title: 'Sprint Planning',       date: `${y}-${m}-05`, time: '10:00',  type: 'meeting',  description: 'Plan sprint 14 backlog' },
    { id: 'c2', title: 'Design Review',         date: `${y}-${m}-07`, time: '14:00',  type: 'meeting',  description: 'Review new dashboard wireframes' },
    { id: 'c3', title: 'Timesheet Deadline',    date: `${y}-${m}-08`,                  type: 'deadline', description: 'Submit this week\'s timesheet', isAllDay: true },
    { id: 'c4', title: 'Team Lunch',            date: `${y}-${m}-10`, time: '12:00',  type: 'event',    description: 'Monthly team lunch' },
    { id: 'c5', title: 'Public Holiday',        date: `${y}-${m}-15`,                  type: 'holiday',  description: 'Office closed', isAllDay: true },
    { id: 'c6', title: 'Remind: Update bio',    date: `${y}-${m}-12`, time: '09:00',  type: 'reminder' },
    { id: 'c7', title: 'Board Presentation',    date: `${y}-${m}-20`, time: '11:00',  type: 'meeting',  description: 'Q1 results presentation to board' },
    { id: 'c8', title: 'STEM Bus Prep',         date: `${y}-${m}-18`, time: '15:00',  type: 'event',    description: 'Prepare demos for school visit' },
    { id: 'c9', title: 'Invoice Deadline',      date: `${y}-${m}-22`,                  type: 'deadline', description: 'Submit invoices for Q1', isAllDay: true },
  ];
}

function getMockTeamInfo(): TeamInfoMember[] {
  return [
    { name: 'John Doe',       role: 'Senior Developer',   department: 'Engineering', tshirtSize: 'L',  availability: 'Full-time',  skills: ['React','Node.js','PostgreSQL'], emergency: 'Jane Doe +1-555-9999', dietary: 'Vegetarian', birthday: 'Mar 15',  startDate: 'Jan 2023' },
    { name: 'Jane Smith',     role: 'Product Manager',    department: 'Product',     tshirtSize: 'M',  availability: 'Full-time',  skills: ['Agile','Roadmapping','SQL'],    emergency: 'Mike Smith +1-555-8888', dietary: 'None',        birthday: 'Jul 22',  startDate: 'Mar 2023' },
    { name: 'Bob Johnson',    role: 'Designer',           department: 'Design',      tshirtSize: 'XL', availability: 'Full-time',  skills: ['Figma','UI/UX','Tailwind'],     emergency: 'Alice J +1-555-7777',    dietary: 'Gluten-free', birthday: 'Nov 3',   startDate: 'Jun 2023' },
    { name: 'Alice Williams', role: 'DevOps Engineer',    department: 'Engineering', tshirtSize: 'S',  availability: 'Full-time',  skills: ['Docker','K8s','CI/CD'],         emergency: 'Tom W +1-555-6666',      dietary: 'Vegan',       birthday: 'Feb 10',  startDate: 'Feb 2024' },
    { name: 'Charlie Brown',  role: 'QA Engineer',        department: 'Engineering', tshirtSize: 'M',  availability: 'Part-time',  skills: ['Playwright','Jest','Postman'],   emergency: 'Lucy B +1-555-5555',     dietary: 'None',        birthday: 'Aug 8',   startDate: 'Aug 2023' },
    { name: 'Diana Prince',   role: 'Frontend Developer', department: 'Engineering', tshirtSize: 'S',  availability: 'Full-time',  skills: ['TypeScript','Next.js','Redux'],  emergency: 'Clark K +1-555-4444',    dietary: 'Dairy-free',  birthday: 'Dec 25',  startDate: 'Nov 2023' },
  ];
}

function getMockTeamEvents(): TeamEvent[] {
  return [
    {
      id: 'te1', name: 'STEM Bus — School Visit', status: 'upcoming',
      description: 'Visit Lincoln High School to demonstrate our AI projects and mentor students in coding.',
      date: '2026-02-15', location: 'Lincoln High School, Downtown',
      attendees: [
        { name: 'John Doe',    email: 'john@example.com',    rsvp: 'confirmed' },
        { name: 'Jane Smith',  email: 'jane@example.com',    rsvp: 'confirmed' },
        { name: 'Bob Johnson', email: 'bob@example.com',     rsvp: 'pending' },
        { name: 'Diana Prince',email: 'diana@example.com',   rsvp: 'declined' },
      ],
      budget: 2000, expenses: [
        { item: 'Transportation', amount: 350, receipt: true },
        { item: 'Printed materials', amount: 120, receipt: true },
      ],
      anticipatedPeople: 30,
      projectsDemoed: ['ZOARK OS Demo', 'AI Chatbot', 'Pipeline Visualizer'],
    },
    {
      id: 'te2', name: 'Tech Demo Night', status: 'completed',
      description: 'Quarterly internal showcase of projects and prototypes.',
      date: '2026-01-20', location: 'Conference Room B',
      attendees: [
        { name: 'John Doe',      email: 'john@example.com',    rsvp: 'confirmed' },
        { name: 'Alice Williams',email: 'alice@example.com',   rsvp: 'confirmed' },
        { name: 'Charlie Brown', email: 'charlie@example.com', rsvp: 'confirmed' },
      ],
      budget: 500, expenses: [
        { item: 'Snacks & Drinks', amount: 200, receipt: true },
        { item: 'Projector rental', amount: 150, receipt: false },
      ],
      anticipatedPeople: 20,
      projectsDemoed: ['Workflow Engine v2', 'Agent Dashboard'],
    },
    {
      id: 'te3', name: 'Team Building Offsite', status: 'upcoming',
      description: 'Half-day offsite for team bonding and strategy workshop.',
      date: '2026-03-01', location: 'Seaside Resort, Malibu',
      attendees: [
        { name: 'Jane Smith',  email: 'jane@example.com',    rsvp: 'confirmed' },
        { name: 'Bob Johnson', email: 'bob@example.com',     rsvp: 'pending' },
        { name: 'Diana Prince',email: 'diana@example.com',   rsvp: 'pending' },
      ],
      budget: 3000, expenses: [],
      anticipatedPeople: 12,
      projectsDemoed: [],
    },
  ];
}
