'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Save, ArrowRight } from 'lucide-react';

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

export default function WorkflowBuilder({ onSave, initialWorkflow }: WorkflowBuilderProps) {
  const [name, setName] = useState(initialWorkflow?.name || '');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
  const [steps, setSteps] = useState<WorkflowStep[]>(initialWorkflow?.steps || []);
  const [loading, setLoading] = useState(false);

  const addStep = (type: 'agent' | 'task' | 'condition' | 'delay') => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${steps.length + 1}`,
      config: {}
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const updateStep = (stepId: string, updates: any) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    if (!name || steps.length === 0) {
      alert('Please provide a name and at least one step');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name,
        description,
        steps
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
          <CardTitle>Workflow Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Workflow Name *</label>
            <Input
              placeholder="e.g., Lead Qualification Pipeline"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="What does this workflow do?"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Steps</CardTitle>
          <CardDescription>Chain agents and tasks together to create automated workflows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No steps added yet. Add your first step below.</p>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id}>
                  <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{step.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{step.type}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeStep(step.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="text-gray-400" size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Step Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => addStep('agent')}
              className="gap-2"
            >
              <Plus size={16} />
              Add Agent
            </Button>
            <Button
              variant="outline"
              onClick={() => addStep('task')}
              className="gap-2"
            >
              <Plus size={16} />
              Add Task
            </Button>
            <Button
              variant="outline"
              onClick={() => addStep('condition')}
              className="gap-2"
            >
              <Plus size={16} />
              Add Condition
            </Button>
            <Button
              variant="outline"
              onClick={() => addStep('delay')}
              className="gap-2"
            >
              <Plus size={16} />
              Add Delay
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={loading} className="gap-2 w-full">
        <Save size={20} />
        {loading ? 'Saving...' : 'Save Workflow'}
      </Button>
    </div>
  );
}
