// Manager "משימות" (tasks / todo) feature.

export type TaskUrgency = 'low' | 'medium' | 'high'
export type TaskStatus = 'open' | 'done'

export interface TaskItem {
  id: string
  title: string
  urgency: TaskUrgency
  category: string            // category name (from the categories list)
  description?: string
  photo?: string              // compressed base64 data URL (optional)
  createdById: string
  createdByName: string
  status: TaskStatus
  createdAt: string           // ISO timestamp
  doneAt?: string | null      // ISO timestamp when marked done
}

// Fields the caller supplies when creating; the rest are set by the store/repo.
export type CreateTaskInput = Omit<TaskItem, 'id' | 'createdAt' | 'status' | 'doneAt'>

export const TASK_URGENCY_LABELS: Record<TaskUrgency, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
}

// Higher number = more urgent (used for sorting).
export const TASK_URGENCY_ORDER: Record<TaskUrgency, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

// Seed categories; managers can add more (persisted in task_categories).
export const DEFAULT_TASK_CATEGORIES = ['תקלות', 'צוות', 'בירוקרטיות']
