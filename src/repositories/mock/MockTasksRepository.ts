import { LocalStore } from './LocalStore'
import type { TaskItem, CreateTaskInput } from '../../types/tasks'

interface CategoryRecord { id: string; name: string }

function uid(): string {
  return (crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`)
}

export class MockTasksRepository {
  private tasks = new LocalStore<TaskItem>('mock-tasks')
  private categories = new LocalStore<CategoryRecord>('mock-task-categories')

  async getAll(): Promise<TaskItem[]> {
    return this.tasks.getAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async create(input: CreateTaskInput): Promise<TaskItem> {
    const task: TaskItem = {
      id: uid(),
      ...input,
      status: 'open',
      createdAt: new Date().toISOString(),
      doneAt: null,
    }
    return this.tasks.create(task)
  }

  async update(id: string, patch: Partial<TaskItem>): Promise<TaskItem> {
    return this.tasks.update(id, patch)
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id)
  }

  async getCategories(): Promise<string[]> {
    return this.categories.getAll().map(c => c.name).sort((a, b) => a.localeCompare(b, 'he'))
  }

  async createCategory(name: string): Promise<string> {
    this.categories.create({ id: uid(), name })
    return name
  }
}
