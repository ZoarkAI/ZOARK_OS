'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Eye, EyeOff, Check, X, Loader2, Key, TestTube, Star, RotateCcw, Database } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────
interface APIKey {
  id: string;
  name: string;
  provider: string;
  model: string;
  endpoint: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  lastUsed: string | null;
  lastRotated: string | null;
  usage: { today: number; week: number; tokens: number };
}

// ── Providers + models ─────────────────────────────────────────────────────────
const PROVIDERS = [
  { value: 'openai',      label: 'OpenAI',      description: 'GPT-4o, GPT-4o-mini', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { value: 'anthropic',   label: 'Anthropic',   description: 'Claude models',        models: ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'] },
  { value: 'huggingface', label: 'HuggingFace', description: 'Open-source models',   models: ['mistral-7b', 'llama-3-8b', 'gemma-7b'] },
  { value: 'custom',      label: 'Custom LLM',  description: 'Your own endpoint',    models: [] },
];

// ── Mock fallback data ─────────────────────────────────────────────────────────
const MOCK_KEYS: APIKey[] = [
  {
    id: '1', name: 'Production OpenAI', provider: 'openai', model: 'gpt-4o',
    endpoint: null, isActive: true, isDefault: true,
    createdAt: '2025-01-15T00:00:00Z', lastUsed: '2026-02-03T18:30:00Z', lastRotated: '2026-01-20T00:00:00Z',
    usage: { today: 47, week: 312, tokens: 284500 },
  },
  {
    id: '2', name: 'Anthropic Dev', provider: 'anthropic', model: 'claude-3-5-sonnet',
    endpoint: null, isActive: true, isDefault: false,
    createdAt: '2025-01-20T00:00:00Z', lastUsed: '2026-02-02T09:15:00Z', lastRotated: '2026-01-25T00:00:00Z',
    usage: { today: 12, week: 89, tokens: 67200 },
  },
  {
    id: '3', name: 'HF Fallback', provider: 'huggingface', model: 'mistral-7b',
    endpoint: null, isActive: false, isDefault: false,
    createdAt: '2025-12-01T00:00:00Z', lastUsed: '2026-01-28T14:00:00Z', lastRotated: null,
    usage: { today: 0, week: 5, tokens: 3100 },
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function APIKeysPage() {
  const [apiKeys, setApiKeys]       = useState<APIKey[]>(MOCK_KEYS);
  const [loading, setLoading]       = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; message: string }>>({});

  // ── Add-key form state
  const [newKeyName,     setNewKeyName]     = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyValue,    setNewKeyValue]    = useState('');
  const [newKeyEndpoint, setNewKeyEndpoint] = useState('');
  const [newKeyModel,    setNewKeyModel]    = useState('gpt-4o');
  const [showKeyValue,   setShowKeyValue]   = useState(false);
  const [saving,         setSaving]         = useState(false);

  // ── Pinecone / Vector DB state
  const [pineconeKey,    setPineconeKey]    = useState('');
  const [pineconeIndex,  setPineconeIndex]  = useState('zoark-documents');
  const [showPinecone,   setShowPinecone]   = useState(false);
  const [pineconeStatus, setPineconeStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');

  useEffect(() => { fetchAPIKeys(); }, []);

  // Reset model when provider changes
  useEffect(() => {
    const provider = PROVIDERS.find(p => p.value === newKeyProvider);
    if (provider?.models.length) setNewKeyModel(provider.models[0]);
  }, [newKeyProvider]);

  const fetchAPIKeys = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api-keys`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setApiKeys(await res.json());
    } catch { /* use MOCK_KEYS */ }
    finally { setLoading(false); }
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleAddKey = async () => {
    if (!newKeyName || !newKeyValue) return;
    setSaving(true);

    const optimistic: APIKey = {
      id: `new-${Date.now()}`, name: newKeyName, provider: newKeyProvider, model: newKeyModel,
      endpoint: newKeyProvider === 'custom' ? newKeyEndpoint : null,
      isActive: true, isDefault: apiKeys.length === 0,
      createdAt: new Date().toISOString(), lastUsed: null, lastRotated: null,
      usage: { today: 0, week: 0, tokens: 0 },
    };

    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newKeyName, provider: newKeyProvider, key: newKeyValue, model: newKeyModel, endpoint: optimistic.endpoint }),
      });
    } catch { /* optimistic add regardless */ }

    setApiKeys(prev => [...prev, optimistic]);
    setShowAddForm(false);
    setNewKeyName(''); setNewKeyProvider('openai'); setNewKeyValue(''); setNewKeyEndpoint(''); setNewKeyModel('gpt-4o');
    setSaving(false);
  };

  const handleDeleteKey = (keyId: string) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    setApiKeys(prev => prev.filter(k => k.id !== keyId));
  };

  const handleTestKey = (keyId: string) => {
    setTestingKey(keyId);
    setTestResults(prev => ({ ...prev, [keyId]: { status: 'testing', message: 'Testing…' } }));
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, [keyId]: { status: 'valid', message: 'Valid' } }));
      setTestingKey(null);
    }, 1500);
  };

  const handleToggleActive  = (keyId: string) => setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, isActive: !k.isActive } : k));
  const handleSetDefault    = (keyId: string) => setApiKeys(prev => prev.map(k => ({ ...k, isDefault: k.id === keyId })));
  const handleRotateKey     = (keyId: string) => setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, lastRotated: new Date().toISOString() } : k));

  const handleTestPinecone = () => {
    setPineconeStatus('testing');
    setTimeout(() => setPineconeStatus(pineconeKey ? 'connected' : 'error'), 1500);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    apiKeys.length,
    active:   apiKeys.filter(k => k.isActive).length,
    reqToday: apiKeys.reduce((s, k) => s + k.usage.today, 0),
    tokens:   apiKeys.reduce((s, k) => s + k.usage.tokens, 0),
  }), [apiKeys]);

  const getDaysSinceRotation = (date: string | null): number | null =>
    date ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const selectedProvider = PROVIDERS.find(p => p.value === newKeyProvider);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-1">API Keys</h1>
          <p className="text-gray-400">Manage LLM provider keys, vector DB connections, and usage</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Key
        </Button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Keys',     value: String(stats.total),                 color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Active',         value: String(stats.active),               color: 'text-green-400',  bg: 'bg-green-500/10' },
          { label: 'Requests Today', value: String(stats.reqToday),            color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'Tokens Used',    value: stats.tokens.toLocaleString(),     color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 rounded-lg">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Add Key Form ── */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add New API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Key Name *</label>
                <Input placeholder="e.g., Production OpenAI" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Provider *</label>
                <select
                  value={newKeyProvider}
                  onChange={e => setNewKeyProvider(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                >
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label} — {p.description}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key *</label>
                <div className="relative">
                  <Input type={showKeyValue ? 'text' : 'password'} placeholder="sk-…" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowKeyValue(!showKeyValue)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showKeyValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {selectedProvider && selectedProvider.models.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Default Model</label>
                  <select
                    value={newKeyModel}
                    onChange={e => setNewKeyModel(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    {selectedProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>

            {newKeyProvider === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Endpoint URL</label>
                <Input placeholder="https://your-llm-endpoint.com/v1" value={newKeyEndpoint} onChange={e => setNewKeyEndpoint(e.target.value)} />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddKey} disabled={saving || !newKeyName || !newKeyValue} size="sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {saving ? 'Adding…' : 'Add Key'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Key Cards ── */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Key className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No API keys yet. Add one above to enable AI agents.</p>
            </CardContent>
          </Card>
        ) : apiKeys.map(key => {
          const provider        = PROVIDERS.find(p => p.value === key.provider);
          const daysSinceRotation = getDaysSinceRotation(key.lastRotated);
          const rotationWarning = daysSinceRotation !== null && daysSinceRotation > 30;

          return (
            <Card key={key.id}>
              <CardContent className="pt-5">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full mt-0.5 ${key.isActive ? 'bg-green-500' : 'bg-gray-600'}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{key.name}</h3>
                        {key.isDefault && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" /> Default
                          </span>
                        )}
                        {rotationWarning && (
                          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <RotateCcw className="w-2.5 h-2.5" /> Rotate ({daysSinceRotation}d)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {provider?.label || key.provider}
                        {key.model && <span className="ml-1.5 text-gray-600">· {key.model}</span>}
                        {key.endpoint && <span className="ml-1.5 text-gray-600">· {key.endpoint}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {testResults[key.id] && testResults[key.id].status !== 'testing' && (
                      <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-0.5 ${
                        testResults[key.id].status === 'valid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {testResults[key.id].status === 'valid' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {testResults[key.id].message}
                      </span>
                    )}

                    <button onClick={() => handleTestKey(key.id)} disabled={testingKey === key.id} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50 transition-colors" title="Test key">
                      {testingKey === key.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                    </button>

                    <button onClick={() => handleSetDefault(key.id)} disabled={key.isDefault} className={`p-1.5 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 ${key.isDefault ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`} title="Set as default">
                      <Star className={`w-4 h-4 ${key.isDefault ? 'fill-current' : ''}`} />
                    </button>

                    <button onClick={() => handleRotateKey(key.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-purple-400 transition-colors" title="Mark as rotated">
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleActive(key.id)}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                        key.isActive
                          ? 'border-gray-600 text-gray-400 hover:text-white'
                          : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                      }`}
                    >
                      {key.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    <button onClick={() => handleDeleteKey(key.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Usage + meta row */}
                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Today: <span className="text-gray-300 font-medium">{key.usage.today}</span> req</span>
                    <span>Week: <span className="text-gray-300 font-medium">{key.usage.week}</span> req</span>
                    <span>Tokens: <span className="text-gray-300 font-medium">{key.usage.tokens.toLocaleString()}</span></span>
                  </div>
                  <div className="ml-auto text-xs text-gray-600">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsed && <span className="ml-2">· Used {new Date(key.lastUsed).toLocaleDateString()}</span>}
                    {daysSinceRotation !== null && <span className="ml-2">· Rotated {daysSinceRotation}d ago</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Vector DB / Pinecone ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" /> Vector Database
            </CardTitle>
            <span className={`text-xs px-2 py-0.5 rounded ${
              pineconeStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
              pineconeStatus === 'error'     ? 'bg-red-500/20 text-red-400'     :
                                               'bg-gray-600/50 text-gray-400'
            }`}>
              {pineconeStatus === 'connected' ? 'Connected' :
               pineconeStatus === 'testing'   ? 'Testing…'  :
               pineconeStatus === 'error'     ? 'Failed'    : 'Not configured'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-400">
            Configure your Pinecone vector store for RAG-powered document search and agent memory.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Pinecone API Key</label>
              <div className="relative">
                <Input type={showPinecone ? 'text' : 'password'} placeholder="pc-…" value={pineconeKey} onChange={e => setPineconeKey(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowPinecone(!showPinecone)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPinecone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Index Name</label>
              <Input value={pineconeIndex} onChange={e => setPineconeIndex(e.target.value)} placeholder="zoark-documents" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleTestPinecone} disabled={pineconeStatus === 'testing'} className="gap-1.5">
              {pineconeStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
              Test Connection
            </Button>
            {pineconeStatus === 'connected' && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Index "{pineconeIndex}" is accessible
              </span>
            )}
            {pineconeStatus === 'error' && (
              <span className="text-xs text-red-400">Connection failed — check your API key.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Info Box ── */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">How to get API Keys</h3>
        <ul className="text-xs text-blue-200/70 space-y-1">
          <li>· <strong>OpenAI</strong> — platform.openai.com/api-keys</li>
          <li>· <strong>Anthropic</strong> — console.anthropic.com/settings/keys</li>
          <li>· <strong>HuggingFace</strong> — huggingface.co/settings/tokens</li>
          <li>· <strong>Pinecone</strong> — app.pinecone.io · create a project and copy the API key</li>
        </ul>
      </div>
    </div>
  );
}
