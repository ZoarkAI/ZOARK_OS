'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Check } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AgentBuilderProps {
  onSave: (config: any) => void;
  initialAgent?: any;
}

const AVAILABLE_TOOLS = [
  { name: 'search',     description: 'Search the web using DuckDuckGo' },
  { name: 'wikipedia', description: 'Search Wikipedia for information' },
  { name: 'read_file', description: 'Read files from the system' },
  { name: 'write_file', description: 'Write files to the system' },
];

export default function AgentBuilder({ onSave, initialAgent }: AgentBuilderProps) {
  const [name, setName]                   = useState(initialAgent?.name || '');
  const [description, setDescription]     = useState(initialAgent?.description || '');
  const [role, setRole]                   = useState(initialAgent?.role || '');
  const [goal, setGoal]                   = useState(initialAgent?.goal || '');
  const [backstory, setBackstory]         = useState(initialAgent?.backstory || '');
  const [llmProvider, setLlmProvider]     = useState(initialAgent?.llmProvider || 'openai');
  const [apiKeyId, setApiKeyId]           = useState(initialAgent?.apiKeyId || '');
  const [selectedTools, setSelectedTools] = useState<string[]>(initialAgent?.tools || []);
  const [apiKeys, setApiKeys]             = useState<any[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => { fetchApiKeys(); }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`${API_URL}/api-keys`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) setApiKeys(await res.json());
    } catch { /* no keys available */ }
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools(prev =>
      prev.includes(toolName) ? prev.filter(t => t !== toolName) : [...prev, toolName]
    );
  };

  const handleSave = async () => {
    if (!name || !role || !goal || !backstory) {
      setError('Please fill in Name, Role, Goal, and Backstory.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, description, role, goal, backstory, llmProvider, apiKeyId, tools: selectedTools });
    } finally {
      setLoading(false);
    }
  };

  // Common input/select/textarea styles
  const inputCls  = 'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500';
  const selectCls = 'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500';

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Agent Name *</label>
            <Input placeholder="e.g., Lead Qualifier" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
            <textarea placeholder="What does this agent do?" value={description} onChange={e => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Role *</label>
              <Input placeholder="e.g., Sales Agent" value={role} onChange={e => setRole(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">LLM Provider</label>
              <select value={llmProvider} onChange={e => setLlmProvider(e.target.value)} className={selectCls}>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="huggingface">HuggingFace</option>
                <option value="custom">Custom LLM</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Personality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Goal *</label>
            <textarea placeholder="What is the agent's main goal?" value={goal} onChange={e => setGoal(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Backstory *</label>
            <textarea placeholder="Give the agent a backstory to guide its behavior…" value={backstory} onChange={e => setBackstory(e.target.value)} rows={4} className={`${inputCls} resize-none`} />
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
          <select value={apiKeyId} onChange={e => setApiKeyId(e.target.value)} className={selectCls}>
            <option value="">Select an API key</option>
            {apiKeys.map((key: any) => (
              <option key={key.id} value={key.id}>{key.name} ({key.provider})</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            No keys? <Link href="/settings/api-keys" className="text-purple-400 hover:text-purple-300">Add one in Settings</Link>
          </p>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tools & Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {AVAILABLE_TOOLS.map(tool => {
              const selected = selectedTools.includes(tool.name);
              return (
                <div
                  key={tool.name}
                  onClick={() => toggleTool(tool.name)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${selected ? 'text-purple-300' : 'text-gray-300'}`}>{tool.name}</p>
                      <p className="text-xs text-gray-500">{tool.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selected ? 'bg-purple-600 border-purple-600' : 'border-gray-600'}`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected pills */}
          {selectedTools.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-700">
              {selectedTools.map(tool => (
                <span key={tool} className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  {tool}
                  <button onClick={() => toggleTool(tool)} className="text-purple-400 hover:text-white">×</button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={loading} className="gap-2 w-full">
        <Save className="w-4 h-4" />
        {loading ? 'Saving…' : 'Save Agent'}
      </Button>
    </div>
  );
}
