'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Play, Pause, Eye } from 'lucide-react';
import AgentBuilder from './components/AgentBuilder';
import AgentList from './components/AgentList';
import AgentExecutor from './components/AgentExecutor';
import AgentSettings from './components/AgentSettings';

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/custom-agents', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (agentConfig: any) => {
    try {
      const response = await fetch('http://localhost:8000/custom-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(agentConfig)
      });

      if (response.ok) {
        const newAgent = await response.json();
        setAgents([...agents, newAgent]);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`http://localhost:8000/custom-agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        setAgents(agents.filter(a => a.id !== agentId));
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleActivateAgent = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/custom-agents/${agentId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error('Error activating agent:', error);
    }
  };

  const handleDeactivateAgent = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/custom-agents/${agentId}/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error('Error deactivating agent:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent Builder</h1>
          <p className="text-gray-500 mt-2">Create and manage custom AI agents powered by CrewAI and LangChain</p>
        </div>
        <Button onClick={() => setActiveTab('builder')} className="gap-2">
          <Plus size={20} />
          Create Agent
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 font-medium ${activeTab === 'list' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          My Agents
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-4 py-2 font-medium ${activeTab === 'builder' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Builder
        </button>
        <button
          onClick={() => setActiveTab('executor')}
          className={`px-4 py-2 font-medium ${activeTab === 'executor' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Execute
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'list' && (
          <AgentList
            agents={agents}
            loading={loading}
            onDelete={handleDeleteAgent}
            onActivate={handleActivateAgent}
            onDeactivate={handleDeactivateAgent}
            onSelect={(agent) => setSelectedAgent(agent)}
          />
        )}

        {activeTab === 'builder' && (
          <AgentBuilder
            onSave={handleCreateAgent}
            initialAgent={selectedAgent}
          />
        )}

        {activeTab === 'executor' && (
          <>
            {selectedAgent ? (
              <AgentExecutor agent={selectedAgent} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500">Select an agent from the list to execute it</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <AgentSettings />
        )}
      </div>
    </div>
  );
}
