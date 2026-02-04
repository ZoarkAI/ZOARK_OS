'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Play, Edit2 } from 'lucide-react';

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

export default function WorkflowList({
  workflows,
  loading,
  onDelete,
  onSelect,
}: WorkflowListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500">Loading workflows...</p>
        </CardContent>
      </Card>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500">No workflows created yet. Create your first workflow to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {workflows.map((workflow: Workflow) => (
        <Card key={workflow.id} className="hover:shadow-lg transition">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle>{workflow.name}</CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onSelect(workflow)}>
                  <Edit2 size={16} />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(workflow.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{workflow.steps.length} steps</p>
                <p className="text-sm text-gray-500">Created {new Date(workflow.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
