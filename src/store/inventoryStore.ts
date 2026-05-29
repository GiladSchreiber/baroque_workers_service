import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { InventoryItem, InventoryReport, InventoryEntry } from '../types/inventory'
import { STATUS_PRIORITY } from '../types/inventory'
import { inventoryRepo } from '../repositories/supabase/SupabaseInventoryRepository'

const useSupabase = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Default items ────────────────────────────────────────────────────────────
const buildItems = (prefix: string, category: string, names: string[], startOrder: number): InventoryItem[] =>
  names.map((name, i) => ({
    id: `inv-${prefix}-${i + 1}`,
    name,
    category,
    sortOrder: startOrder + i,
    isActive: true,
  }))

export const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  ...buildItems('veg', 'ירקות', [
    'תפוזים', 'לימונים', 'טימין', 'נענע', 'קיסר', 'לאליק', 'צנוניות',
    'עגבניות', 'עגבניות שרי', 'בצל סגול', 'אבוקדו', 'תפוחים',
    'פלפלים חריפים', 'חצילים', 'שמיר', 'בצל ירוק', 'שום',
  ], 1),
  ...buildItems('gen', 'כללי', ['מורטדלה', 'פסטרמה', 'חרדל', 'אנשובי'], 1),
  ...buildItems('gad', 'גד', ['מוצרלה', 'גאודה', 'לבנה', 'יוגורט', 'חמאה'], 1),
]

export const DEFAULT_CATEGORY_ORDER = ['ירקות', 'כללי', 'גד']

// ── Helpers ──────────────────────────────────────────────────────────────────
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/** Merge entries from multiple reports — worst status per item wins */
export function mergeEntries(reports: InventoryReport[]): Map<string, InventoryEntry> {
  const map = new Map<string, InventoryEntry>()
  for (const report of reports) {
    for (const entry of report.entries) {
      const existing = map.get(entry.itemId)
      if (!existing || STATUS_PRIORITY[entry.status] > STATUS_PRIORITY[existing.status]) {
        map.set(entry.itemId, entry)
      }
    }
  }
  return map
}

// ── Store ────────────────────────────────────────────────────────────────────
interface InventoryState {
  items: InventoryItem[]
  reports: InventoryReport[]
  categoryOrder: string[]
  loading: boolean

  // Bootstrap: load everything from Supabase (or seed defaults on first run)
  fetchAll: () => Promise<void>

  // Item CRUD
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>
  updateItem: (id: string, patch: Partial<Omit<InventoryItem, 'id'>>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  reorderItems: (category: string, orderedIds: string[]) => Promise<void>

  // Category management
  addCategory: (name: string) => Promise<void>
  deleteCategory: (name: string) => Promise<void>
  setCategoryOrder: (order: string[]) => Promise<void>

  // Report actions
  saveReport: (report: Omit<InventoryReport, 'id' | 'submittedAt'>) => Promise<void>
  getReportByDateAndWorker: (date: string, workerId: string) => InventoryReport | undefined
  getReportsForDate: (date: string) => InventoryReport[]
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: DEFAULT_INVENTORY_ITEMS,
      reports: [],
      categoryOrder: DEFAULT_CATEGORY_ORDER,
      loading: false,

      // ── Fetch / seed ────────────────────────────────────────────────────────

      fetchAll: async () => {
        if (!useSupabase) return
        set({ loading: true })
        try {
          let [items, categoryOrder] = await Promise.all([
            inventoryRepo.getItems(),
            inventoryRepo.getCategoryOrder(),
          ])

          // Seed defaults on first run
          if (items.length === 0) {
            await inventoryRepo.upsertItems(DEFAULT_INVENTORY_ITEMS)
            await inventoryRepo.setCategoryOrder(DEFAULT_CATEGORY_ORDER)
            items = DEFAULT_INVENTORY_ITEMS
            categoryOrder = DEFAULT_CATEGORY_ORDER
          } else if (categoryOrder.length === 0) {
            await inventoryRepo.setCategoryOrder(DEFAULT_CATEGORY_ORDER)
            categoryOrder = DEFAULT_CATEGORY_ORDER
          }

          set({ items, categoryOrder, loading: false })
        } catch (err) {
          console.error('inventory fetchAll:', err)
          set({ loading: false })
        }
      },

      // ── Items ───────────────────────────────────────────────────────────────

      addItem: async (item) => {
        const newItem: InventoryItem = { ...item, id: genId() }
        set(s => {
          const order = s.categoryOrder.includes(item.category)
            ? s.categoryOrder
            : [...s.categoryOrder, item.category]
          return { items: [...s.items, newItem], categoryOrder: order }
        })
        if (useSupabase) {
          inventoryRepo.upsertItem(newItem).catch(console.error)
          const order = get().categoryOrder
          inventoryRepo.setCategoryOrder(order).catch(console.error)
        }
      },

      updateItem: async (id, patch) => {
        set(s => ({ items: s.items.map(it => it.id === id ? { ...it, ...patch } : it) }))
        if (useSupabase) {
          const item = get().items.find(it => it.id === id)
          if (item) inventoryRepo.upsertItem(item).catch(console.error)
        }
      },

      deleteItem: async (id) => {
        set(s => ({ items: s.items.filter(it => it.id !== id) }))
        if (useSupabase) {
          inventoryRepo.deleteItem(id).catch(console.error)
        }
      },

      reorderItems: async (category, orderedIds) => {
        set(s => ({
          items: s.items.map(it => {
            if (it.category !== category) return it
            const idx = orderedIds.indexOf(it.id)
            return idx === -1 ? it : { ...it, sortOrder: idx + 1 }
          }),
        }))
        if (useSupabase) {
          const updated = get().items.filter(it => it.category === category)
          inventoryRepo.upsertItems(updated).catch(console.error)
        }
      },

      // ── Categories ──────────────────────────────────────────────────────────

      addCategory: async (name) => {
        set(s => ({
          categoryOrder: s.categoryOrder.includes(name)
            ? s.categoryOrder
            : [...s.categoryOrder, name],
        }))
        if (useSupabase) {
          inventoryRepo.setCategoryOrder(get().categoryOrder).catch(console.error)
        }
      },

      deleteCategory: async (name) => {
        set(s => ({
          items: s.items.filter(it => it.category !== name),
          categoryOrder: s.categoryOrder.filter(c => c !== name),
        }))
        if (useSupabase) {
          inventoryRepo.setCategoryOrder(get().categoryOrder).catch(console.error)
          // Items are cascade-deleted in DB via the foreign key on inventory_entries,
          // but we need to explicitly delete the items themselves
          const toDelete = get().items.filter(it => it.category === name)
          toDelete.forEach(it => inventoryRepo.deleteItem(it.id).catch(console.error))
        }
      },

      setCategoryOrder: async (order) => {
        set({ categoryOrder: order })
        if (useSupabase) {
          inventoryRepo.setCategoryOrder(order).catch(console.error)
        }
      },

      // ── Reports ─────────────────────────────────────────────────────────────

      saveReport: async (reportData) => {
        const now = new Date().toISOString()
        const existing = get().reports.find(
          r => r.date === reportData.date && r.submittedById === reportData.submittedById
        )
        const localReport: InventoryReport = {
          ...reportData,
          id: existing?.id ?? genId(),
          submittedAt: now,
        }

        // Optimistic update
        set(s => ({
          reports: existing
            ? s.reports.map(r => r.id === existing.id ? localReport : r)
            : [...s.reports, localReport],
        }))

        if (useSupabase) {
          try {
            const saved = await inventoryRepo.saveReport({ ...localReport })
            // Update with DB-assigned id / submittedAt
            set(s => ({
              reports: s.reports.map(r => r.id === localReport.id ? saved : r),
            }))
          } catch (err) {
            console.error('saveReport:', err)
          }
        }
      },

      getReportByDateAndWorker: (date, workerId) =>
        get().reports.find(r => r.date === date && r.submittedById === workerId),

      getReportsForDate: (date) =>
        get().reports.filter(r => r.date === date),
    }),
    { name: 'inventory-v2' }
  )
)

export { todayStr }
