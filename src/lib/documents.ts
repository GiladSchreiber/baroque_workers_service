// Pure helpers for the supplier documents feature (no browser / Supabase deps).

import {
  DOC_TYPE_LABELS,
  type DocType,
  type DocumentLine,
  type ExtractionResult,
  type SupplierDocument,
} from '../types/documents'

export const DEFAULT_VAT_RATE = 0.18

/** Types that represent an actual expense. Delivery notes and plain receipts are
 *  excluded so the same goods aren't counted twice. Credit notes subtract. */
const EXPENSE_SIGN: Partial<Record<DocType, 1 | -1>> = {
  tax_invoice: 1,
  tax_invoice_receipt: 1,
  credit_note: -1,
}

export function isExpenseDoc(doc: Pick<SupplierDocument, 'docType'>): boolean {
  return EXPENSE_SIGN[doc.docType] !== undefined
}

export function docMonth(doc: Pick<SupplierDocument, 'docDate' | 'uploadedAt'>): string {
  return (doc.docDate ?? doc.uploadedAt.slice(0, 10)).slice(0, 7)
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Before/with-VAT totals of a document, filling a missing value from the others. */
export function docTotals(
  doc: Pick<SupplierDocument, 'totalBeforeVat' | 'vatAmount' | 'totalWithVat'>,
): { beforeVat: number | null; withVat: number | null } {
  const { totalBeforeVat: before, vatAmount: vat, totalWithVat: withVat } = doc
  if (before != null && withVat != null) return { beforeVat: before, withVat }
  if (before != null) return { beforeVat: before, withVat: round2(before + (vat ?? before * DEFAULT_VAT_RATE)) }
  if (withVat != null) {
    return { beforeVat: round2(vat != null ? withVat - vat : withVat / (1 + DEFAULT_VAT_RATE)), withVat }
  }
  return { beforeVat: null, withVat: null }
}

export interface SupplierExpense {
  supplier: string
  beforeVat: number
  withVat: number
  count: number
}

export function expensesBySupplier(docs: SupplierDocument[], month: string): SupplierExpense[] {
  const map = new Map<string, SupplierExpense>()
  for (const doc of docs) {
    const sign = EXPENSE_SIGN[doc.docType]
    if (!sign || docMonth(doc) !== month) continue
    const t = docTotals(doc)
    const key = doc.supplierName.trim() || 'ללא ספק'
    const row = map.get(key) ?? { supplier: key, beforeVat: 0, withVat: 0, count: 0 }
    row.beforeVat = round2(row.beforeVat + sign * (t.beforeVat ?? 0))
    row.withVat = round2(row.withVat + sign * (t.withVat ?? 0))
    row.count += 1
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.withVat - a.withVat)
}

export interface ItemExpense {
  supplier: string
  description: string
  unit: string | null
  quantity: number
  beforeVat: number
  withVat: number
}

export function normalizeItemName(s: string): string {
  return s.replace(/["'״׳]/g, '').replace(/\s+/g, ' ').trim()
}

export function expensesByItem(
  docs: SupplierDocument[],
  month: string,
  supplier?: string,
): ItemExpense[] {
  const map = new Map<string, ItemExpense>()
  for (const doc of docs) {
    const sign = EXPENSE_SIGN[doc.docType]
    if (!sign || docMonth(doc) !== month) continue
    const supplierName = doc.supplierName.trim() || 'ללא ספק'
    if (supplier && supplierName !== supplier) continue
    const t = docTotals(doc)
    const ratio = t.beforeVat && t.withVat ? t.withVat / t.beforeVat : 1 + DEFAULT_VAT_RATE
    for (const line of doc.lines) {
      const name = normalizeItemName(line.description)
      if (!name) continue
      const key = `${supplierName}|${name}`
      const row = map.get(key) ?? {
        supplier: supplierName, description: name, unit: line.unit, quantity: 0, beforeVat: 0, withVat: 0,
      }
      row.quantity = round2(row.quantity + sign * (line.quantity ?? 0))
      row.beforeVat = round2(row.beforeVat + sign * (line.lineTotal ?? 0))
      row.withVat = round2(row.withVat + sign * (line.lineTotal ?? 0) * ratio)
      map.set(key, row)
    }
  }
  return [...map.values()].sort((a, b) => b.withVat - a.withVat)
}

export function computeHasIssues(lines: Pick<DocumentLine, 'receivedStatus'>[]): boolean {
  return lines.some(l => l.receivedStatus === 'partial' || l.receivedStatus === 'missing')
}

/** First day (YYYY-MM-DD) of the month before `today`. Files of documents dated
 *  earlier than this are deleted; only their numbers are kept. */
export function retentionCutoff(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Files are purged only once the document is older than the retention window AND
 *  was already sent to the accountant — an unsent document is never lost. */
export function shouldPurgeFiles(doc: SupplierDocument, cutoff: string): boolean {
  if (doc.filePaths.length === 0) return false
  if (!doc.sentToAccountantAt) return false
  return docMonth(doc) + '-01' < cutoff
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return '₪' + n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function formatDocDate(d: string | null): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y.slice(2)}`
}

export function buildShareText(docs: SupplierDocument[]): string {
  const rows = docs.map(d => {
    const t = docTotals(d)
    const parts = [
      DOC_TYPE_LABELS[d.docType],
      d.supplierName || 'ללא ספק',
      d.docNumber ? `מס' ${d.docNumber}` : null,
      formatDocDate(d.docDate),
      t.withVat != null ? formatMoney(t.withVat) : null,
    ].filter(Boolean)
    return '• ' + parts.join(' | ')
  })
  return [`מסמכים (${docs.length}):`, ...rows].join('\n')
}

/** Strip junk from Gemini output and convert to app types. */
export function extractionToLines(ex: ExtractionResult): DocumentLine[] {
  return (ex.lines ?? [])
    .filter(l => l.description?.trim())
    .map(l => ({
      description: l.description.trim(),
      quantity: l.quantity ?? null,
      unit: l.unit ?? null,
      unitPrice: l.unit_price ?? null,
      lineTotal: l.line_total ?? null,
      receivedStatus: null,
      receivedNote: '',
    }))
}

export function isValidIsoDate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

/** Absolute value for amounts (Gemini sometimes returns credit notes as negatives). */
export function absOrNull(n: number | null | undefined): number | null {
  return n == null || Number.isNaN(n) ? null : Math.abs(n)
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
export function formatMonthHe(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${HE_MONTHS[m - 1]} ${y}`
}

export function parseAmount(s: string): number | null {
  const n = parseFloat(s.replace(/[,₪\s]/g, ''))
  return Number.isFinite(n) ? Math.abs(n) : null
}

export const amountToString = (n: number | null | undefined) => (n == null ? '' : String(n))

/** Local (not UTC) date as YYYY-MM-DD. */
export function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
