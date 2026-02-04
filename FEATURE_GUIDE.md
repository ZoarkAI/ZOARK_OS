# ZOARK OS - Complete Feature Guide

Comprehensive guide to all features in the production-ready ZOARK OS application.

## 1. The Pulse - Project Dashboard

### Overview
Real-time project board with AI agent monitoring, drag-and-drop task management, and health metrics.

### Key Features

**Multi-Project Support**
- Create and manage multiple projects
- Switch between projects with tabs
- Independent task boards per project
- Project-level health scores and velocity metrics

**Task Management**
- Drag-and-drop tasks between columns (Done, Active, Backlog, Gap)
- Create new tasks with title and description
- View task details including:
  - Contact person
  - Number of people assigned
  - Process stage (Planning, In Progress, Review, Blocked, Completed)
  - Health status (Healthy, At Risk, Critical)
  - Work history timeline
  - Assigned team members
  - Tags and priority

**Health Metrics**
- Overall health score (percentage)
- Breakdown by status (Healthy, At Risk, Critical)
- Critical task alerts
- Health trend indicators

**Agent Control Panel**
- Trigger agents manually
- View agent status (Idle, Running, Success, Error)
- Last run timestamps
- Run all agents at once
- Collapsible panel for space management

**Statistics**
- Total tasks count
- Completion rate percentage
- Stuck tasks count
- Team members count
- Status distribution (Done, Active, Backlog, Gap)
- Velocity chart showing weekly completion trends

### How to Use

1. **Create a Project**
   - Click "New Project" button
   - Enter project name and optional description
   - Project appears in tabs

2. **Create a Task**
   - Click "New Task" button
   - Enter title and optional description
   - Task appears in Backlog column

3. **Move Tasks**
   - Drag task card to different column
   - Task status updates automatically
   - Agent monitors for stuck tasks

4. **View Task Details**
   - Click on task card
   - Modal shows full details
   - Edit task information
   - View work history

5. **Monitor Agents**
   - Check agent status in control panel
   - Click "Trigger" to run agent manually
   - View last run time
   - Monitor health metrics

---

## 2. Proactive Directory - Team Management

### Overview
Centralized team management with document uploads, task assignment, and email automation.

### Key Features

**Team Member Management**
- Add/edit/delete team members
- Store email addresses
- Set working hours (e.g., "9AM-5PM EST")
- Assign roles (e.g., "Manager", "Developer")
- Upload profile avatars

**Document Management**
- Upload documents per team member (timesheets, reports, etc.)
- Track document type and upload date
- Organize documents by team member
- Search and filter documents

**Task Assignment**
- Assign tasks to team members
- Set deadlines
- Add assignment notes
- Send assignments via email
- Track assignment status

**Email Integration**
- Connect Gmail, Outlook, or Yahoo accounts
- Send task assignments via email
- Automatic reminder emails
- Track email delivery status
- Sync email attachments to RAG

**Broadcast Emails**
- Compose emails to multiple recipients
- Schedule broadcasts for later
- Track broadcast status (Draft, Scheduled, Sent, Failed)
- View recipient list
- Add custom message body

**Automation**
- Automatic timesheet reminders
- Document collection automation
- Task escalation for overdue items
- Team report generation

### How to Use

1. **Add Team Member**
   - Go to Proactive Directory
   - Click "Add Member"
   - Enter name, email, working hours, role
   - Save

2. **Upload Document**
   - Click "Upload" on team member card
   - Select document type (timesheet, report, etc.)
   - Upload file
   - Document appears in member's list

3. **Assign Task**
   - Click "Assign Task"
   - Select team members
   - Choose task type (timesheet, document, etc.)
   - Set deadline
   - Send via email

4. **Send Broadcast**
   - Go to Broadcast section
   - Compose email (subject, body)
   - Add recipients
   - Schedule or send immediately
   - Monitor delivery status

5. **Connect Email Account**
   - Go to Email Settings
   - Click "Connect Account"
   - Select provider (Gmail, Outlook, Yahoo)
   - Authorize access
   - Account appears in connected list

---

## 3. Flow Engine - Approval Pipelines

### Overview
Visual approval pipeline builder with customizable stages, deliverables, and automation.

### Key Features

**Pipeline Management**
- Create multiple pipelines per project
- Name and describe pipelines
- Reuse templates
- Duplicate existing pipelines
- Delete pipelines

**Pipeline Stages**
- Add/edit/delete stages
- Set stage order
- Define deliverables (documents, approvals, etc.)
- Assign approver email
- Set nudge frequency (daily, weekly, etc.)

**Approval Tracking**
- Track approval status (Pending, Approved, Rejected)
- Set deadlines per stage
- Automatic nudges for overdue approvals
- View approval history
- Document requirements per stage

**Pipeline Templates**
- Save pipelines as templates
- Reuse templates for similar workflows
- Customize templates per project
- Share templates across team

**Automation**
- Automatic nudges for overdue approvals
- Email notifications to approvers
- Escalation for blocked approvals
- Status updates on completion

### How to Use

1. **Create Pipeline**
   - Click "New Pipeline"
   - Enter name and description
   - Add stages
   - Set approvers and deadlines

2. **Add Stage**
   - Click "Add Stage"
   - Enter stage name
   - Define deliverables
   - Assign approver email
   - Set nudge frequency

3. **Save as Template**
   - Click "Save as Template"
   - Name the template
   - Template available for reuse

4. **Duplicate Pipeline**
   - Click copy icon on pipeline
   - New pipeline created with same stages
   - Edit as needed

5. **Monitor Approvals**
   - View approval status per stage
   - See deadline and nudge info
   - Track approval history

---

## 4. Intelligence Hub - Search & Automation

### Overview
RAG-powered document search, real-time agent activity monitoring, and email account management.

### Key Features

**Document Search**
- Semantic search across all documents
- Filter by document type
- Filter by date range
- View relevance scores
- Direct links to documents
- Search email attachments

**Email Account Management**
- Connect multiple email accounts
- Support for Gmail, Outlook, Yahoo
- View connection status
- Sync attachments from email
- Disconnect accounts
- Track synced documents

**Agent Activity Feed**
- Real-time agent activity updates
- Filter by agent type
- Filter by status (Success, Failed, In Progress)
- View activity details
- Timestamp for each action
- Context information

**Agent Statistics**
- Total activities in last 24 hours
- Activities by agent type
- Success/failure counts
- Status breakdown
- Performance metrics

**Quick Agent Triggers**
- Task Monitor - Detect stuck tasks
- Timesheet Drafter - Send reminders
- Approval Nudger - Nudge approvers
- Broadcast Agent - Send emails
- Document Indexer - Index attachments
- Task Escalator - Escalate stuck tasks
- Team Coordinator - Coordinate team tasks

### How to Use

1. **Search Documents**
   - Enter search query
   - Click "Search"
   - Results show with relevance scores
   - Click to open document

2. **Filter Search**
   - Click "Filters"
   - Select document type
   - Choose date range
   - Apply filters

3. **Connect Email Account**
   - Click "Connect Account"
   - Select provider
   - Authorize access
   - Account appears in list

4. **Sync Attachments**
   - Click "Sync" on email account
   - Attachments indexed to RAG
   - Documents searchable

5. **Monitor Agents**
   - View activity feed
   - Filter by agent type or status
   - Click activity for details
   - View statistics

6. **Trigger Agents**
   - Click "Trigger" on agent card
   - Agent runs immediately
   - Status updates in real-time
   - View results in activity feed

---

## 5. Agent System

### Overview
Autonomous agents that handle routine tasks, send notifications, and manage workflows.

### Available Agents

**Task Monitor**
- Detects tasks stuck >48 hours in Active status
- Alerts managers
- Logs stuck task incidents
- Triggers escalation

**Timesheet Drafter**
- Sends timesheet reminders
- Tracks submission status
- Escalates overdue submissions
- Generates reports

**Approval Nudger**
- Sends nudges for pending approvals
- Escalates overdue approvals
- Tracks approval status
- Sends reminder emails

**Broadcast Agent**
- Sends scheduled emails
- Tracks delivery status
- Logs broadcast activity
- Handles multiple recipients

**Document Indexer**
- Indexes email attachments
- Extracts text content
- Stores in RAG system
- Updates indexing status

**Task Escalator**
- Monitors stuck tasks
- Updates health status to Critical
- Notifies managers
- Suggests escalation actions

**Team Coordinator**
- Sends document collection reminders
- Tracks submission status
- Escalates overdue items
- Generates team reports

### Agent Scheduling

**Create Schedule**
- Go to Agent Scheduling
- Select agent type
- Enter cron expression (e.g., "0 9 * * FRI" for 9 AM Friday)
- Enable/disable schedule
- Agent runs automatically

**Monitor Execution**
- View last run time
- View next scheduled run
- Check execution status
- View activity logs

---

## 6. Advanced Features

### Real-Time Updates
- WebSocket connection for live agent activity
- Real-time task status updates
- Live approval notifications
- Instant broadcast delivery status

### RAG System
- Semantic document search
- Email attachment indexing
- Vector embeddings (Pinecone)
- Full-text search fallback

### Email Integration
- OAuth authentication
- Multiple provider support
- Attachment extraction
- Automatic indexing

### Health Metrics
- Task health tracking
- Project health scores
- Team utilization metrics
- Agent performance metrics

### Audit Trail
- All agent actions logged
- Timestamp for each action
- Context information
- Success/failure tracking

---

## 7. Best Practices

### Task Management
- Keep task descriptions clear and concise
- Assign contact person for accountability
- Update process stage regularly
- Monitor health status
- Use tags for organization

### Team Management
- Keep working hours updated
- Assign clear roles
- Collect documents regularly
- Use broadcast for announcements
- Monitor team activity

### Approval Workflows
- Define clear deliverables
- Set realistic deadlines
- Use templates for consistency
- Monitor approval progress
- Escalate overdue items

### Agent Usage
- Schedule agents during off-hours
- Monitor agent activity regularly
- Review agent logs for issues
- Adjust schedules as needed
- Use manual triggers for urgent tasks

### Document Management
- Organize documents by type
- Use consistent naming
- Archive old documents
- Search regularly
- Backup important documents

---

## 8. Troubleshooting

### Tasks Not Moving
- Check drag-and-drop functionality
- Verify browser compatibility
- Clear browser cache
- Refresh page

### Agents Not Running
- Check agent schedule
- Verify database connection
- Check agent logs
- Trigger manually to test

### Email Not Sending
- Verify email account connection
- Check email credentials
- Verify SMTP settings
- Check spam folder

### Search Not Working
- Verify documents are indexed
- Check RAG status
- Try different search terms
- Check document permissions

### Performance Issues
- Check database connection
- Monitor agent execution time
- Clear old logs
- Optimize database queries

---

## 9. Support

For issues or questions:
- Check API documentation at `/docs`
- Review agent activity logs
- Check system health status
- Contact support team
- Report bugs on GitHub
