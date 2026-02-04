'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function updateTaskStatus(taskId: string, status: string) {
  try {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error('Failed to update task');
    }

    revalidatePath('/pulse');
    return { success: true };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: 'Failed to update task' };
  }
}

export async function createTask(projectId: string, title: string, description?: string) {
  try {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title,
        description,
        status: 'BACKLOG',
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to create task');
    }

    const task = await res.json();
    revalidatePath('/pulse');
    return { success: true, task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: 'Failed to create task' };
  }
}
