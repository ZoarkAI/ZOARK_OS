'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import AgentBuilder from './components/AgentBuilder';
import AgentList from './components/AgentList';
import AgentExecutor from './components/AgentExecutor';
import AgentSettings from './components/AgentSettings';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Agent {
  id: string;
  name: string;
  description: string;
  role: string;
  goal: string;
  backstory: string;
  llmProvider: string;
  apiKeyId: string;
  tools: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Mock fallback ──────────────────────────────────────────────────────────────
const MOCK_AGENTS: Agent[] = [
  { id: '1', name: 'Lead Qualifier', description: 'Scores and qualifies incoming leads using AI scoring models', role: 'Sales Agent', goal: 'Qualify leads efficiently and cut manual review time by 80%', backstory: 'Trained on thousands of past lead interactions and conversion data', llmProvider: 'openai', apiKeyId: '1', tools: ['search', 'read_file'], isActive: true, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z' },
  { id: '2', name: 'Invoice Processor', description: 'Extracts structured data from invoices and routes for approval', role: 'Finance Agent', goal: 'Process invoices with 99% accuracy and zero manual entry', backstory: 'Specialized in document extraction and financial data parsing', llmProvider: 'anthropic', apiKeyId: '2', tools: ['read_file', 'write_file'], isActive: true, createdAt: '2026-01-12T00:00:00Z', updatedAt: '2026-01-20T00:00:00Z' },
  { id: '3', name: 'Resume Screener', description: 'Analyzes resumes and ranks candidates against job requirements', role: 'HR Agent', goal: 'Surface the best candidates within minutes of application', backstory: 'HR specialist trained on successful hire patterns across industries', llmProvider: 'openai', apiKeyId: '1', tools: ['search', 'wikipedia'], isActive: false, createdAt: '2026-01-08T00:00:00Z', updatedAt: '2026-01-22T00:00:00Z' },
];

const TABS = [
  { id: 'list',     label: 'My Agents' },
  { id: 'builder', label: 'Builder' },
  { id: 'executor', label: 'Execute' },
  { id: 'settings', label: 'Settings' },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents]               = useState<Agent[]>(MOCK_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab]         = useState('list');
  const [loading, setLoading]             = useState(true);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/custom-agents`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) setAgents(await res.json());
    } catch { /* use MOCK_AGENTS */ }
    finally { setLoading(false); }
  };

  const handleCreateAgent = async (config: any) => {
    const optimistic: Agent = {
      ...config,
      id: `new-${Date.now()}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_URL}/custom-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify(config),
      });
      if (res.ok) { const created = await res.json(); setAgents(prev => [...prev, created]); setActiveTab('list'); return; }
    } catch { /* fall through to optimistic */ }
    setAgents(prev => [...prev, optimistic]);
    setActiveTab('list');
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Delete this agent? This cannot be undone.')) return;
    setAgents(prev => prev.filter(a => a.id !== agentId));
    try {
      await fetch(`${API_URL}/custom-agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
    } catch { /* already removed optimistically */ }
  };

  const handleToggleAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isActive: !a.isActive } : a));
    try {
      await fetch(`${API_URL}/custom-agents/${agentId}/${agent.isActive ? 'deactivate' : 'activate'}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
    } catch { /* already toggled optimistically */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-1">Agent Builder</h1>
          <p className="text-gray-400">Create and manage custom AI agents powered by CrewAI and LangChain</p>
        </div>
        <Button onClick={() => setActiveTab('builder')} className="gap-2">
          <Plus className="w-4 h-4" /> Create Agent
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Agents', value: agents.length,                        color: 'text-purple-400' },
          { label: 'Active',       value: agents.filter(a => a.isActive).length,  color: 'text-green-400' },
          { label: 'Inactive',     value: agents.filter(a => !a.isActive).length, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 rounded-lg">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id ? 'border-b-2 border-purple-500 text-purple-300' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'list' && (
          <AgentList
            agents={agents}
            loading={loading}
            onDelete={handleDeleteAgent}
            onActivate={handleToggleAgent}
            onDeactivate={handleToggleAgent}
            onSelect={agent => { setSelectedAgent(agent); setActiveTab('executor'); }}
          />
        )}
        {activeTab === 'builder' && <AgentBuilder onSave={handleCreateAgent} initialAgent={selectedAgent} />}
        {activeTab === 'executor' && (
          selectedAgent
            ? <AgentExecutor agent={selectedAgent} />
            : <Card><CardContent className="pt-6"><p className="text-gray-500">Select an agent from the list to execute it.</p></CardContent></Card>
        )}
        {activeTab === 'settings' && <AgentSettings />}
      </div>
    </div>
  );
}
