'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

interface AgentBuilderProps {
  onSave: (config: any) => void;
  initialAgent?: any;
}

export default function AgentBuilder({ onSave, initialAgent }: AgentBuilderProps) {
  const [name, setName] = useState(initialAgent?.name || '');
  const [description, setDescription] = useState(initialAgent?.description || '');
  const [role, setRole] = useState(initialAgent?.role || '');
  const [goal, setGoal] = useState(initialAgent?.goal || '');
  const [backstory, setBackstory] = useState(initialAgent?.backstory || '');
  const [llmProvider, setLlmProvider] = useState(initialAgent?.llmProvider || 'openai');
  const [apiKeyId, setApiKeyId] = useState(initialAgent?.apiKeyId || '');
  const [selectedTools, setSelectedTools] = useState<string[]>(initialAgent?.tools || []);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const availableTools = [
    { name: 'search', description: 'Search the web using DuckDuckGo' },
    { name: 'wikipedia', description: 'Search Wikipedia for information' },
    { name: 'read_file', description: 'Read files from the system' },
    { name: 'write_file', description: 'Write files to the system' },
  ];

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools(prev =>
      prev.includes(toolName)
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    );
  };

  const handleSave = async () => {
    if (!name || !role || !goal || !backstory || !apiKeyId) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name,
        description,
        role,
        goal,
        backstory,
        llmProvider,
        apiKeyId,
        tools: selectedTools,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Define your agent's identity and purpose</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Agent Name *</label>
            <Input
              placeholder="e.g., Lead Qualifier, Resume Screener"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="What does this agent do?"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Role *</label>
              <Input
                placeholder="e.g., Sales Agent, HR Specialist"
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">LLM Provider *</label>
              <select
                value={llmProvider}
                onChange={(e: any) => setLlmProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="huggingface">HuggingFace</option>
                <option value="custom">Custom LLM</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Personality */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Personality</CardTitle>
          <CardDescription>Define your agent's goal and backstory</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Goal *</label>
            <textarea
              placeholder="What is the agent's main goal?"
              value={goal}
              onChange={(e: any) => setGoal(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Backstory *</label>
            <textarea
              placeholder="Give the agent a backstory to guide its behavior"
              value={backstory}
              onChange={(e: any) => setBackstory(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* API Key Selection */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Select which API key to use for this agent</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-2">API Key *</label>
            <select
              value={apiKeyId}
              onChange={(e: any) => setApiKeyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select an API key</option>
              {apiKeys.map((key: any) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.provider})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Don't have an API key? <a href="/settings/api-keys" className="text-blue-500 hover:underline">Add one</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tools Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Tools & Capabilities</CardTitle>
          <CardDescription>Select which tools your agent can use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableTools.map(tool => (
              <div
                key={tool.name}
                onClick={() => toggleTool(tool.name)}
                className={`p-3 border rounded-lg cursor-pointer transition ${
                  selectedTools.includes(tool.name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-sm text-gray-500">{tool.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool.name)}
                    onChange={() => {}}
                    className="w-5 h-5"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Tools */}
      {selectedTools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedTools.map(tool => (
                <span key={tool} className="px-3 py-1 bg-gray-200 rounded-full text-sm flex items-center gap-2">
                  {tool}
                  <button
                    onClick={() => toggleTool(tool)}
                    className="ml-1 text-gray-600 hover:text-gray-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading} className="gap-2">
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Agent'}
        </Button>
      </div>
    </div>
  );
}
