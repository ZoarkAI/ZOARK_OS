const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchTasks(projectId?: string) {
  const url = projectId
    ? `${API_URL}/tasks?project_id=${projectId}`
    : `${API_URL}/tasks`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_URL}/projects`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${API_URL}/users`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function fetchInvoices(projectId?: string) {
  const url = projectId
    ? `${API_URL}/invoices?project_id=${projectId}`
    : `${API_URL}/invoices`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

export async function updateTaskStatus(taskId: string, status: string) {
  const res = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}
