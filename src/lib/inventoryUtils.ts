import type { InventoryItem } from '../types/inventory'
import type { InventoryStatus } from '../types/inventory'

const STATUS_ORDER: Record<InventoryStatus, number> = { missing: 0, partial: 1, ok: 2 }
const STATUS_SYMBOL: Record<InventoryStatus, string> = { missing: '✗', partial: '~', ok: '✓' }

function fmtDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y.slice(2)}`
}

export interface InventoryEntry {
  itemId: string
  status: InventoryStatus
  notes: string
}

export function buildInventoryClipboardMessage(
  entries: InventoryEntry[],
  items: InventoryItem[],
  categoryOrder: string[],
  date: string,
): string {
  const entryMap = new Map(entries.map(e => [e.itemId, e]))

  // Collect categories in order (only those that have at least one filled entry)
  const filledItemIds = new Set(entries.map(e => e.itemId))
  const presentCats = new Set(
    items.filter(it => filledItemIds.has(it.id)).map(it => it.category)
  )
  const orderedCats = [
    ...categoryOrder.filter(c => presentCats.has(c)),
    ...[...presentCats].filter(c => !categoryOrder.includes(c)).sort((a, b) => a.localeCompare(b, 'he')),
  ]

  const lines: string[] = [`📦 מלאי – ${fmtDate(date)}`]

  for (const cat of orderedCats) {
    // Only include missing (✗) and partial (~) items — skip ok (✓)
    const catItems = items
      .filter(it => it.category === cat && filledItemIds.has(it.id) && entryMap.get(it.id)!.status !== 'ok')
      .sort((a, b) => {
        const sa = STATUS_ORDER[entryMap.get(a.id)!.status]
        const sb = STATUS_ORDER[entryMap.get(b.id)!.status]
        return sa !== sb ? sa - sb : a.sortOrder - b.sortOrder
      })

    if (catItems.length === 0) continue  // skip category if nothing to report
    lines.push('')
    lines.push(`*${cat}:*`)
    for (const item of catItems) {
      const entry = entryMap.get(item.id)!
      const sym = STATUS_SYMBOL[entry.status]
      lines.push(entry.notes ? `${sym} ${item.name} – ${entry.notes}` : `${sym} ${item.name}`)
    }
  }

  return lines.join('\n')
}
