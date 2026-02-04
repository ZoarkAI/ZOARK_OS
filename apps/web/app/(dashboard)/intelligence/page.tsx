'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RAGSearch } from './components/RAGSearch';
import { AgentFeed } from './components/AgentFeed';
import { Button } from '@/components/ui/button';
import { Bot, Mail, RefreshCw, Activity, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Agent definitions ─────────────────────────────────────────────────────────

const AGENTS = [
  { type: 'task_monitor',      label: 'Task Monitor',      desc: 'Scan for stuck tasks',  icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400'    },
  { type: 'timesheet_drafter', label: 'Timesheet Drafter', desc: 'Send reminders',        icon: <Clock    className="w-4 h-4" />, color: 'text-yellow-400' },
  { type: 'approval_nudger',   label: 'Approval Nudger',   desc: 'Nudge approvers',       icon: <Activity className="w-4 h-4" />, color: 'text-orange-400' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [agentState, setAgentState] = useState<Record<string, { status: string; lastRun?: string }>>({});

  async function triggerAgent(type: string) {
    setAgentState(prev => ({ ...prev, [type]: { status: 'running' } }));
    try {
      const res = await fetch(`${API_URL}/intelligence/agents/trigger/${type}`, { method: 'POST' });
      setAgentState(prev => ({ ...prev, [type]: { status: res.ok ? 'success' : 'error', lastRun: new Date().toLocaleTimeString() } }));
    } catch {
      setAgentState(prev => ({ ...prev, [type]: { status: 'success', lastRun: new Date().toLocaleTimeString() } }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-1">Intelligence Hub</h1>
        <p className="text-gray-400">RAG-powered document search, real-time agent activity &amp; account connections</p>
      </div>

      {/* ── Quick Agent Triggers ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-sm">Quick Agent Triggers</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => AGENTS.forEach(a => triggerAgent(a.type))} className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" /> Run All
            </Button>
          </div>

          <div className="flex gap-3 flex-wrap">
            {AGENTS.map(agent => {
              const st = agentState[agent.type];
              const statusColor = st?.status === 'success' ? 'bg-green-500/20 text-green-400'
                               : st?.status === 'running' ? 'bg-yellow-500/20 text-yellow-400'
                               : st?.status === 'error'   ? 'bg-red-500/20 text-red-400'
                               : '';
              return (
                <div key={agent.type} className="glass-card flex-1 min-w-[160px] p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className={`flex items-center gap-1.5 ${agent.color}`}>
                      {agent.icon}
                      <span className="text-xs font-medium">{agent.label}</span>
                    </div>
                    {st && <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor}`}>{st.status}</span>}
                  </div>
                  <p className="text-xs text-gray-500">{agent.desc}</p>
                  {st?.lastRun && <p className="text-xs text-gray-600">Last: {st.lastRun}</p>}
                  <button
                    onClick={() => triggerAgent(agent.type)}
                    disabled={st?.status === 'running'}
                    className="mt-2 w-full text-xs bg-purple-600/60 hover:bg-purple-600 text-white rounded px-2 py-1 disabled:opacity-50 transition-colors"
                  >
                    {st?.status === 'running' ? 'Running…' : 'Trigger'}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── RAG Search + Agent Feed (two columns) ── */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Document Search</CardTitle>
            <p className="text-sm text-gray-400 mt-1">Semantic search powered by embeddings + vector DB</p>
          </CardHeader>
          <CardContent><RAGSearch /></CardContent>
        </Card>

        <AgentFeed />
      </div>

      {/* ── Connected Email Accounts ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" /> Connected Email Accounts
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Attachments from emails processed by agents are automatically indexed for RAG search.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'Gmail',   color: 'text-red-400',    bg: 'bg-red-500/20' },
              { name: 'Outlook', color: 'text-blue-400',   bg: 'bg-blue-500/20' },
              { name: 'Yahoo',   color: 'text-purple-400', bg: 'bg-purple-500/20' },
            ].map(acct => (
              <div key={acct.name} className="glass-card p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded ${acct.bg} flex items-center justify-center`}>
                    <Mail className={`w-4 h-4 ${acct.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{acct.name}</p>
                    <p className="text-xs text-gray-500">Configure in Settings</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            To connect an inbox, go to <strong className="text-purple-400">Directory → Email Settings</strong> and enter your SMTP credentials.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
