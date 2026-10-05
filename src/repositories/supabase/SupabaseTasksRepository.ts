import { supabase } from '../../lib/supabase'
import type { TaskItem, CreateTaskInput, TaskStatus } from '../../types/tasks'

interface TaskRow {
  id: string
  title: string
  urgency: string
  category: string
  description: string | null
  photo: string | null
  created_by_id: string | null
  created_by_name: string | null
  status: string
  created_at: string
  done_at: string | null
}

interface CategoryRow {
  id: string
  name: string
}

function rowToTask(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    urgency: row.urgency as TaskItem['urgency'],
    category: row.category,
    description: row.description ?? undefined,
    photo: row.photo ?? undefined,
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    doneAt: row.done_at,
  }
}

export class SupabaseTasksRepository {
  async getAll(): Promise<TaskItem[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as TaskRow[]).map(rowToTask)
  }

  async create(input: CreateTaskInput): Promise<TaskItem> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        urgency: input.urgency,
        category: input.category,
        description: input.description ?? null,
        photo: input.photo ?? null,
        created_by_id: input.createdById || null,
        created_by_name: input.createdByName || null,
        status: 'open',
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return rowToTask(data as TaskRow)
  }

  async update(id: string, patch: Partial<TaskItem>): Promise<TaskItem> {
    const row: Record<string, unknown> = {}
    if (patch.title !== undefined) row.title = patch.title
    if (patch.urgency !== undefined) row.urgency = patch.urgency
    if (patch.category !== undefined) row.category = patch.category
    if (patch.description !== undefined) row.description = patch.description ?? null
    if (patch.photo !== undefined) row.photo = patch.photo ?? null
    if (patch.status !== undefined) row.status = patch.status
    if (patch.doneAt !== undefined) row.done_at = patch.doneAt

    const { data, error } = await supabase
      .from('tasks')
      .update(row)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return rowToTask(data as TaskRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return (data as CategoryRow[]).map(r => r.name)
  }

  async createCategory(name: string): Promise<string> {
    const { data, error } = await supabase
      .from('task_categories')
      .insert({ name })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return (data as CategoryRow).name
  }
}
