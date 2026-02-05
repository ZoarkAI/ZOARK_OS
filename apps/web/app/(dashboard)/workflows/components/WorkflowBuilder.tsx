'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Save, ArrowDown, Trash2 } from 'lucide-react';

interface WorkflowStep {
  id: string;
  type: 'agent' | 'task' | 'condition' | 'delay';
  name: string;
  config: any;
}

interface WorkflowBuilderProps {
  onSave: (config: any) => void;
  initialWorkflow?: any;
}

const STEP_COLORS: Record<string, string> = {
  agent:     'bg-purple-500/20 text-purple-400 border-purple-500/30',
  task:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  condition: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  delay:     'bg-gray-600/50 text-gray-400 border-gray-600',
};

export default function WorkflowBuilder({ onSave, initialWorkflow }: WorkflowBuilderProps) {
  const [name, setName]               = useState(initialWorkflow?.name || '');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
  const [steps, setSteps]             = useState<WorkflowStep[]>(initialWorkflow?.steps || []);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const addStep = (type: 'agent' | 'task' | 'condition' | 'delay') => {
    setSteps(prev => [...prev, {
      id:   `step-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${prev.length + 1}`,
      config: {},
    }]);
  };

  const removeStep = (stepId: string) => setSteps(prev => prev.filter(s => s.id !== stepId));

  const handleSave = async () => {
    if (!name || steps.length === 0) {
      setError('Provide a workflow name and at least one step.');
      return;
    }
    setError('');
    setLoading(true);
    try { await onSave({ name, description, steps }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Workflow Name *</label>
            <Input placeholder="e.g., Lead Qualification Pipeline" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              placeholder="What does this workflow do?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No steps added yet. Use the buttons below to build your workflow.</p>
          ) : (
            <div className="space-y-1">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${STEP_COLORS[step.type]}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold opacity-60">{index + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{step.name}</p>
                        <p className="text-xs opacity-60 capitalize">{step.type}</p>
                      </div>
                    </div>
                    <button onClick={() => removeStep(step.id)} className="p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Add Step Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-700">
            {(['agent', 'task', 'condition', 'delay'] as const).map(type => (
              <button
                key={type}
                onClick={() => addStep(type)}
                className="glass-card glass-card-hover p-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs text-gray-300 capitalize transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> {type}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={loading} className="gap-2 w-full">
        <Save className="w-4 h-4" />
        {loading ? 'Saving…' : 'Save Workflow'}
      </Button>
    </div>
  );
}
