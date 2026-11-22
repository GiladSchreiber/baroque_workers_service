// Supplier documents feature (חשבוניות מס / תעודות משלוח / זיכויים).

export type DocType =
  | 'delivery_note'
  | 'tax_invoice'
  | 'credit_note'
  | 'receipt'
  | 'other'

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  delivery_note: 'תעודת משלוח',
  tax_invoice: 'חשבונית מס',
  credit_note: 'חשבונית זיכוי',
  receipt: 'קבלה',
  other: 'אחר',
}

export const DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as DocType[]

/** Document types where the worker checks off what actually arrived. */
export const CHECKLIST_TYPES: DocType[] = ['delivery_note', 'tax_invoice']

/** Delivery notes are internal only — never sent to the accountant. */
export const isSendableType = (t: DocType) => t !== 'delivery_note'

/** Older rows / extractions may still use the merged-away type
 *  'tax_invoice_receipt' (חשבונית מס/קבלה) — treat it as a tax invoice. */
export function normalizeDocType(t: string | null | undefined): DocType {
  if (t === 'tax_invoice_receipt') return 'tax_invoice'
  return (t && t in DOC_TYPE_LABELS ? t : 'other') as DocType
}

export type ReceivedStatus = 'ok' | 'partial' | 'missing'

export const RECEIVED_LABELS: Record<ReceivedStatus, string> = {
  ok: 'V',
  partial: '~',
  missing: 'X',
}

export interface DocumentLine {
  id?: string
  description: string
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  lineTotal: number | null
  receivedStatus: ReceivedStatus | null
  receivedNote: string
}

export interface SupplierDocument {
  id: string
  docType: DocType
  supplierName: string
  supplierTaxId: string | null
  docNumber: string | null
  docDate: string | null          // YYYY-MM-DD
  totalBeforeVat: number | null
  vatAmount: number | null
  totalWithVat: number | null
  notes: string
  hasIssues: boolean
  filePaths: string[]
  fileTypes: string[]
  filesPurgedAt: string | null
  source: 'worker' | 'manager'
  uploadedById: string | null
  uploadedByName: string | null
  uploadedAt: string
  sentToAccountantAt: string | null
  lines: DocumentLine[]
}

/** Raw JSON returned by the analyze-document edge function. */
export interface ExtractionResult {
  doc_type: DocType | 'tax_invoice_receipt'
  supplier_name: string | null
  supplier_tax_id: string | null
  doc_number: string | null
  doc_date: string | null
  total_before_vat: number | null
  vat_amount: number | null
  total_with_vat: number | null
  lines: {
    description: string
    quantity: number | null
    unit: string | null
    unit_price: number | null
    line_total: number | null
  }[]
}

export interface PendingFile {
  blob: Blob
  mimeType: string
  previewUrl: string
  name: string
}

export type CreateDocumentInput = Omit<
  SupplierDocument,
  'id' | 'filePaths' | 'fileTypes' | 'filesPurgedAt' | 'uploadedAt' | 'sentToAccountantAt' | 'hasIssues'
> & { files: PendingFile[]; extraction: ExtractionResult | null }
