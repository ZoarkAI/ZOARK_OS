'use client';

import { X, Users, Clock, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TaskDetailModalProps {
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
    processStage: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'COMPLETED';
    peopleCount?: number;
    contactPerson?: string;
    createdAt: string;
    lastUpdated: string;
    assignees?: Array<{ name: string; initials: string }>;
    tags?: string[];
  };
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const healthColors: Record<'HEALTHY' | 'AT_RISK' | 'CRITICAL', string> = {
    HEALTHY: 'bg-green-500/20 text-green-400',
    AT_RISK: 'bg-yellow-500/20 text-yellow-400',
    CRITICAL: 'bg-red-500/20 text-red-400',
  };

  const processStageColors: Record<'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'COMPLETED', string> = {
    PLANNING: 'bg-blue-500/20 text-blue-400',
    IN_PROGRESS: 'bg-purple-500/20 text-purple-400',
    REVIEW: 'bg-orange-500/20 text-orange-400',
    BLOCKED: 'bg-red-500/20 text-red-400',
    COMPLETED: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl">{task.title}</CardTitle>
            <p className="text-sm text-gray-400 mt-1">{task.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status & Health */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2">Status</label>
              <span className={`text-sm px-3 py-1 rounded inline-block ${
                task.status === 'DONE' ? 'bg-green-500/20 text-green-400' :
                task.status === 'ACTIVE' ? 'bg-blue-500/20 text-blue-400' :
                task.status === 'BACKLOG' ? 'bg-gray-500/20 text-gray-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {task.status}
              </span>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">Health Status</label>
              <span className={`text-sm px-3 py-1 rounded inline-block ${
                healthColors[task.healthStatus] || healthColors.HEALTHY
              }`}>
                {task.healthStatus}
              </span>
            </div>
          </div>

          {/* Process Stage */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Process Stage</label>
            <span className={`text-sm px-3 py-1 rounded inline-block ${
              processStageColors[task.processStage] || processStageColors.PLANNING
            }`}>
              {task.processStage}
            </span>
          </div>

          {/* Team Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> People Count
              </label>
              <p className="text-lg font-semibold">{task.peopleCount || 0}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">Contact Person</label>
              <p className="text-sm">{task.contactPerson || 'Not assigned'}</p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="text-xs text-gray-400 block mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Timeline
            </label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created:</span>
                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated:</span>
                <span>{new Date(task.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 block mb-2">Assigned To</label>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee: any) => (
                  <div
                    key={assignee.name}
                    className="bg-white/10 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs">
                      {assignee.initials}
                    </div>
                    <span>{assignee.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 block mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Health Alert */}
          {task.healthStatus === 'CRITICAL' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-300">
                This task is marked as critical. Immediate attention required.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button className="flex-1">
              Edit Task
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
