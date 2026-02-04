'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

interface AgentLog {
  id: string;
  action: string;
  context: Record<string, any>;
  timestamp: string;
  status: string;
}

export function AgentFeed() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource('/api/agent-feed');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('Agent feed connected');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip connection messages
        if (data.type === 'connection') {
          console.log(data.message);
          return;
        }

        // Add new log to the beginning
        setLogs((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setConnected(false);
      eventSource.close();
    };

    // Load initial logs from API
    fetchInitialLogs();

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  async function fetchInitialLogs() {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/intelligence/agent-logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Agent Activity Feed</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {logs.map((log) => (
            <AgentLogItem key={log.id} log={log} />
          ))}
          {logs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Waiting for agent activity...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AgentLogItem({ log }: { log: AgentLog }) {
  const actionColors: Record<string, string> = {
    TASK_STUCK_ALERT: 'text-red-400',
    TIMESHEET_REMINDER: 'text-yellow-400',
    APPROVAL_NUDGE: 'text-orange-400',
    EMAIL_PARSED: 'text-blue-400',
    INVOICE_PROCESSED: 'text-green-400',
  };

  const actionIcons: Record<string, React.ReactNode> = {
    TASK_STUCK_ALERT: <XCircle className="w-4 h-4" />,
    TIMESHEET_REMINDER: <Clock className="w-4 h-4" />,
    APPROVAL_NUDGE: <Activity className="w-4 h-4" />,
    EMAIL_PARSED: <CheckCircle className="w-4 h-4" />,
    INVOICE_PROCESSED: <CheckCircle className="w-4 h-4" />,
  };

  const color = actionColors[log.action] || 'text-blue-400';
  const icon = actionIcons[log.action] || <Activity className="w-4 h-4" />;

  return (
    <div className="glass-card p-3 rounded text-sm">
      <div className="flex items-start gap-2">
        <div className={color}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`font-medium ${color}`}>
              {log.action.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                log.status === 'SUCCESS'
                  ? 'bg-green-500/20 text-green-400'
                  : log.status === 'FAILED'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {log.status}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {getTimeAgo(log.timestamp)}
          </p>
          {Object.keys(log.context).length > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              {Object.entries(log.context)
                .slice(0, 2)
                .map(([key, value]) => (
                  <span key={key} className="mr-2">
                    {key}: {JSON.stringify(value)}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}
