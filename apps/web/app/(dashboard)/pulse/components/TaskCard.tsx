'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, Users } from 'lucide-react';
import type { Task } from '../page';

const PRIORITY_COLORS = {
  low:      'bg-blue-500/20 text-blue-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  high:     'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const AVATAR_GRADIENTS = [
  'from-purple-500 to-blue-500',
  'from-pink-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-teal-500',
];

export function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hoursSince = (Date.now() - new Date(task.lastUpdated).getTime()) / 3600000;
  const isStuck    = task.status === 'ACTIVE' && hoursSince > 48;

  return (
    <div
      ref={setNodeRef} style={style}
      className="glass-card-hover p-3 rounded cursor-move"
      {...attributes} {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Title row + priority */}
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-medium text-sm truncate">{task.title}</h3>
            {task.priority && (
              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map(tag => (
                <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">{tag}</span>
              ))}
            </div>
          )}

          {/* Assignee avatars + contact person */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center">
              {(task.assignees || []).slice(0, 4).map((a, i) => (
                <div
                  key={a.name} title={a.name}
                  className={`w-5 h-5 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white border border-gray-800 ${i > 0 ? '-ml-1.5' : ''}`}
                  style={{ fontSize: '9px' }}
                >
                  {a.initials}
                </div>
              ))}
              {(task.assignees || []).length > 4 && (
                <span className="text-xs text-gray-500 ml-1">+{task.assignees!.length - 4}</span>
              )}
            </div>
            {task.contactPerson && (
              <span className="text-xs text-gray-500 truncate max-w-[80px]">📌 {task.contactPerson}</span>
            )}
          </div>

          {/* Footer: people count · time · stuck badge */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-500">{task.peopleCount || task.assignees?.length || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-500">{formatAgo(task.lastUpdated)}</span>
            </div>
            {isStuck && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 ml-auto">⚠️ Stuck</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}
