'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Play, Edit2 } from 'lucide-react';
import WorkflowBuilder from './components/WorkflowBuilder';
import WorkflowList from './components/WorkflowList';

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: any[];
  isActive: boolean;
  createdAt: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/workflows', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (workflowConfig: any) => {
    try {
      const response = await fetch('http://localhost:8000/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(workflowConfig)
      });

      if (response.ok) {
        const newWorkflow = await response.json();
        setWorkflows([...workflows, newWorkflow]);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`http://localhost:8000/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        setWorkflows(workflows.filter(w => w.id !== workflowId));
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Builder</h1>
          <p className="text-gray-500 mt-2">Create automated workflows by chaining agents and tasks</p>
        </div>
        <Button onClick={() => setActiveTab('builder')} className="gap-2">
          <Plus size={20} />
          Create Workflow
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 font-medium ${activeTab === 'list' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          My Workflows
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-4 py-2 font-medium ${activeTab === 'builder' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Builder
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'list' && (
          <WorkflowList
            workflows={workflows}
            loading={loading}
            onDelete={handleDeleteWorkflow}
            onSelect={setSelectedWorkflow}
          />
        )}

        {activeTab === 'builder' && (
          <WorkflowBuilder
            onSave={handleCreateWorkflow}
            initialWorkflow={selectedWorkflow}
          />
        )}
      </div>
    </div>
  );
}
