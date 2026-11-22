import { describe, it, expect } from 'vitest'
import {
  docTotals,
  expensesBySupplier,
  expensesByItem,
  retentionCutoff,
  shouldPurgeFiles,
  computeHasIssues,
  shiftMonth,
  isChecklistLine,
} from './documents'
import type { SupplierDocument } from '../types/documents'

let seq = 0
function doc(o: Partial<SupplierDocument>): SupplierDocument {
  return {
    id: `d${++seq}`,
    docType: 'tax_invoice',
    supplierName: 'תנובה',
    supplierTaxId: null,
    docNumber: null,
    docDate: '2026-11-05',
    totalBeforeVat: 100,
    vatAmount: 18,
    totalWithVat: 118,
    notes: '',
    hasIssues: false,
    filePaths: ['a.jpg'],
    fileTypes: ['image/jpeg'],
    filesPurgedAt: null,
    source: 'worker',
    uploadedById: null,
    uploadedByName: null,
    uploadedAt: '2026-11-05T10:00:00Z',
    sentToAccountantAt: null,
    lines: [],
    ...o,
  }
}

describe('docTotals', () => {
  it('fills before-VAT from total and VAT', () => {
    expect(docTotals({ totalBeforeVat: null, vatAmount: 18, totalWithVat: 118 })).toEqual({ beforeVat: 100, withVat: 118 })
  })
  it('falls back to default VAT rate', () => {
    expect(docTotals({ totalBeforeVat: 100, vatAmount: null, totalWithVat: null })).toEqual({ beforeVat: 100, withVat: 118 })
  })
})

describe('expensesBySupplier', () => {
  it('sums invoices, subtracts credit notes, ignores delivery notes and other months', () => {
    const rows = expensesBySupplier([
      doc({}),
      doc({ docType: 'tax_invoice_receipt' }),
      doc({ docType: 'credit_note', totalBeforeVat: 10, vatAmount: 1.8, totalWithVat: 11.8 }),
      doc({ docType: 'delivery_note' }),
      doc({ docDate: '2026-10-30' }),
    ], '2026-11')
    expect(rows).toEqual([{ supplier: 'תנובה', beforeVat: 190, withVat: 224.2, count: 3 }])
  })
})

describe('expensesByItem', () => {
  it('groups lines by normalized name and scales VAT by the document ratio', () => {
    const lines = [
      { description: 'חלב  3%', quantity: 2, unit: 'יח', unitPrice: 5, lineTotal: 10, receivedStatus: null, receivedNote: '' },
      { description: 'חלב 3%', quantity: 3, unit: 'יח', unitPrice: 5, lineTotal: 15, receivedStatus: null, receivedNote: '' },
    ]
    const rows = expensesByItem([doc({ lines })], '2026-11')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ description: 'חלב 3%', quantity: 5, beforeVat: 25, withVat: 29.5 })
  })
})

describe('retention', () => {
  it('cutoff is the first of the previous month', () => {
    expect(retentionCutoff(new Date(2026, 0, 15))).toBe('2025-12-01')
    expect(retentionCutoff(new Date(2026, 10, 22))).toBe('2026-10-01')
  })
  it('purges only old documents that were already sent', () => {
    const cutoff = '2026-10-01'
    expect(shouldPurgeFiles(doc({ docDate: '2026-09-30', sentToAccountantAt: 'x' }), cutoff)).toBe(true)
    expect(shouldPurgeFiles(doc({ docDate: '2026-09-30' }), cutoff)).toBe(false)
    expect(shouldPurgeFiles(doc({ docDate: '2026-10-01', sentToAccountantAt: 'x' }), cutoff)).toBe(false)
  })
})

describe('misc', () => {
  it('computeHasIssues', () => {
    expect(computeHasIssues([{ receivedStatus: 'ok' }, { receivedStatus: null }])).toBe(false)
    expect(computeHasIssues([{ receivedStatus: 'partial' }])).toBe(true)
  })
  it('shiftMonth wraps years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})

describe('isChecklistLine', () => {
  it('hides deposit lines from the checklist', () => {
    expect(isChecklistLine({ description: 'פיקדון בקבוקים' })).toBe(false)
    expect(isChecklistLine({ description: 'פקדון ארגז' })).toBe(false)
    expect(isChecklistLine({ description: 'חלב 3%' })).toBe(true)
  })
})
