'use client';

import { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PipelineSelectorProps {
  pipelines: any[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string, description: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function PipelineSelector({
  pipelines,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
}: PipelineSelectorProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName, newDesc);
      setNewName('');
      setNewDesc('');
      setShowNewForm(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Approval Pipelines</span>
          <Button
            size="sm"
            onClick={() => setShowNewForm(!showNewForm)}
            className="gap-1"
          >
            <Plus className="w-4 h-4" /> New Pipeline
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* New Pipeline Form */}
        {showNewForm && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
            <Input
              placeholder="Pipeline name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-white/5 border-white/10 text-sm"
            />
            <Input
              placeholder="Description (optional)..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="bg-white/5 border-white/10 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Pipeline List */}
        <div className="space-y-2">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedId === pipeline.id
                  ? 'bg-purple-500/20 border-purple-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => onSelect(pipeline.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{pipeline.name}</h4>
                  {pipeline.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {pipeline.description}
                    </p>
                  )}
                  {pipeline.stages && (
                    <p className="text-xs text-gray-500 mt-1">
                      {pipeline.stages.length} stages
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(pipeline.id);
                    }}
                    className="p-1.5 hover:bg-blue-500/20 rounded transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4 text-blue-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(pipeline.id);
                    }}
                    className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pipelines.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No pipelines yet</p>
            <p className="text-xs mt-1">Create one to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
