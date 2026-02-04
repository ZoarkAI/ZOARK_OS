'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, DollarSign, Briefcase, BarChart3, MessageSquare, Headphones,
  Bot, Play, Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Zap
} from 'lucide-react';
import Link from 'next/link';

interface DepartmentAgent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  tasksCompleted: number;
  lastRun: string;
}

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
      { name: 'Lead Qualifier', description: 'Automatically scores and qualifies incoming leads', role: 'Lead qualification agent' },
      { name: 'Follow-up Bot', description: 'Sends personalized follow-up emails to prospects', role: 'Sales follow-up agent' },
      { name: 'CRM Sync Agent', description: 'Keeps CRM data synchronized across platforms', role: 'Data synchronization agent' },
      { name: 'Meeting Scheduler', description: 'Schedules demo calls based on availability', role: 'Calendar management agent' },
    ],
    quickActions: [
      { label: 'Qualify New Leads', action: 'qualify_leads' },
      { label: 'Send Follow-ups', action: 'send_followups' },
      { label: 'Update CRM', action: 'sync_crm' },
      { label: 'Schedule Demos', action: 'schedule_demos' },
    ],
    metrics: { activeAgents: 3, tasksAutomated: 1247, timeSaved: 156, successRate: 94 },
  },
  hr: {
    agents: [
      { name: 'Resume Screener', description: 'Analyzes resumes and ranks candidates', role: 'Resume analysis agent' },
      { name: 'Interview Scheduler', description: 'Coordinates interview times with candidates', role: 'Scheduling agent' },
      { name: 'Onboarding Assistant', description: 'Guides new hires through onboarding', role: 'Onboarding agent' },
      { name: 'Timesheet Reminder', description: 'Sends timesheet submission reminders', role: 'Reminder agent' },
    ],
    quickActions: [
      { label: 'Screen Resumes', action: 'screen_resumes' },
      { label: 'Schedule Interviews', action: 'schedule_interviews' },
      { label: 'Start Onboarding', action: 'start_onboarding' },
      { label: 'Send Reminders', action: 'send_reminders' },
    ],
    metrics: { activeAgents: 2, tasksAutomated: 856, timeSaved: 98, successRate: 91 },
  },
  finance: {
    agents: [
      { name: 'Invoice Processor', description: 'Extracts data from invoices and routes for approval', role: 'Invoice processing agent' },
      { name: 'Expense Categorizer', description: 'Automatically categorizes expenses', role: 'Expense management agent' },
      { name: 'Payment Reminder', description: 'Sends payment due reminders', role: 'Payment reminder agent' },
      { name: 'Report Generator', description: 'Creates financial reports and summaries', role: 'Financial reporting agent' },
    ],
    quickActions: [
      { label: 'Process Invoices', action: 'process_invoices' },
      { label: 'Categorize Expenses', action: 'categorize_expenses' },
      { label: 'Send Payment Reminders', action: 'payment_reminders' },
      { label: 'Generate Reports', action: 'generate_reports' },
    ],
    metrics: { activeAgents: 4, tasksAutomated: 2341, timeSaved: 234, successRate: 97 },
  },
  operations: {
    agents: [
      { name: 'Task Router', description: 'Routes tasks to appropriate team members', role: 'Task routing agent' },
      { name: 'Workflow Optimizer', description: 'Identifies bottlenecks and suggests improvements', role: 'Process optimization agent' },
      { name: 'Inventory Monitor', description: 'Tracks inventory levels and alerts on low stock', role: 'Inventory management agent' },
      { name: 'Quality Checker', description: 'Performs automated quality checks', role: 'Quality assurance agent' },
    ],
    quickActions: [
      { label: 'Route Tasks', action: 'route_tasks' },
      { label: 'Analyze Workflows', action: 'analyze_workflows' },
      { label: 'Check Inventory', action: 'check_inventory' },
      { label: 'Run QA Checks', action: 'run_qa' },
    ],
    metrics: { activeAgents: 3, tasksAutomated: 1892, timeSaved: 178, successRate: 95 },
  },
  marketing: {
    agents: [
      { name: 'Content Generator', description: 'Creates blog posts and social media content', role: 'Content creation agent' },
      { name: 'Campaign Manager', description: 'Manages and optimizes marketing campaigns', role: 'Campaign management agent' },
      { name: 'Social Media Bot', description: 'Schedules and posts to social platforms', role: 'Social media agent' },
      { name: 'Analytics Reporter', description: 'Generates marketing analytics reports', role: 'Marketing analytics agent' },
    ],
    quickActions: [
      { label: 'Generate Content', action: 'generate_content' },
      { label: 'Optimize Campaigns', action: 'optimize_campaigns' },
      { label: 'Schedule Posts', action: 'schedule_posts' },
      { label: 'Create Reports', action: 'create_reports' },
    ],
    metrics: { activeAgents: 2, tasksAutomated: 967, timeSaved: 89, successRate: 88 },
  },
  support: {
    agents: [
      { name: 'Ticket Classifier', description: 'Categorizes and prioritizes support tickets', role: 'Ticket classification agent' },
      { name: 'Response Generator', description: 'Drafts responses to common queries', role: 'Response generation agent' },
      { name: 'Escalation Manager', description: 'Identifies and escalates critical issues', role: 'Escalation management agent' },
      { name: 'Satisfaction Surveyor', description: 'Sends and analyzes customer surveys', role: 'Customer feedback agent' },
    ],
    quickActions: [
      { label: 'Classify Tickets', action: 'classify_tickets' },
      { label: 'Generate Responses', action: 'generate_responses' },
      { label: 'Check Escalations', action: 'check_escalations' },
      { label: 'Send Surveys', action: 'send_surveys' },
    ],
    metrics: { activeAgents: 3, tasksAutomated: 3456, timeSaved: 312, successRate: 92 },
  },
};

const departments = [
  { id: 'sales', name: 'Sales', icon: Briefcase, description: 'Lead qualification, follow-ups, CRM sync', color: 'from-blue-500 to-blue-600' },
  { id: 'hr', name: 'HR', icon: Users, description: 'Resume screening, interviews, onboarding', color: 'from-green-500 to-green-600' },
  { id: 'finance', name: 'Finance', icon: DollarSign, description: 'Invoice processing, expense tracking', color: 'from-yellow-500 to-yellow-600' },
  { id: 'operations', name: 'Operations', icon: BarChart3, description: 'Task automation, workflow optimization', color: 'from-purple-500 to-purple-600' },
  { id: 'marketing', name: 'Marketing', icon: MessageSquare, description: 'Content generation, campaigns', color: 'from-pink-500 to-pink-600' },
  { id: 'support', name: 'Support', icon: Headphones, description: 'Ticket classification, responses', color: 'from-orange-500 to-orange-600' },
];

export default function DepartmentsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(false);

  const activeDept = departments.find(d => d.id === activeTab)!;
  const config = DEPARTMENT_CONFIGS[activeTab];

  const handleQuickAction = async (action: string) => {
    setLoading(true);
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`Action "${action}" executed successfully!`);
    setLoading(false);
  };

  const handleCreateAgent = (agentConfig: { name: string; description: string; role: string }) => {
    // Navigate to agent builder with pre-filled config
    const params = new URLSearchParams({
      name: agentConfig.name,
      description: agentConfig.description,
      role: agentConfig.role,
    });
    window.location.href = `/agents?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Department Dashboards</h1>
        <p className="text-gray-500 mt-2">Specialized automation tools for each department</p>
      </div>

      {/* Department Navigation */}
      <div className="grid grid-cols-6 gap-3">
        {departments.map(dept => {
          const Icon = dept.icon;
          const isActive = activeTab === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setActiveTab(dept.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? `border-transparent bg-gradient-to-r ${dept.color} text-white shadow-lg`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Icon size={24} className="mx-auto mb-2" />
              <p className={`text-sm font-semibold text-center ${isActive ? 'text-white' : 'text-gray-700'}`}>
                {dept.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Agents</p>
                <p className="text-3xl font-bold">{config.metrics.activeAgents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tasks Automated</p>
                <p className="text-3xl font-bold">{config.metrics.tasksAutomated.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Time Saved (hrs)</p>
                <p className="text-3xl font-bold">{config.metrics.timeSaved}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-3xl font-bold">{config.metrics.successRate}%</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common automation tasks for {activeDept.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {config.quickActions.map((action) => (
              <Button
                key={action.action}
                variant="outline"
                onClick={() => handleQuickAction(action.action)}
                disabled={loading}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <Play className="w-5 h-5" />
                <span>{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Agents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                {activeDept.name} Agents
              </CardTitle>
              <CardDescription>Pre-configured agents for {activeDept.name.toLowerCase()} automation</CardDescription>
            </div>
            <Link href="/agents">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Custom Agent
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {config.agents.map((agent) => (
              <Card key={agent.name} className="border-2 hover:border-purple-300 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{agent.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{agent.description}</p>
                      <p className="text-xs text-purple-600 mt-2 font-medium">{agent.role}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateAgent(agent)}
                      className="ml-4"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <AlertCircle className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-purple-900">Getting Started with {activeDept.name} Automation</h3>
              <p className="text-purple-700 mt-1">
                1. Add your API keys in Settings → API Keys<br />
                2. Create or use pre-configured agents above<br />
                3. Run quick actions or build custom workflows
              </p>
            </div>
            <Link href="/settings/api-keys">
              <Button>Setup API Keys</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
