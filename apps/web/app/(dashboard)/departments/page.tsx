'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, DollarSign, Briefcase, BarChart3, MessageSquare, Headphones,
  Bot, Play, Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Zap,
} from 'lucide-react';
import Link from 'next/link';

// ── Types & config ─────────────────────────────────────────────────────────────
interface DepartmentMetrics {
  activeAgents: number;
  tasksAutomated: number;
  timeSaved: number;
  successRate: number;
}

const DEPARTMENT_CONFIGS: Record<string, {
  agents: { name: string; description: string; role: string }[];
  quickActions: { label: string; action: string }[];
  metrics: DepartmentMetrics;
}> = {
  sales: {
    agents: [
      { name: 'Lead Qualifier',    description: 'Automatically scores and qualifies incoming leads',       role: 'Lead qualification agent' },
      { name: 'Follow-up Bot',     description: 'Sends personalized follow-up emails to prospects',        role: 'Sales follow-up agent' },
      { name: 'CRM Sync Agent',    description: 'Keeps CRM data synchronized across platforms',            role: 'Data synchronization agent' },
      { name: 'Meeting Scheduler', description: 'Schedules demo calls based on availability',              role: 'Calendar management agent' },
    ],
    quickActions: [
      { label: 'Qualify New Leads', action: 'qualify_leads' },
      { label: 'Send Follow-ups',   action: 'send_followups' },
      { label: 'Update CRM',        action: 'sync_crm' },
      { label: 'Schedule Demos',    action: 'schedule_demos' },
    ],
    metrics: { activeAgents: 3, tasksAutomated: 1247, timeSaved: 156, successRate: 94 },
  },
  hr: {
    agents: [
      { name: 'Resume Screener',      description: 'Analyzes resumes and ranks candidates',            role: 'Resume analysis agent' },
      { name: 'Interview Scheduler',  description: 'Coordinates interview times with candidates',     role: 'Scheduling agent' },
      { name: 'Onboarding Assistant', description: 'Guides new hires through onboarding',             role: 'Onboarding agent' },
      { name: 'Timesheet Reminder',   description: 'Sends timesheet submission reminders',            role: 'Reminder agent' },
    ],
    quickActions: [
      { label: 'Screen Resumes',     action: 'screen_resumes' },
      { label: 'Schedule Interviews', action: 'schedule_interviews' },
      { label: 'Start Onboarding',   action: 'start_onboarding' },
      { label: 'Send Reminders',     action: 'send_reminders' },
    ],
    metrics: { activeAgents: 2, tasksAutomated: 856, timeSaved: 98, successRate: 91 },
  },
  finance: {
    agents: [
      { name: 'Invoice Processor',   description: 'Extracts data from invoices and routes for approval', role: 'Invoice processing agent' },
      { name: 'Expense Categorizer', description: 'Automatically categorizes expenses',                  role: 'Expense management agent' },
      { name: 'Payment Reminder',    description: 'Sends payment due reminders',                         role: 'Payment reminder agent' },
      { name: 'Report Generator',    description: 'Creates financial reports and summaries',             role: 'Financial reporting agent' },
    ],
    quickActions: [
      { label: 'Process Invoices',        action: 'process_invoices' },
      { label: 'Categorize Expenses',     action: 'categorize_expenses' },
      { label: 'Send Payment Reminders',  action: 'payment_reminders' },
      { label: 'Generate Reports',        action: 'generate_reports' },
    ],
    metrics: { activeAgents: 4, tasksAutomated: 2341, timeSaved: 234, successRate: 97 },
  },
  operations: {
    agents: [
      { name: 'Task Router',          description: 'Routes tasks to appropriate team members',          role: 'Task routing agent' },
      { name: 'Workflow Optimizer',   description: 'Identifies bottlenecks and suggests improvements',  role: 'Process optimization agent' },
      { name: 'Inventory Monitor',    description: 'Tracks inventory levels and alerts on low stock',   role: 'Inventory management agent' },
      { name: 'Quality Checker',      description: 'Performs automated quality checks',                 role: 'Quality assurance agent' },
    ],
    quickActions: [
      { label: 'Route Tasks',       action: 'route_tasks' },
      { label: 'Analyze Workflows', action: 'analyze_workflows' },
      { label: 'Check Inventory',   action: 'check_inventory' },
      { label: 'Run QA Checks',     action: 'run_qa' },
    ],
    metrics: { activeAgents: 3, tasksAutomated: 1892, timeSaved: 178, successRate: 95 },
  },
  marketing: {
    agents: [
      { name: 'Content Generator',  description: 'Creates blog posts and social media content',         role: 'Content creation agent' },
      { name: 'Campaign Manager',   description: 'Manages and optimizes marketing campaigns',           role: 'Campaign management agent' },
      { name: 'Social Media Bot',   description: 'Schedules and posts to social platforms',             role: 'Social media agent' },
      { name: 'Analytics Reporter', description: 'Generates marketing analytics reports',               role: 'Marketing analytics agent' },
    ],
    quickActions: [
      { label: 'Generate Content',   action: 'generate_content' },
      { label: 'Optimize Campaigns', action: 'optimize_campaigns' },
      { label: 'Schedule Posts',     action: 'schedule_posts' },
      { label: 'Create Reports',     action: 'create_reports' },
    ],
    metrics: { activeAgents: 2, tasksAutomated: 967, timeSaved: 89, successRate: 88 },
  },
  support: {
    agents: [
      { name: 'Ticket Classifier',    description: 'Categorizes and prioritizes support tickets',       role: 'Ticket classification agent' },
      { name: 'Response Generator',   description: 'Drafts responses to common queries',                role: 'Response generation agent' },
      { name: 'Escalation Manager',   description: 'Identifies and escalates critical issues',         role: 'Escalation management agent' },
      { name: 'Satisfaction Surveyor', description: 'Sends and analyzes customer surveys',              role: 'Customer feedback agent' },
    ],
    quickActions: [
      { label: 'Classify Tickets',    action: 'classify_tickets' },
      { label: 'Generate Responses',  action: 'generate_responses' },
      { label: 'Check Escalations',   action: 'check_escalations' },
      { label: 'Send Surveys',        action: 'send_surveys' },
    ],
    metrics: { activeAgents: 3, tasksAutomated: 3456, timeSaved: 312, successRate: 92 },
  },
};

const departments = [
  { id: 'sales',      name: 'Sales',      icon: Briefcase,    description: 'Lead qualification, follow-ups, CRM sync', color: 'from-blue-500 to-blue-600' },
  { id: 'hr',         name: 'HR',         icon: Users,        description: 'Resume screening, interviews, onboarding', color: 'from-green-500 to-green-600' },
  { id: 'finance',    name: 'Finance',    icon: DollarSign,   description: 'Invoice processing, expense tracking',     color: 'from-yellow-500 to-yellow-600' },
  { id: 'operations', name: 'Operations', icon: BarChart3,    description: 'Task automation, workflow optimization',   color: 'from-purple-500 to-purple-600' },
  { id: 'marketing',  name: 'Marketing',  icon: MessageSquare, description: 'Content generation, campaigns',          color: 'from-pink-500 to-pink-600' },
  { id: 'support',    name: 'Support',    icon: Headphones,   description: 'Ticket classification, responses',        color: 'from-orange-500 to-orange-600' },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading]     = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const activeDept = departments.find(d => d.id === activeTab)!;
  const config     = DEPARTMENT_CONFIGS[activeTab];

  const handleQuickAction = async (action: string) => {
    setLoading(true);
    setActionMsg('');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setActionMsg(`Action "${action}" executed successfully.`);
    setLoading(false);
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-1">Department Dashboards</h1>
        <p className="text-gray-400">Specialized automation tools for each department</p>
      </div>

      {/* Department Nav */}
      <div className="grid grid-cols-6 gap-3">
        {departments.map(dept => {
          const Icon    = dept.icon;
          const isActive = activeTab === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setActiveTab(dept.id)}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? `border-transparent bg-gradient-to-r ${dept.color} text-white shadow-lg`
                  : 'border-gray-700 glass-card hover:border-gray-500'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <p className={`text-sm font-semibold text-center ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {dept.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Action success message */}
      {actionMsg && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-300 text-sm px-4 py-2 rounded-lg">
          {actionMsg}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Agents',   value: config.metrics.activeAgents,                        Icon: Bot,         color: 'text-blue-400',   bg: 'bg-blue-500/20' },
          { label: 'Tasks Automated', value: config.metrics.tasksAutomated.toLocaleString(),    Icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-500/20' },
          { label: 'Time Saved (hrs)', value: String(config.metrics.timeSaved),                  Icon: Clock,       color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { label: 'Success Rate',    value: `${config.metrics.successRate}%`,                  Icon: TrendingUp,  color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="glass-card p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> Quick Actions
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">Common automation tasks for {activeDept.name}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {config.quickActions.map(action => (
              <button
                key={action.action}
                onClick={() => handleQuickAction(action.action)}
                disabled={loading}
                className="glass-card glass-card-hover p-4 rounded-lg flex flex-col items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Play className={`w-5 h-5 ${loading ? 'text-gray-600' : 'text-purple-400'}`} />
                <span className="text-sm text-gray-300">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Agents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" /> {activeDept.name} Agents
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">Pre-configured agents for {activeDept.name.toLowerCase()} automation</p>
            </div>
            <Link href="/agents">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Create Custom
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {config.agents.map(agent => (
              <div key={agent.name} className="glass-card p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
                    <span className="inline-block mt-2 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">
                      {agent.role}
                    </span>
                  </div>
                  <Link href={`/agents?name=${encodeURIComponent(agent.name)}&role=${encodeURIComponent(agent.role)}`}>
                    <button className="text-xs bg-purple-600/60 hover:bg-purple-600 text-white rounded px-2.5 py-1 transition-colors whitespace-nowrap">
                      Use
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-purple-300">Getting Started with {activeDept.name} Automation</h3>
            <p className="text-xs text-purple-200/70 mt-1">
              1. Add your API keys in Settings → API Keys<br />
              2. Create or use pre-configured agents above<br />
              3. Run quick actions or build custom workflows
            </p>
          </div>
          <Link href="/settings/api-keys">
            <Button size="sm">Setup API Keys</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
