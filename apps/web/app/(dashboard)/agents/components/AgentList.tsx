'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Play, Pause, Eye } from 'lucide-react';

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

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onSelect: (agent: Agent) => void;
}

export default function AgentList({ agents, loading, onDelete, onActivate, onDeactivate, onSelect }: AgentListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500">Loading agents…</p>
        </CardContent>
      </Card>
    );
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <p className="text-gray-500">No agents created yet. Use the Builder tab to create your first agent.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => (
        <Card key={agent.id}>
          <CardContent className="pt-5">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full mt-0.5 ${agent.isActive ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      agent.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-600/50 text-gray-400'
                    }`}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => agent.isActive ? onDeactivate(agent.id) : onActivate(agent.id)}
                  className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title={agent.isActive ? 'Pause' : 'Resume'}
                >
                  {agent.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onSelect(agent)}
                  className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-purple-400 transition-colors"
                  title="Execute"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(agent.id)}
                  className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Role: <span className="text-gray-300 font-medium">{agent.role}</span></span>
                <span>LLM: <span className="text-gray-300 font-medium capitalize">{agent.llmProvider}</span></span>
                <span>Created: <span className="text-gray-300 font-medium">{new Date(agent.createdAt).toLocaleDateString()}</span></span>
              </div>
            </div>

            {/* Tools */}
            {agent.tools && agent.tools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {agent.tools.map(tool => (
                  <span key={tool} className="text-xs bg-gray-700/50 text-gray-300 border border-gray-600 px-2 py-0.5 rounded">
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
