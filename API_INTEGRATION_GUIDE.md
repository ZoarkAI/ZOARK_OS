# ZOARK OS - API Integration Guide

Complete guide for integrating with ZOARK OS APIs.

## Base URL
```
https://your-api-url.com
```

## Authentication
Currently uses CORS-based access. Production deployment should implement:
- JWT tokens
- API keys
- OAuth 2.0

## Core Endpoints

### Projects
```
GET    /projects              - List projects
POST   /projects              - Create project
GET    /projects/{id}         - Get project
PATCH  /projects/{id}         - Update project
DELETE /projects/{id}         - Delete project
```

### Tasks
```
GET    /tasks                 - List tasks (filter by project_id, status)
POST   /tasks                 - Create task
GET    /tasks/{id}            - Get task
PATCH  /tasks/{id}            - Update task
DELETE /tasks/{id}            - Delete task
GET    /tasks/{id}/details    - Get task details
PATCH  /tasks/{id}/details    - Update task details
GET    /tasks/{id}/work-history - Get work history
POST   /tasks/{id}/work-history - Add history event
```

### Team Members
```
GET    /team-members          - List team members
POST   /team-members          - Create team member
GET    /team-members/{id}     - Get team member
PATCH  /team-members/{id}     - Update team member
DELETE /team-members/{id}     - Delete team member
GET    /team-members/{id}/documents - Get documents
POST   /team-members/{id}/documents - Upload document
```

### Email Accounts
```
GET    /email-accounts        - List accounts
POST   /email-accounts        - Connect account
GET    /email-accounts/{id}   - Get account
PATCH  /email-accounts/{id}   - Update account
DELETE /email-accounts/{id}   - Disconnect account
POST   /email-accounts/{id}/sync - Sync attachments
```

### Pipeline Templates
```
GET    /pipeline-templates    - List templates
POST   /pipeline-templates    - Create template
GET    /pipeline-templates/{id} - Get template
PATCH  /pipeline-templates/{id} - Update template
DELETE /pipeline-templates/{id} - Delete template
POST   /pipeline-templates/{id}/duplicate - Duplicate
```

### RAG Documents
```
GET    /documents             - List documents
POST   /documents             - Create document
GET    /documents/{id}        - Get document
PATCH  /documents/{id}        - Update document
DELETE /documents/{id}        - Delete document
POST   /documents/search      - Search documents
POST   /documents/{id}/index  - Index to RAG
```

### Agent Scheduling
```
GET    /agents/schedule       - List schedules
POST   /agents/schedule       - Create schedule
GET    /agents/schedule/{id}  - Get schedule
PATCH  /agents/schedule/{id}  - Update schedule
DELETE /agents/schedule/{id}  - Delete schedule
```

### Agent Activity
```
GET    /agent-activity        - List activities
GET    /agent-activity/{id}   - Get activity
GET    /agent-activity/stats/summary - Get statistics
WS     /agent-activity/ws     - WebSocket for real-time updates
```

## Example Requests

### Create Project
```bash
curl -X POST https://your-api-url.com/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2026 Initiative",
    "description": "First quarter projects"
  }'
```

### Create Task
```bash
curl -X POST https://your-api-url.com/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_123",
    "title": "Implement feature X",
    "description": "Add new feature to dashboard",
    "status": "BACKLOG"
  }'
```

### Add Team Member
```bash
curl -X POST https://your-api-url.com/team-members \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "workingHours": "9AM-5PM EST",
    "role": "Developer"
  }'
```

### Connect Email Account
```bash
curl -X POST https://your-api-url.com/email-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GMAIL",
    "email": "user@gmail.com",
    "accessToken": "ya29...",
    "refreshToken": "1//0..."
  }'
```

### Create Broadcast Email
```bash
curl -X POST https://your-api-url.com/broadcasts \
  -H "Content-Type: application/json" \
  -d '{
    "emailAccountId": "acc_123",
    "subject": "Team Update",
    "body": "Here is the latest update...",
    "recipients": ["team@example.com", "manager@example.com"],
    "scheduledFor": "2026-02-05T09:00:00Z"
  }'
```

### Search Documents
```bash
curl "https://your-api-url.com/documents/search?query=budget&limit=10"
```

### Create Agent Schedule
```bash
curl -X POST https://your-api-url.com/agents/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "timesheet_drafter",
    "cronExpression": "0 9 * * FRI",
    "isActive": true
  }'
```

### WebSocket Real-Time Updates
```javascript
const ws = new WebSocket('wss://your-api-url.com/agent-activity/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: "filter",
    status: "SUCCESS"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Agent activity:', data);
};
```

## Response Format

### Success Response
```json
{
  "id": "task_123",
  "title": "Task Title",
  "status": "ACTIVE",
  "createdAt": "2026-02-03T21:00:00Z",
  "updatedAt": "2026-02-03T21:00:00Z"
}
```

### Error Response
```json
{
  "detail": "Task not found"
}
```

### List Response
```json
[
  {
    "id": "task_123",
    "title": "Task 1"
  },
  {
    "id": "task_456",
    "title": "Task 2"
  }
]
```

## Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (Delete)
- `400` - Bad Request
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

## Rate Limiting
- 120 requests per minute per IP
- Returns 429 when exceeded

## CORS
Configured for:
- Localhost (development)
- Production URL (set via CORS_ORIGIN env var)

## Error Handling

### Common Errors
```json
{
  "detail": "Task not found"
}
```

```json
{
  "detail": "Email already exists"
}
```

```json
{
  "detail": "Rate limit exceeded. Try again later."
}
```

## Pagination
List endpoints support:
- `limit` - Number of results (default: 50)
- `offset` - Skip results (for pagination)

## Filtering
Task list supports:
- `project_id` - Filter by project
- `status` - Filter by status (DONE, ACTIVE, BACKLOG, GAP)

Document search supports:
- `query` - Search term
- `type` - Document type
- `limit` - Result limit

## SDK Examples

### Python
```python
import requests

api_url = "https://your-api-url.com"

# Create task
response = requests.post(
    f"{api_url}/tasks",
    json={
        "projectId": "proj_123",
        "title": "New Task",
        "status": "BACKLOG"
    }
)
task = response.json()
print(f"Created task: {task['id']}")
```

### JavaScript
```javascript
const apiUrl = "https://your-api-url.com";

// Create task
const response = await fetch(`${apiUrl}/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectId: "proj_123",
    title: "New Task",
    status: "BACKLOG"
  })
});

const task = await response.json();
console.log(`Created task: ${task.id}`);
```

### cURL
```bash
curl -X POST https://your-api-url.com/tasks \
  -H "Content-Type: application/json" \
  -d '{"projectId":"proj_123","title":"New Task","status":"BACKLOG"}'
```

## Webhooks (Future)
Planned for Phase 2:
- Task status changes
- Approval completions
- Agent execution events
- Email delivery status

## API Documentation
Full interactive documentation available at:
```
https://your-api-url.com/docs
```

## Support
For API issues:
1. Check `/docs` for endpoint details
2. Review error messages
3. Check agent activity logs
4. Contact support team
