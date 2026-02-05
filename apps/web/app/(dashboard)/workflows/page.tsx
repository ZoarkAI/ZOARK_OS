'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import WorkflowBuilder from './components/WorkflowBuilder';
import WorkflowList from './components/WorkflowList';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: any[];
  isActive: boolean;
  createdAt: string;
}

// ── Mock fallback ──────────────────────────────────────────────────────────────
const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: '1', name: 'Lead Qualification Pipeline',
    description: 'Scores incoming leads, routes high-value prospects directly to sales reps',
    steps: [
      { id: 's1', type: 'agent',     name: 'Lead Qualifier',  config: {} },
      { id: 's2', type: 'condition', name: 'Score ≥ 80?',     config: {} },
      { id: 's3', type: 'task',      name: 'Route to Sales',  config: {} },
    ],
    isActive: true, createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: '2', name: 'Invoice Approval Flow',
    description: 'Extracts invoice data, routes through finance review and manager approval',
    steps: [
      { id: 's1', type: 'agent',     name: 'Invoice Processor',  config: {} },
      { id: 's2', type: 'task',      name: 'Finance Review',     config: {} },
      { id: 's3', type: 'delay',     name: 'Wait 24h',           config: {} },
      { id: 's4', type: 'task',      name: 'Manager Approval',   config: {} },
    ],
    isActive: true, createdAt: '2026-01-20T00:00:00Z',
  },
  {
    id: '3', name: 'Onboarding Checklist',
    description: 'Guides new hires through orientation, IT setup, and first-week tasks',
    steps: [
      { id: 's1', type: 'task',  name: 'Welcome Email',        config: {} },
      { id: 's2', type: 'agent', name: 'Onboarding Assistant', config: {} },
      { id: 's3', type: 'task',  name: 'IT Setup',             config: {} },
    ],
    isActive: false, createdAt: '2026-01-22T00:00:00Z',
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function WorkflowsPage() {
  const [workflows, setWorkflows]               = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [activeTab, setActiveTab]               = useState('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading]                   = useState(true);

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pipelines/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) setWorkflows(await res.json());
    } catch { /* use MOCK_WORKFLOWS */ }
    finally { setLoading(false); }
  };

  const handleCreateWorkflow = async (config: any) => {
    const optimistic: Workflow = { ...config, id: `new-${Date.now()}`, isActive: true, createdAt: new Date().toISOString() };
    try {
      const res = await fetch(`${API_URL}/pipelines/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify(config),
      });
      if (res.ok) { const created = await res.json(); setWorkflows(prev => [...prev, created]); setActiveTab('list'); return; }
    } catch { /* fall through */ }
    setWorkflows(prev => [...prev, optimistic]);
    setActiveTab('list');
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    setWorkflows(prev => prev.filter(w => w.id !== id));
    try {
      await fetch(`${API_URL}/pipelines/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
    } catch { /* already removed */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-1">Workflow Builder</h1>
          <p className="text-gray-400">Create automated workflows by chaining agents and tasks</p>
        </div>
        <Button onClick={() => setActiveTab('builder')} className="gap-2">
          <Plus className="w-4 h-4" /> Create Workflow
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Workflows', value: workflows.length,                                  color: 'text-purple-400' },
          { label: 'Active',          value: workflows.filter(w => w.isActive).length,          color: 'text-green-400' },
          { label: 'Total Steps',     value: workflows.reduce((s, w) => s + w.steps.length, 0), color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 rounded-lg">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-gray-700">
        {[{ id: 'list', label: 'My Workflows' }, { id: 'builder', label: 'Builder' }].map(tab => (
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
          <WorkflowList
            workflows={workflows}
            loading={loading}
            onDelete={handleDeleteWorkflow}
            onSelect={wf => { setSelectedWorkflow(wf); setActiveTab('builder'); }}
          />
        )}
        {activeTab === 'builder' && <WorkflowBuilder onSave={handleCreateWorkflow} initialWorkflow={selectedWorkflow} />}
      </div>
    </div>
  );
}
