'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import type { Task } from '../page';

interface TaskColumnProps {
  title: string;
  status: string;
  tasks: Task[];
}

export function TaskColumn({ title, status, tasks }: TaskColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });

  const stuckCount = tasks.filter(task => {
    if (task.status !== 'ACTIVE') return false;
    return (Date.now() - new Date(task.lastUpdated).getTime()) > 48 * 3600000;
  }).length;

  return (
    <Card className="min-h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            {stuckCount > 0 && status === 'ACTIVE' && (
              <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
                {stuckCount} stuck
              </span>
            )}
            <span className="text-sm font-normal text-gray-400">{tasks.length}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="space-y-2 min-h-[400px]">
            {tasks.map(task => <TaskCard key={task.id} task={task} />)}
            {tasks.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">No tasks</div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}
