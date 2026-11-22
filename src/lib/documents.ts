// Pure helpers for the supplier documents feature (no browser / Supabase deps).

import {
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
 *  was already sent to the accountant — an unsent document is never lost.
 *  Delivery notes are never sent, so they're purged on age alone. */
export function shouldPurgeFiles(doc: SupplierDocument, cutoff: string): boolean {
  if (doc.filePaths.length === 0) return false
  if (!doc.sentToAccountantAt && doc.docType !== 'delivery_note') return false
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

/** Lines that aren't goods (bottle/crate deposits) — kept for expenses but not
 *  shown in the worker's receiving checklist. */
const NON_GOODS_RE = /פי?קדון|פי?קדונות/

export function isChecklistLine(line: Pick<DocumentLine, 'description'>): boolean {
  return !NON_GOODS_RE.test(line.description)
}

// ── Duplicate detection ───────────────────────────────────────────────────────

/** "00123", "123 " and "12-3" are all the same document number. */
export function normalizeDocNumber(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^0-9a-z֐-׿]/g, '').replace(/^0+(?=.)/, '')
}

/** Strip quotes, punctuation, spaces and company suffixes (בע"מ). */
export function normalizeSupplierName(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/בע["'״׳]?\s?מ/g, '')
    .replace(/[^0-9a-zA-Z֐-׿]/g, '')
    .toLowerCase()
}

export function sameSupplier(
  a: { supplierName: string; supplierTaxId: string | null },
  b: { supplierName: string; supplierTaxId: string | null },
): boolean {
  const ta = (a.supplierTaxId ?? '').replace(/\D/g, '')
  const tb = (b.supplierTaxId ?? '').replace(/\D/g, '')
  if (ta && tb) return ta === tb
  const na = normalizeSupplierName(a.supplierName)
  const nb = normalizeSupplierName(b.supplierName)
  if (!na || !nb) return false
  if (na === nb) return true
  const [short, long] = na.length < nb.length ? [na, nb] : [nb, na]
  return short.length >= 3 && long.includes(short)
}

/** Same type + same document number + same supplier (by ח.פ, or by name). */
export function isSameDocument(
  a: Pick<SupplierDocument, 'docType' | 'docNumber' | 'supplierName' | 'supplierTaxId'>,
  b: Pick<SupplierDocument, 'docType' | 'docNumber' | 'supplierName' | 'supplierTaxId'>,
): boolean {
  if (a.docType !== b.docType) return false
  const na = normalizeDocNumber(a.docNumber)
  if (!na || na !== normalizeDocNumber(b.docNumber)) return false
  return sameSupplier(a, b)
}

// ── Batch upload: grouping pages into documents ──────────────────────────────

function extractionKey(ex: ExtractionResult) {
  return {
    docType: normalizeType(ex.doc_type),
    docNumber: ex.doc_number,
    supplierName: ex.supplier_name ?? '',
    supplierTaxId: ex.supplier_tax_id,
  }
}

function normalizeType(t: ExtractionResult['doc_type']): DocType {
  return t === 'tax_invoice_receipt' ? 'tax_invoice' : t
}

/** Group uploaded images into documents: images whose extraction has the same
 *  type + number + supplier are pages of one document. Images that couldn't be
 *  read (null) or have no number stay on their own. Keeps first-seen order. */
export function groupPages(extractions: (ExtractionResult | null)[]): number[][] {
  const groups: number[][] = []
  extractions.forEach((ex, i) => {
    if (ex && normalizeDocNumber(ex.doc_number)) {
      const g = groups.find(g => {
        const first = extractions[g[0]]
        return first && isSameDocument(extractionKey(first), extractionKey(ex))
      })
      if (g) { g.push(i); return }
    }
    groups.push([i])
  })
  return groups
}

/** Combine the per-page extractions of one document. Header fields come from the
 *  first page that has them; totals from the last page that has them (totals
 *  are printed at the end); line items are concatenated. */
export function mergeExtractions(pages: ExtractionResult[]): ExtractionResult {
  const first = <K extends keyof ExtractionResult>(k: K) => pages.find(p => p[k] != null && p[k] !== '')?.[k] ?? null
  const last = <K extends keyof ExtractionResult>(k: K) => [...pages].reverse().find(p => p[k] != null)?.[k] ?? null
  return {
    doc_type: pages[0].doc_type,
    supplier_name: first('supplier_name') as string | null,
    supplier_tax_id: first('supplier_tax_id') as string | null,
    doc_number: first('doc_number') as string | null,
    doc_date: first('doc_date') as string | null,
    total_before_vat: last('total_before_vat') as number | null,
    vat_amount: last('vat_amount') as number | null,
    total_with_vat: last('total_with_vat') as number | null,
    lines: pages.flatMap(p => p.lines ?? []),
  }
}

/** Document fields from a Gemini extraction (types normalized, amounts positive). */
export function extractionToFields(ex: ExtractionResult) {
  return {
    docType: normalizeType(ex.doc_type),
    supplierName: (ex.supplier_name ?? '').trim(),
    supplierTaxId: ex.supplier_tax_id,
    docNumber: ex.doc_number?.trim() || null,
    docDate: isValidIsoDate(ex.doc_date) ? ex.doc_date : null,
    totalBeforeVat: absOrNull(ex.total_before_vat),
    vatAmount: absOrNull(ex.vat_amount),
    totalWithVat: absOrNull(ex.total_with_vat),
    lines: extractionToLines(ex).map(l => ({
      ...l,
      quantity: absOrNull(l.quantity),
      lineTotal: absOrNull(l.lineTotal),
      unitPrice: absOrNull(l.unitPrice),
    })),
  }
}
