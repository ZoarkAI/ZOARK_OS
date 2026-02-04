'use client';

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle, Clock, XCircle, Mail, Loader2 } from 'lucide-react';

interface ApprovalStep {
  id: string;
  invoiceId: string;
  stage: string;
  assigneeEmail: string;
  status: string;
  deadline: string;
  requiredDocs: string[];
  lastNudgedAt?: string;
}

export function ApprovalNode({ data }: { data: ApprovalStep }) {
  const [nudging, setNudging] = useState(false);
  const [lastNudgedAt, setLastNudgedAt] = useState(data.lastNudgedAt);

  const statusColors = {
    PENDING: 'border-yellow-500/50 bg-yellow-500/10',
    APPROVED: 'border-green-500/50 bg-green-500/10',
    REJECTED: 'border-red-500/50 bg-red-500/10',
  };

  const statusIcons = {
    PENDING: <Clock className="w-5 h-5 text-yellow-400" />,
    APPROVED: <CheckCircle className="w-5 h-5 text-green-400" />,
    REJECTED: <XCircle className="w-5 h-5 text-red-400" />,
  };

  const statusColor = statusColors[data.status as keyof typeof statusColors] || statusColors.PENDING;
  const statusIcon = statusIcons[data.status as keyof typeof statusIcons] || statusIcons.PENDING;

  const isOverdue = data.status === 'PENDING' && new Date(data.deadline) < new Date();

  async function handleNudge() {
    if (!data.invoiceId || nudging) return;
    setNudging(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(
        `${API_URL}/invoices/${data.invoiceId}/approval-steps/${data.id}/nudge`,
        { method: 'POST' }
      );
      if (res.ok) {
        const updated = await res.json();
        setLastNudgedAt(updated.lastNudgedAt);
      }
    } catch (e) {
      console.error('Nudge failed:', e);
    } finally {
      setNudging(false);
    }
  }

  return (
    <div className={`glass-card border-2 ${statusColor} rounded-lg min-w-[250px] p-4`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusIcon}
            <h3 className="font-bold text-sm">
              {data.stage.replace(/_/g, ' ')}
            </h3>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded ${
              data.status === 'APPROVED'
                ? 'bg-green-500/20 text-green-400'
                : data.status === 'REJECTED'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {data.status}
          </span>
        </div>

        {/* Assignee */}
        <div>
          <p className="text-xs text-gray-400">Assignee</p>
          <p className="text-sm">{data.assigneeEmail}</p>
        </div>

        {/* Deadline */}
        <div>
          <p className="text-xs text-gray-400">Deadline</p>
          <p className={`text-sm ${isOverdue ? 'text-red-400' : ''}`}>
            {new Date(data.deadline).toLocaleDateString()}
            {isOverdue && ' (Overdue)'}
          </p>
        </div>

        {/* Required Docs */}
        {data.requiredDocs.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Required Documents</p>
            <div className="flex flex-wrap gap-1">
              {data.requiredDocs.map((doc, i) => (
                <span
                  key={doc}
                  className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400"
                >
                  {doc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {data.status === 'PENDING' && (
          <button
            onClick={handleNudge}
            disabled={nudging}
            className="w-full mt-2 px-3 py-1.5 text-xs rounded glass-card-hover flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {nudging ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Mail className="w-3 h-3" />
            )}
            {nudging ? 'Sending...' : 'Send Nudge'}
          </button>
        )}

        {lastNudgedAt && (
          <p className="text-xs text-gray-500">
            Last nudged: {getTimeAgo(lastNudgedAt)}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Recently';
}
