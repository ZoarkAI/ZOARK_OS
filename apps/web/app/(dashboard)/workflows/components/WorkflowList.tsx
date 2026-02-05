'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit2 } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: any[];
  isActive: boolean;
  createdAt: string;
}

interface WorkflowListProps {
  workflows: Workflow[];
  loading: boolean;
  onDelete: (id: string) => void;
  onSelect: (workflow: Workflow) => void;
}

const STEP_TYPE_COLORS: Record<string, string> = {
  agent:     'bg-purple-500/30',
  task:      'bg-blue-500/30',
  condition: 'bg-yellow-500/30',
  delay:     'bg-gray-600/40',
};

export default function WorkflowList({ workflows, loading, onDelete, onSelect }: WorkflowListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500">Loading workflows…</p>
        </CardContent>
      </Card>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <p className="text-gray-500">No workflows yet. Use the Builder tab to create your first workflow.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {workflows.map(wf => (
        <Card key={wf.id}>
          <CardContent className="pt-5">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full mt-0.5 ${wf.isActive ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{wf.name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      wf.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-600/50 text-gray-400'
                    }`}>
                      {wf.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{wf.description}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => onSelect(wf)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-purple-400 transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(wf.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Steps preview + meta */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-1.5">
                {wf.steps.map((step: any, i: number) => (
                  <React.Fragment key={step.id || i}>
                    <span className={`text-xs px-2 py-0.5 rounded ${STEP_TYPE_COLORS[step.type] || 'bg-gray-600/40'} text-gray-300`}>
                      {step.name}
                    </span>
                    {i < wf.steps.length - 1 && <span className="text-gray-600">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <p className="text-xs text-gray-600">Created {new Date(wf.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
