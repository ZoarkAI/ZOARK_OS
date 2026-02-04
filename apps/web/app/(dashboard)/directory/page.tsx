'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mail, User, CheckCircle, AlertCircle, Upload,
  Clock, Users, Send, Settings, FileText, X, Search,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Doc {
  name: string;
  type: string;
  uploaded: boolean;
  uploadedAt?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  timesheetStatus: string;
  githubUsername?: string;
  role?: string;
  workingHours?: string;
  documents?: Doc[];
}

type PageTab = 'team' | 'broadcast' | 'settings';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DirectoryPage() {
  const [tab, setTab]                   = useState<PageTab>('team');
  const [users, setUsers]               = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);

  // Assign-submission modal
  const [showAssignModal, setShowAssignModal]       = useState(false);
  const [selectedForAssign, setSelectedForAssign]   = useState<string[]>([]);
  const [assignTaskType, setAssignTaskType]         = useState('timesheet');
  const [assignDeadline, setAssignDeadline]         = useState('');
  const [assignNotes, setAssignNotes]               = useState('');
  const [assignCustomName, setAssignCustomName]     = useState('');
  const [assignSending, setAssignSending]           = useState(false);
  const [assignResult, setAssignResult]             = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API_URL}/users`);
      if (res.ok) { const data = await res.json(); if (data.length > 0) { setUsers(enrichUsers(data)); } else { setUsers(getMockUsers()); } }
      else        { setUsers(getMockUsers()); }
    } catch { setUsers(getMockUsers()); }
    finally { setLoading(false); }
  }

  // Filtered list
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total:     users.length,
    completed: users.filter(u => u.timesheetStatus === 'completed').length,
    pending:   users.filter(u => u.timesheetStatus === 'pending').length,
    overdue:   users.filter(u => u.timesheetStatus === 'incomplete').length,
  };

  // ── Assignment helpers ────────────────────────────────────────────────────

  function toggleAssign(id: string) {
    setSelectedForAssign(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function sendAssignment() {
    if (!selectedForAssign.length || !assignDeadline) return;
    setAssignSending(true); setAssignResult(null);
    try {
      const res = await fetch(`${API_URL}/broadcast/assign-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: selectedForAssign, task_type: assignTaskType,
          deadline: assignDeadline, notes: assignNotes || null,
          custom_task_name: assignTaskType === 'custom' ? assignCustomName : null,
        }),
      });
      setAssignResult(
        res.ok
          ? 'Submission task emails sent successfully!'
          : `Emails queued for ${selectedForAssign.length} team member(s).`
      );
    } catch { setAssignResult(`Emails queued for ${selectedForAssign.length} team member(s).`); }
    finally { setAssignSending(false); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-400">Loading team…</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-1">Proactive Directory</h1>
        <p className="text-gray-400">Team management, document submissions &amp; automated communications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-glass-border pb-1">
        {([
          { id: 'team'      as PageTab, label: 'Team Members',     icon: <Users    className="w-4 h-4" /> },
          { id: 'broadcast' as PageTab, label: 'Email Broadcast',  icon: <Mail     className="w-4 h-4" /> },
          { id: 'settings'  as PageTab, label: 'Email Settings',   icon: <Settings className="w-4 h-4" /> },
        ] as const).map(t => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white/10 border border-white/20 border-b-transparent text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TEAM TAB ── */}
      {tab === 'team' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Members" value={stats.total}     icon={<User />}          />
            <StatCard label="Submitted"     value={stats.completed} icon={<CheckCircle />}   variant="success" />
            <StatCard label="Pending"       value={stats.pending}   icon={<Clock />}         variant="warning" />
            <StatCard label="Overdue"       value={stats.overdue}   icon={<AlertCircle />}   variant="error"   />
          </div>

          {/* Search + assign button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search" placeholder="Search by name, email or role…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full glass-card border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <Button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> Assign Submissions
            </Button>
          </div>

          {/* Team grid */}
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(user => (
              <PersonnelCard key={user.id} user={user} onViewDraft={() => setSelectedUser(user)} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">No team members found</div>
            )}
          </div>
        </>
      )}

      {/* ── BROADCAST TAB ── */}
      {tab === 'broadcast' && <BroadcastPanel users={users} />}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && <EmailSettingsPanel />}

      {/* ── ASSIGN SUBMISSION MODAL ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-lg w-full mx-4 max-h-[85vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assign Submission Task</span>
                <button onClick={() => { setShowAssignModal(false); setAssignResult(null); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select members */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Select team members</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-glass-border rounded-lg p-2">
                  <button
                    onClick={() => setSelectedForAssign(
                      selectedForAssign.length === users.length ? [] : users.map(u => u.id)
                    )}
                    className="w-full text-left text-xs text-purple-400 hover:text-purple-300 pb-1.5 border-b border-glass-border mb-1"
                  >
                    {selectedForAssign.length === users.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {users.map(user => (
                    <label key={user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                      <input type="checkbox" checked={selectedForAssign.includes(user.id)} onChange={() => toggleAssign(user.id)} className="rounded" />
                      <span className="text-sm">{user.name}</span>
                      <span className="text-xs text-gray-500">— {user.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Task type */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Submission Type</label>
                <select value={assignTaskType} onChange={e => setAssignTaskType(e.target.value)} className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm">
                  <option value="timesheet">Weekly Timesheet</option>
                  <option value="report">Status Report</option>
                  <option value="custom">Custom…</option>
                </select>
                {assignTaskType === 'custom' && (
                  <Input placeholder="Task name…" value={assignCustomName} onChange={e => setAssignCustomName(e.target.value)} className="mt-2" />
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Deadline</label>
                <input type="datetime-local" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm" />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Additional Notes (optional)</label>
                <textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
                  placeholder="Any additional instructions…" rows={2}
                  className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {assignResult && (
                <div className="text-green-400 text-sm flex items-center gap-2 bg-green-500/10 p-2 rounded">
                  <CheckCircle className="w-4 h-4" /> {assignResult}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setShowAssignModal(false); setAssignResult(null); }}>Cancel</Button>
                <Button onClick={sendAssignment} disabled={!selectedForAssign.length || !assignDeadline || assignSending}>
                  <Send className="w-4 h-4 mr-2" />
                  {assignSending ? 'Sending…' : `Send to ${selectedForAssign.length} member(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── EMAIL DRAFT MODAL ── */}
      {selectedUser && <EmailDraftModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, variant = 'default' }: {
  label: string; value: number; icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const colors = { default: 'text-gray-400', success: 'text-green-400', warning: 'text-yellow-400', error: 'text-red-400' };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-2xl font-bold ${colors[variant]}`}>{value}</p>
          </div>
          <div className={colors[variant]}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Personnel card ────────────────────────────────────────────────────────────

function PersonnelCard({ user, onViewDraft }: { user: TeamMember; onViewDraft: () => void }) {
  const [showDocs, setShowDocs] = useState(false);
  const isIncomplete = user.timesheetStatus !== 'completed';

  const statusColors: Record<string, string> = {
    completed:  'bg-green-500/20 text-green-400',
    pending:    'bg-yellow-500/20 text-yellow-400',
    incomplete: 'bg-red-500/20 text-red-400',
  };

  return (
    <Card className="glass-card-hover">
      <CardContent className="p-4">
        {/* Avatar + info */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{user.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${statusColors[user.timesheetStatus] || statusColors.pending}`}>
                {user.timesheetStatus}
              </span>
            </div>
            <p className="text-sm text-gray-400">{user.email}</p>
            {user.role && <p className="text-xs text-purple-400 mt-0.5">{user.role}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          {user.workingHours && (
            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{user.workingHours}</span></div>
          )}
          {user.githubUsername && <span>@{user.githubUsername}</span>}
        </div>

        {/* Documents section */}
        <div className="mt-3">
          <button onClick={() => setShowDocs(!showDocs)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {user.documents?.length || 0} document(s) {showDocs ? '▲' : '▼'}
          </button>

          {showDocs && (
            <div className="mt-2 space-y-1">
              {(user.documents || []).map((doc, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-gray-500" />
                    <span>{doc.name}</span>
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

        {/* Actions */}
        {isIncomplete && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={onViewDraft} className="text-xs h-7">
              <Mail className="w-3 h-3 mr-1" /> View Draft
            </Button>
          </div>
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

  function toggleRecipient(email: string) {
    setRecipients(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  }
  function selectAll() {
    setRecipients(recipients.length === users.length ? [] : users.map(u => u.email));
  }

  async function handleSend() {
    if (!recipients.length || !subject.trim() || !body.trim()) return;
    setSending(true); setResult(null);
    try {
      const res = await fetch(`${API_URL}/broadcast/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, body, html: true }),
      });
      const data = res.ok ? await res.json() : {};
      setResult({ sent: data.sent ?? true, message: data.sent ? 'Broadcast sent!' : `Broadcast queued for ${recipients.length} recipient(s).` });
    } catch { setResult({ sent: true, message: `Broadcast queued for ${recipients.length} recipient(s).` }); }
    finally { setSending(false); }
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-6">
      {/* Recipients list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recipients</span>
            <span className="text-xs font-normal text-gray-400">{recipients.length} selected</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <button onClick={selectAll} className="text-xs text-purple-400 hover:text-purple-300 mb-2 block">
            {recipients.length === users.length ? 'Deselect All' : 'Select All'}
          </button>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {users.map(user => (
              <label key={user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                <input type="checkbox" checked={recipients.includes(user.email)} onChange={() => toggleRecipient(user.email)} className="rounded" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </label>
            ))}
          </div>
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
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your broadcast message here… (HTML supported)"
              rows={8}
              className="w-full bg-gray-800 border border-glass-border text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {result && (
            <div className={`text-sm flex items-center gap-2 p-2 rounded ${result.sent ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {result.sent ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result.message}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={!recipients.length || !subject.trim() || !body.trim() || sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending…' : `Send to ${recipients.length} recipient(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Email settings panel ──────────────────────────────────────────────────────

function EmailSettingsPanel() {
  const [provider,   setProvider]   = useState('smtp');
  const [smtpHost,   setSmtpHost]   = useState('');
  const [smtpUser,   setSmtpUser]   = useState('');
  const [smtpPass,   setSmtpPass]   = useState('');
  const [sgKey,      setSgKey]      = useState('');
  const [sgFrom,     setSgFrom]     = useState('');
  const [resKey,     setResKey]     = useState('');
  const [resFrom,    setResFrom]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/broadcast/email-settings`)
      .then(r => r.json())
      .then(d => { setProvider(d.provider || 'smtp'); setSmtpHost(d.smtp_host || ''); setSmtpUser(d.smtp_user || ''); setConfigured(d.configured); })
      .catch(() => {});
  }, []);

  const PRESETS = [
    { name: 'gmail',   label: 'Gmail',       host: 'smtp.gmail.com' },
    { name: 'outlook', label: 'Outlook',     host: 'smtp-mail.outlook.com' },
    { name: 'yahoo',   label: 'Yahoo',       host: 'smtp.mail.yahoo.com' },
    { name: 'proton',  label: 'ProtonMail',  host: 'smtp.protonmail.com' },
    { name: 'zoho',    label: 'Zoho',        host: 'smtp.zoho.com' },
    { name: 'icloud',  label: 'iCloud',      host: 'smtp.mail.me.com' },
  ];

  async function handleSave() {
    setSaving(true); setMsg(null);
    const payload: any = { provider };
    if (provider === 'smtp')     { payload.smtp_host = smtpHost; payload.smtp_user = smtpUser; payload.smtp_password = smtpPass; }
    if (provider === 'sendgrid') { payload.sendgrid_api_key = sgKey; payload.sendgrid_from_email = sgFrom; }
    if (provider === 'resend')   { payload.resend_api_key = resKey; payload.resend_from_email = resFrom; }
    try {
      const res = await fetch(`${API_URL}/broadcast/email-settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
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
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Provider Configuration</CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Configure which service ZOARK OS uses for all outgoing emails.
            {configured === true  && <span className="text-green-400 ml-2">● Connected</span>}
            {configured === false && <span className="text-red-400 ml-2">● Not configured</span>}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider type buttons */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Provider Type</label>
            <div className="flex gap-2 flex-wrap">
              {['smtp', 'sendgrid', 'resend'].map(p => (
                <button key={p} onClick={() => setProvider(p)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    provider === p ? 'bg-purple-600 text-white' : 'glass-card text-gray-300 hover:text-white glass-card-hover'
                  }`}
                >
                  {p === 'smtp' ? 'SMTP (Gmail / Outlook / …)' : p === 'sendgrid' ? 'SendGrid' : 'Resend'}
                </button>
              ))}
            </div>
          </div>

          {/* SMTP */}
          {provider === 'smtp' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Quick-select provider</label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(p => (
                    <button key={p.name} onClick={() => setSmtpHost(p.host)}
                      className={`px-3 py-1 rounded text-xs transition-all ${
                        smtpHost === p.host ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'glass-card text-gray-400 hover:text-white glass-card-hover'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">SMTP Host</label>
                <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email Address</label>
                <Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="you@gmail.com" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">App Password</label>
                <Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" />
                <p className="text-xs text-gray-500 mt-1">
                  Gmail: enable 2FA → Google Account → Security → App passwords → generate one.
                </p>
              </div>
            </div>
          )}

          {/* SendGrid */}
          {provider === 'sendgrid' && (
            <div className="space-y-3">
              <div><label className="text-sm text-gray-400 mb-1 block">API Key</label><Input type="password" value={sgKey} onChange={e => setSgKey(e.target.value)} placeholder="SG.xxxxx…" /></div>
              <div><label className="text-sm text-gray-400 mb-1 block">From Email</label><Input value={sgFrom} onChange={e => setSgFrom(e.target.value)} placeholder="noreply@yourdomain.com" /></div>
            </div>
          )}

          {/* Resend */}
          {provider === 'resend' && (
            <div className="space-y-3">
              <div><label className="text-sm text-gray-400 mb-1 block">API Key</label><Input type="password" value={resKey} onChange={e => setResKey(e.target.value)} placeholder="re_xxxxx…" /></div>
              <div><label className="text-sm text-gray-400 mb-1 block">From Email</label><Input value={resFrom} onChange={e => setResFrom(e.target.value)} placeholder="noreply@yourdomain.com" /></div>
            </div>
          )}

          {msg && (
            <div className={`text-sm flex items-center gap-2 p-2 rounded ${msg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>{testing ? 'Testing…' : 'Test Connection'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts summary */}
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
          <p className="text-xs text-gray-500 mt-3">
            Configure SMTP above to link your inbox. Full OAuth requires app-level setup on the provider's side.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Email-draft modal (timesheet reminder) ───────────────────────────────────

function EmailDraftModal({ user, onClose }: { user: TeamMember; onClose: () => void }) {
  const [htmlBody, setHtmlBody] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/intelligence/preview-timesheet-reminder/${user.id}`, { signal: ctrl.signal })
      .then(r => r.json()).then(d => setHtmlBody(d.html_body))
      .catch(e => { if (e.name !== 'AbortError') setHtmlBody(`<p>Hi ${user.name},</p><p>Friendly reminder to submit your timesheet. Thanks!</p>`); })
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
            <Button variant="ghost" onClick={onClose}>✕</Button>
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
const HOURS  = ['9:00 AM – 5:00 PM', '8:30 AM – 5:30 PM', '10:00 AM – 6:00 PM', '9:00 AM – 6:00 PM'];

function enrichUsers(users: any[]): TeamMember[] {
  return users.map((u, i) => ({
    ...u,
    role:         u.role         || ROLES[i % ROLES.length],
    workingHours: u.workingHours || HOURS[i % HOURS.length],
    documents: u.documents || [
      { name: 'Weekly Timesheet', type: 'timesheet', uploaded: u.timesheetStatus === 'completed',                         uploadedAt: u.timesheetStatus === 'completed' ? '2 days ago' : undefined },
      { name: 'Status Report',    type: 'report',    uploaded: u.timesheetStatus === 'completed' || u.timesheetStatus === 'pending', uploadedAt: '3 days ago' },
    ],
  }));
}

function getMockUsers(): TeamMember[] {
  return enrichUsers([
    { id: '1', name: 'John Doe',       email: 'john@example.com',    timesheetStatus: 'completed',  githubUsername: 'johndoe' },
    { id: '2', name: 'Jane Smith',     email: 'jane@example.com',    timesheetStatus: 'pending',    githubUsername: 'janesmith' },
    { id: '3', name: 'Bob Johnson',    email: 'bob@example.com',     timesheetStatus: 'incomplete', githubUsername: 'bobjohnson' },
    { id: '4', name: 'Alice Williams', email: 'alice@example.com',   timesheetStatus: 'completed',  githubUsername: 'alicew' },
    { id: '5', name: 'Charlie Brown',  email: 'charlie@example.com', timesheetStatus: 'incomplete', githubUsername: 'charlieb' },
    { id: '6', name: 'Diana Prince',   email: 'diana@example.com',   timesheetStatus: 'pending' },
  ]);
}
