'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function AgentList({
  agents,
  loading,
  onDelete,
  onActivate,
  onDeactivate,
  onSelect,
}: AgentListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500">Loading agents...</p>
        </CardContent>
      </Card>
    );
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500">No agents created yet. Create your first agent to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {agents.map((agent: Agent) => (
        <Card key={agent.id} className="hover:shadow-lg transition">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{agent.name}</CardTitle>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${agent.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <CardDescription>{agent.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                {agent.isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeactivate(agent.id)}
                  >
                    <Pause size={16} />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onActivate(agent.id)}
                  >
                    <Play size={16} />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(agent)}
                >
                  <Eye size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(agent.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Role</p>
                  <p className="font-medium">{agent.role}</p>
                </div>
                <div>
                  <p className="text-gray-500">LLM Provider</p>
                  <p className="font-medium capitalize">{agent.llmProvider}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {agent.tools && agent.tools.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Tools</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.tools.map((tool: string) => (
                      <span key={tool} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
