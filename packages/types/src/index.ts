// Shared TypeScript types for ZOARK OS

export type TaskStatus = 'DONE' | 'ACTIVE' | 'BACKLOG' | 'GAP';

export type InvoiceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export type ApprovalStage =
  | 'LEGAL_REVIEW'
  | 'FINANCE_CHECK'
  | 'MANAGER_APPROVAL'
  | 'EXECUTIVE_APPROVAL';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AgentAction =
  | 'TASK_STUCK_ALERT'
  | 'TIMESHEET_REMINDER'
  | 'APPROVAL_NUDGE'
  | 'EMAIL_PARSED'
  | 'INVOICE_PROCESSED';

export type AgentStatus = 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  lastUpdated: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  healthScore: number;
  velocity: number;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  timesheetStatus: string;
  githubUsername?: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  amount: number;
  status: InvoiceStatus;
  pdfUrl?: string;
  createdAt: Date;
}

export interface ApprovalStep {
  id: string;
  invoiceId: string;
  stage: ApprovalStage;
  requiredDocs: string[];
  assigneeEmail: string;
  status: ApprovalStatus;
  deadline: Date;
  lastNudgedAt?: Date;
}

export interface AgentLog {
  id: string;
  action: AgentAction;
  context: Record<string, any>;
  timestamp: Date;
  status: AgentStatus;
}
