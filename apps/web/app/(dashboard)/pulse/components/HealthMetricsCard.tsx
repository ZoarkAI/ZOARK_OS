'use client';

import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HealthMetricsCardProps {
  tasks: any[];
}

export function HealthMetricsCard({ tasks }: HealthMetricsCardProps) {
  const healthyCount = tasks.filter(t => t.healthStatus === 'HEALTHY').length;
  const atRiskCount = tasks.filter(t => t.healthStatus === 'AT_RISK').length;
  const criticalCount = tasks.filter(t => t.healthStatus === 'CRITICAL').length;
  const totalTasks = tasks.length;

  const healthScore = totalTasks > 0 
    ? ((healthyCount / totalTasks) * 100).toFixed(0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Health Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">{healthScore}%</div>
          <p className="text-sm text-gray-400 mt-1">Overall Health Score</p>
          <div className="w-full h-2 bg-white/10 rounded-full mt-2">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Health Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-green-400">{healthyCount}</div>
            <p className="text-xs text-gray-400 mt-1">Healthy</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-yellow-400">{atRiskCount}</div>
            <p className="text-xs text-gray-400 mt-1">At Risk</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-red-400">{criticalCount}</div>
            <p className="text-xs text-gray-400 mt-1">Critical</p>
          </div>
        </div>

        {/* Critical Tasks Alert */}
        {criticalCount > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-300">
              <p className="font-medium">{criticalCount} task{criticalCount !== 1 ? 's' : ''} need immediate attention</p>
              <p className="text-xs mt-1">Review and escalate critical tasks</p>
            </div>
          </div>
        )}

        {/* Trend */}
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-gray-400">
            {healthyCount > 0 ? 'Improving' : 'Needs attention'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
