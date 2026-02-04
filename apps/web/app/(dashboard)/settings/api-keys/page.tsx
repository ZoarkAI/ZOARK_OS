'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Eye, EyeOff, Check, X, Loader2, Key, TestTube } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  provider: string;
  endpoint: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsed: string | null;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', description: 'GPT-4, GPT-3.5' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 3' },
  { value: 'huggingface', label: 'HuggingFace', description: 'Open models' },
  { value: 'custom', label: 'Custom LLM', description: 'Your own endpoint' },
];

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; message: string }>>({});

  // New key form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyEndpoint, setNewKeyEndpoint] = useState('');
  const [showKeyValue, setShowKeyValue] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api-keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyName || !newKeyValue) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newKeyName,
          provider: newKeyProvider,
          key: newKeyValue,
          endpoint: newKeyProvider === 'custom' ? newKeyEndpoint : null,
        })
      });

      if (response.ok) {
        fetchAPIKeys();
        setShowAddForm(false);
        setNewKeyName('');
        setNewKeyProvider('openai');
        setNewKeyValue('');
        setNewKeyEndpoint('');
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to add API key');
      }
    } catch (error) {
      console.error('Error adding API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchAPIKeys();
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKey(keyId);
    setTestResults(prev => ({ ...prev, [keyId]: { status: 'testing', message: 'Testing...' } }));

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api-keys/${keyId}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      setTestResults(prev => ({ ...prev, [keyId]: data }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [keyId]: { status: 'error', message: 'Test failed' } }));
    } finally {
      setTestingKey(null);
    }
  };

  const handleToggleActive = async (keyId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = isActive ? 'deactivate' : 'activate';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api-keys/${keyId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchAPIKeys();
      }
    } catch (error) {
      console.error('Error toggling API key:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-gray-500 mt-2">Manage your LLM provider API keys for AI agents</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add API Key
        </Button>
      </div>

      {/* Add Key Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New API Key</CardTitle>
            <CardDescription>Add an API key from your LLM provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Key Name *</label>
                <Input
                  placeholder="e.g., Production OpenAI"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Provider *</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label} - {p.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API Key *</label>
              <div className="relative">
                <Input
                  type={showKeyValue ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyValue(!showKeyValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeyValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {newKeyProvider === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Custom Endpoint URL</label>
                <Input
                  placeholder="https://your-llm-endpoint.com/v1"
                  value={newKeyEndpoint}
                  onChange={(e) => setNewKeyEndpoint(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddKey} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {saving ? 'Adding...' : 'Add Key'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No API Keys</h3>
              <p className="text-gray-500 mt-2">Add an API key to start using AI agents</p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <h3 className="font-semibold">{key.name}</h3>
                      <p className="text-sm text-gray-500">
                        {PROVIDERS.find(p => p.value === key.provider)?.label || key.provider}
                        {key.endpoint && ` • ${key.endpoint}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {testResults[key.id] && (
                      <span className={`text-sm px-2 py-1 rounded ${
                        testResults[key.id].status === 'valid' 
                          ? 'bg-green-100 text-green-700'
                          : testResults[key.id].status === 'testing'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {testResults[key.id].status === 'valid' && <Check className="w-3 h-3 inline mr-1" />}
                        {testResults[key.id].status === 'invalid' && <X className="w-3 h-3 inline mr-1" />}
                        {testResults[key.id].message}
                      </span>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(key.id)}
                      disabled={testingKey === key.id}
                    >
                      {testingKey === key.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(key.id, key.isActive)}
                    >
                      {key.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                  {key.lastUsed && (
                    <span className="ml-4">Last used: {new Date(key.lastUsed).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-800 mb-2">How to get API Keys</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank" className="underline">platform.openai.com/api-keys</a></li>
            <li>• <strong>Anthropic:</strong> Visit <a href="https://console.anthropic.com/settings/keys" target="_blank" className="underline">console.anthropic.com/settings/keys</a></li>
            <li>• <strong>HuggingFace:</strong> Visit <a href="https://huggingface.co/settings/tokens" target="_blank" className="underline">huggingface.co/settings/tokens</a></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
