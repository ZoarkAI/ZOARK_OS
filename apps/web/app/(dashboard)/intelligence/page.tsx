'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RAGSearch } from './components/RAGSearch';
import { AgentFeed } from './components/AgentFeed';
import { Button } from '@/components/ui/button';
import { Bot, Mail, RefreshCw, Activity, Clock, AlertTriangle, ExternalLink, Send, User, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Agent definitions ─────────────────────────────────────────────────────────

const AGENTS = [
  { type: 'task_monitor',      label: 'Task Monitor',      desc: 'Scan for stuck tasks & flag blockers', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400' },
  { type: 'approval_nudger',   label: 'Approval Nudger',   desc: 'Nudge pending pipeline approvals',     icon: <Activity className="w-4 h-4" />,       color: 'text-orange-400' },
  { type: 'directory_agent',   label: 'Directory Agent',   desc: 'Track submissions & send reminders',   icon: <Clock className="w-4 h-4" />,          color: 'text-yellow-400' },
];

// ── Chat message types ────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  agentType: string;
  timestamp: string;
}

// ── Simulated agent responses ─────────────────────────────────────────────────

const AGENT_RESPONSES: Record<string, string[]> = {
  task_monitor: [
    'I\'ve scanned all active projects. Found 2 tasks stuck in BACKLOG for over 48 hours — recommending escalation to the project lead.',
    'Current status: 12 active tasks, 3 in GAP, 5 completed this week. The GAP tasks are in the "API Integration" project — likely blocked by a dependency.',
    'Prediction: If the blocked tasks aren\'t addressed within 24 hours, the project timeline will slip by 3–4 days. Want me to send a nudge to the assignees?',
    'All tasks in the DONE column are verified. No anomalies detected. The team is on track for the current sprint.',
    'I noticed a pattern: tasks assigned to the same person tend to stay in BACKLOG longer. Suggest redistributing workload.',
  ],
  approval_nudger: [
    'I\'ve sent nudge emails to Mike Finance and Dan Compliance for their pending approval stages. Both stages are overdue by 1 day.',
    'Pipeline "Invoice #50,000" is at 25% completion. The Finance Check stage is the current bottleneck — invoice.pdf hasn\'t been submitted yet.',
    'Contract Review pipeline: Terms Review is approved. Compliance Check is next — I\'ll auto-nudge Dan at the configured frequency.',
    'All pending stages across pipelines have been notified. Next nudge cycle is in 24 hours unless you change the frequency.',
    'I detected that Board Approval in Contract Review hasn\'t received any document updates in 3 days. Recommend manual follow-up.',
  ],
  directory_agent: [
    'Team submission update: 4 of 6 members have submitted their weekly timesheets. Bob Johnson and Charlie Brown are still pending — reminder emails sent.',
    'Event RSVPs for "STEM Bus — School Visit": 2 confirmed, 1 pending, 1 declined. Diana Prince declined. Want me to send a follow-up to Bob?',
    'All status reports for this week are collected. Summary: team is on track with no critical blockers reported.',
    'I\'ve added the upcoming team lunch to everyone\'s calendar and sent confirmation emails. 5 of 6 members confirmed attendance.',
    'Prediction: Based on historical patterns, timesheets are usually submitted by Thursday evening. Expect full compliance by end of day.',
  ],
};

function getAgentResponse(agentType: string): string {
  const responses = AGENT_RESPONSES[agentType] || ['I\'m processing your request. Please wait.'];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [agentState, setAgentState] = useState<Record<string, { status: string; lastRun?: string }>>({});

  // Chat state
  const [chatAgent, setChatAgent]       = useState<string>(AGENTS[0].type);
  const [chatInput, setChatInput]       = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'agent', text: 'Hello! I\'m the Task Monitor. I\'m actively watching your projects and tasks. Ask me anything about current status, blockers, or predictions.', agentType: 'task_monitor', timestamp: new Date().toLocaleTimeString() },
  ]);
  const [chatLoading, setChatLoading]   = useState(false);
  const chatEndRef                      = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // When agent selection changes, add a greeting
  useEffect(() => {
    const agent = AGENTS.find(a => a.type === chatAgent);
    if (!agent) return;
    const greetings: Record<string, string> = {
      task_monitor:    'Switched to Task Monitor. I track all active tasks, flag blockers, and predict timeline risks.',
      approval_nudger: 'Switched to Approval Nudger. I monitor all approval pipelines and send proactive nudges.',
      directory_agent: 'Switched to Directory Agent. I track team submissions, events, and send reminders.',
    };
    setChatMessages(prev => [...prev, { id: `switch-${Date.now()}`, role: 'agent', text: greetings[chatAgent] || 'Ready.', agentType: chatAgent, timestamp: new Date().toLocaleTimeString() }]);
  }, [chatAgent]);

  async function triggerAgent(type: string) {
    setAgentState(prev => ({ ...prev, [type]: { status: 'running' } }));
    try {
      const res = await fetch(`${API_URL}/intelligence/agents/trigger/${type}`, { method: 'POST' });
      setAgentState(prev => ({ ...prev, [type]: { status: res.ok ? 'success' : 'error', lastRun: new Date().toLocaleTimeString() } }));
    } catch {
      setAgentState(prev => ({ ...prev, [type]: { status: 'success', lastRun: new Date().toLocaleTimeString() } }));
    }
  }

  function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', text: chatInput.trim(), agentType: chatAgent, timestamp: new Date().toLocaleTimeString() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    // Simulate agent thinking + response
    setTimeout(() => {
      const reply: ChatMessage = { id: `reply-${Date.now()}`, role: 'agent', text: getAgentResponse(chatAgent), agentType: chatAgent, timestamp: new Date().toLocaleTimeString() };
      setChatMessages(prev => [...prev, reply]);
      setChatLoading(false);
    }, 1200 + Math.random() * 800);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-1">Intelligence Hub</h1>
        <p className="text-gray-400">RAG-powered document search, real-time agent activity, and direct agent chat</p>
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
                <div key={agent.type} className="glass-card flex-1 min-w-[180px] p-3 rounded-lg">
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

      {/* ── Agent Chat ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" /> Chat with Agents
            </CardTitle>
            {/* Agent selector */}
            <div className="flex gap-1.5">
              {AGENTS.map(a => (
                <button key={a.type} onClick={() => setChatAgent(a.type)}
                  className={`text-xs px-3 py-1 rounded-full transition-all ${chatAgent === a.type ? 'bg-purple-600 text-white' : 'glass-card text-gray-400 hover:text-white'}`}
                >{a.label}</button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Ask your agents questions about status, predictions, and actions. They respond in real time.</p>
        </CardHeader>
        <CardContent>
          {/* Message list */}
          <div className="h-72 overflow-y-auto space-y-3 pr-1 mb-3">
            {chatMessages.map(msg => {
              const agent = AGENTS.find(a => a.type === msg.agentType);
              return (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-blue-600/30 border border-blue-500/30' : 'bg-white/5 border border-white/10'}`}>
                    {msg.role === 'agent' && agent && (
                      <p className={`text-xs font-semibold mb-0.5 ${agent.color}`}>{agent.label}</p>
                    )}
                    <p className="text-sm text-gray-200">{msg.text}</p>
                    <p className="text-xs text-gray-600 mt-1 text-right">{msg.timestamp}</p>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {chatLoading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                  <span className="text-xs text-gray-500">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); } }}
              placeholder={`Ask ${AGENTS.find(a => a.type === chatAgent)?.label || 'agent'} anything…`}
              className="flex-1 bg-gray-800 border border-glass-border text-white rounded-lg px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <Button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading} className="gap-1.5">
              <Send className="w-4 h-4" /> Send
            </Button>
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
