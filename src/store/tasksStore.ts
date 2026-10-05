import { create } from 'zustand'
import type { TaskItem, CreateTaskInput } from '../types/tasks'
import { DEFAULT_TASK_CATEGORIES } from '../types/tasks'
import { tasksRepo } from '../repositories'

interface TasksState {
  tasks: TaskItem[]
  customCategories: string[]
  isLoading: boolean
  fetchAll: () => Promise<void>
  create: (input: CreateTaskInput) => Promise<void>
  update: (id: string, patch: Partial<TaskItem>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  addCategory: (name: string) => Promise<void>
  /** Default + custom categories, de-duplicated. */
  getCategories: () => string[]
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  customCategories: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true })
    try {
      const [tasks, customCategories] = await Promise.all([
        tasksRepo.getAll(),
        tasksRepo.getCategories().catch(() => [] as string[]),
      ])
      set({ tasks, customCategories })
    } catch {
      // Table may not exist yet (before SQL migration) — show empty rather than crash.
      set({ tasks: [], customCategories: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  create: async (input) => {
    const created = await tasksRepo.create(input)
    set(state => ({ tasks: [created, ...state.tasks] }))
  },

  update: async (id, patch) => {
    const updated = await tasksRepo.update(id, patch)
    set(state => ({ tasks: state.tasks.map(t => (t.id === id ? updated : t)) }))
  },

  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const nextStatus = task.status === 'done' ? 'open' : 'done'
    const doneAt = nextStatus === 'done' ? new Date().toISOString() : null
    const updated = await tasksRepo.update(id, { status: nextStatus, doneAt })
    set(state => ({ tasks: state.tasks.map(t => (t.id === id ? updated : t)) }))
  },

  remove: async (id) => {
    await tasksRepo.delete(id)
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
  },

  addCategory: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (get().getCategories().includes(trimmed)) return
    await tasksRepo.createCategory(trimmed)
    set(state => ({ customCategories: [...state.customCategories, trimmed] }))
  },

  getCategories: () => {
    const seen = new Set<string>()
    const all = [...DEFAULT_TASK_CATEGORIES, ...get().customCategories]
    return all.filter(c => (seen.has(c) ? false : (seen.add(c), true)))
  },
}))
