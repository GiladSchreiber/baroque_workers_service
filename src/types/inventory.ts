export type InventoryStatus = 'ok' | 'partial' | 'missing'

export interface InventoryItem {
  id: string
  name: string
  category: string
  sortOrder: number
  isActive: boolean
}

export interface InventoryEntry {
  itemId: string
  status: InventoryStatus
  notes: string
}

export interface InventoryReport {
  id: string
  date: string           // YYYY-MM-DD
  submittedById: string
  submittedByName: string
  submittedAt: string
  entries: InventoryEntry[]
}

export const STATUS_PRIORITY: Record<InventoryStatus, number> = {
  ok: 0,
  partial: 1,
  missing: 2,
}

export const STATUS_LABELS: Record<InventoryStatus, string> = {
  ok: 'V',
  partial: '~',
  missing: 'X',
}
