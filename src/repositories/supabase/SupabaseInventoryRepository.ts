import { supabase } from '../../lib/supabase'
import type { InventoryItem, InventoryReport, InventoryEntry } from '../../types/inventory'

// ── Row types ──────────────────────────────────────────────────────────────────

interface ItemRow {
  id: string
  name: string
  category: string
  sort_order: number
  is_active: boolean
}

interface CategoryOrderRow {
  category: string
  sort_order: number
}

interface ReportRow {
  id: string
  date: string
  submitted_by_id: string   // text (not uuid) — supports any employee ID format
  submitted_by_name: string
  submitted_at: string
}

interface EntryRow {
  report_id: string
  item_id: string
  status: string
  notes: string
}

// ── Mappers ────────────────────────────────────────────────────────────────────

function toItem(r: ItemRow): InventoryItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  }
}

function toReport(r: ReportRow, entries: EntryRow[]): InventoryReport {
  return {
    id: r.id,
    date: r.date,
    submittedById: r.submitted_by_id,
    submittedByName: r.submitted_by_name,
    submittedAt: r.submitted_at,
    entries: entries
      .filter(e => e.report_id === r.id)
      .map(e => ({ itemId: e.item_id, status: e.status as InventoryEntry['status'], notes: e.notes })),
  }
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseInventoryRepository {

  // ── Items ──────────────────────────────────────────────────────────────────

  async getItems(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('sort_order')
    if (error) throw error
    return (data as ItemRow[]).map(toItem)
  }

  async upsertItem(item: InventoryItem): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .upsert({
        id: item.id,
        name: item.name,
        category: item.category,
        sort_order: item.sortOrder,
        is_active: item.isActive,
      })
    if (error) throw error
  }

  async upsertItems(items: InventoryItem[]): Promise<void> {
    if (items.length === 0) return
    const { error } = await supabase
      .from('inventory_items')
      .upsert(items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        sort_order: item.sortOrder,
        is_active: item.isActive,
      })))
    if (error) throw error
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  // ── Category order ─────────────────────────────────────────────────────────

  async getCategoryOrder(): Promise<string[]> {
    const { data, error } = await supabase
      .from('inventory_category_order')
      .select('*')
      .order('sort_order')
    if (error) throw error
    return (data as CategoryOrderRow[]).map(r => r.category)
  }

  async setCategoryOrder(order: string[]): Promise<void> {
    // Replace entire order table
    await supabase.from('inventory_category_order').delete().neq('category', '__never__')
    if (order.length === 0) return
    const { error } = await supabase
      .from('inventory_category_order')
      .insert(order.map((category, i) => ({ category, sort_order: i })))
    if (error) throw error
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  async getLatestReport(): Promise<InventoryReport | null> {
    const { data: reports, error: rErr } = await supabase
      .from('inventory_reports')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(1)
    if (rErr) throw rErr
    if (!reports || reports.length === 0) return null

    const report = reports[0] as ReportRow
    const { data: entries, error: eErr } = await supabase
      .from('inventory_entries')
      .select('*')
      .eq('report_id', report.id)
    if (eErr) throw eErr

    return toReport(report, (entries ?? []) as EntryRow[])
  }

  async getReportsForDate(date: string): Promise<InventoryReport[]> {
    const { data: reports, error: rErr } = await supabase
      .from('inventory_reports')
      .select('*')
      .eq('date', date)
    if (rErr) throw rErr
    if (!reports || reports.length === 0) return []

    const reportIds = (reports as ReportRow[]).map(r => r.id)
    const { data: entries, error: eErr } = await supabase
      .from('inventory_entries')
      .select('*')
      .in('report_id', reportIds)
    if (eErr) throw eErr

    return (reports as ReportRow[]).map(r => toReport(r, (entries ?? []) as EntryRow[]))
  }

  async getReportByDateAndWorker(date: string, workerId: string): Promise<InventoryReport | null> {
    const { data: reports, error: rErr } = await supabase
      .from('inventory_reports')
      .select('*')
      .eq('date', date)
      .eq('submitted_by_id', workerId)
      .limit(1)
    if (rErr) throw rErr
    if (!reports || reports.length === 0) return null

    const report = reports[0] as ReportRow
    const { data: entries, error: eErr } = await supabase
      .from('inventory_entries')
      .select('*')
      .eq('report_id', report.id)
    if (eErr) throw eErr

    return toReport(report, (entries ?? []) as EntryRow[])
  }

  async saveReport(report: Omit<InventoryReport, 'id'> & { id?: string }): Promise<InventoryReport> {
    // Upsert the report row (unique on date + submitted_by_id)
    // Never pass a locally-generated id — let Postgres assign the UUID.
    // The unique constraint on (date, submitted_by_id) handles upsert correctly.
    const { data: rows, error: rErr } = await supabase
      .from('inventory_reports')
      .upsert({
        date: report.date,
        submitted_by_id: report.submittedById,
        submitted_by_name: report.submittedByName,
        submitted_at: report.submittedAt,
      }, { onConflict: 'date,submitted_by_id' })
      .select()
    if (rErr) throw rErr

    const saved = rows![0] as ReportRow

    // Replace all entries for this report
    await supabase.from('inventory_entries').delete().eq('report_id', saved.id)

    if (report.entries.length > 0) {
      const { error: eErr } = await supabase
        .from('inventory_entries')
        .insert(report.entries.map(e => ({
          report_id: saved.id,
          item_id: e.itemId,
          status: e.status,
          notes: e.notes,
        })))
      if (eErr) throw eErr
    }

    return { ...report, id: saved.id, submittedAt: saved.submitted_at }
  }
}

export const inventoryRepo = new SupabaseInventoryRepository()
