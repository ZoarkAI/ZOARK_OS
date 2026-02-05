'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface APIKey {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
}

export default function AgentSettings() {
  const [apiKeys, setApiKeys]               = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName]         = useState('');
  const [newKeyValue, setNewKeyValue]       = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [loading, setLoading]               = useState(false);
  const [showKey, setShowKey]               = useState(false);
  const [error, setError]                   = useState('');

  useEffect(() => { fetchApiKeys(); }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`${API_URL}/api-keys`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) setApiKeys(await res.json());
    } catch { /* no keys */ }
  };

  const handleAddKey = async () => {
    if (!newKeyName || !newKeyValue) {
      setError('Please fill in both the name and key value.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ name: newKeyName, provider: selectedProvider, key: newKeyValue }),
      });
      if (res.ok) {
        setApiKeys(prev => [...prev, { id: `new-${Date.now()}`, name: newKeyName, provider: selectedProvider, isActive: true, createdAt: new Date().toISOString() }]);
        setNewKeyName(''); setNewKeyValue('');
        return;
      }
    } catch {
      // Optimistic add
      setApiKeys(prev => [...prev, { id: `new-${Date.now()}`, name: newKeyName, provider: selectedProvider, isActive: true, createdAt: new Date().toISOString() }]);
      setNewKeyName(''); setNewKeyValue('');
    } finally { setLoading(false); }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Delete this API key?')) return;
    setApiKeys(prev => prev.filter(k => k.id !== keyId));
    try {
      await fetch(`${API_URL}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
    } catch { /* already removed */ }
  };

  const selectCls = 'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500';

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Add Key Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Key Name</label>
              <Input placeholder="e.g., My OpenAI Key" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Provider</label>
              <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className={selectCls}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="huggingface">HuggingFace</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-…"
                  value={newKeyValue}
                  onChange={e => setNewKeyValue(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 pr-10"
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={handleAddKey} disabled={loading} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {loading ? 'Adding…' : 'Add Key'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your API Keys</CardTitle>
            <Link href="/settings/api-keys">
              <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Manage all keys →</button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-gray-500">No API keys added yet. Add one above or visit <Link href="/settings/api-keys" className="text-purple-400 hover:text-purple-300">Settings → API Keys</Link>.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map(key => (
                <div key={key.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-gray-500">
                      {key.provider.toUpperCase()} · Added {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteKey(key.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
