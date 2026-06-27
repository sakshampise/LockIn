import { supabase } from '@/lib/supabase/client';
import type { Priority, Recurrence, Task } from '@/types';
import type { Database } from '@/lib/supabase/database.types';

type TaskRow = Database['public']['Tables']['tasks']['Row'];

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    done: row.done,
    priority: row.priority,
    dueDate: row.due_date,
    recurrence: row.recurrence,
    pageId: row.page_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapTask);
}

export async function createTask(
  title: string,
  opts: Partial<Pick<Task, 'priority' | 'dueDate' | 'recurrence' | 'pageId' | 'description' | 'sortOrder'>> = {},
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description: opts.description ?? null,
      priority: opts.priority ?? ('medium' as Priority),
      due_date: opts.dueDate ?? null,
      recurrence: opts.recurrence ?? ('none' as Recurrence),
      page_id: opts.pageId ?? null,
      sort_order: opts.sortOrder ?? 0,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapTask(data);
}

export async function updateTask(task: Task): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: task.title,
      description: task.description,
      done: task.done,
      priority: task.priority,
      due_date: task.dueDate,
      recurrence: task.recurrence,
      page_id: task.pageId,
      sort_order: task.sortOrder,
      completed_at: task.completedAt,
    })
    .eq('id', task.id)
    .select('*')
    .single();

  if (error) throw error;
  return mapTask(data);
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function reorderTasks(tasks: Task[]): Promise<Task[]> {
  const updates = tasks.map((task, index) => (
    supabase.from('tasks').update({ sort_order: index }).eq('id', task.id).select('*').single()
  ));

  const results = await Promise.all(updates);
  const error = results.find(result => result.error)?.error;
  if (error) throw error;

  return results.flatMap(result => result.data ? [mapTask(result.data)] : []);
}
