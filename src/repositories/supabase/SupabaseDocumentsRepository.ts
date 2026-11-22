import { supabase } from '../../lib/supabase'
import { blobToBase64, extensionFor } from '../../lib/documentFiles'
import { computeHasIssues, extractionToFields, isSameDocument, localIsoDate, normalizeDocNumber } from '../../lib/documents'
import { normalizeDocType } from '../../types/documents'
import type {
  CreateDocumentInput,
  DocumentLine,
  ExtractionResult,
  PendingFile,
  SupplierDocument,
} from '../../types/documents'

const BUCKET = 'documents'

interface LineRow {
  id: string
  document_id: string
  sort_order: number
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  line_total: number | null
  received_status: DocumentLine['receivedStatus']
  received_note: string
}

interface DocRow {
  id: string
  doc_type: SupplierDocument['docType']
  supplier_name: string
  supplier_tax_id: string | null
  doc_number: string | null
  doc_date: string | null
  total_before_vat: number | null
  vat_amount: number | null
  total_with_vat: number | null
  notes: string
  has_issues: boolean
  file_paths: string[]
  file_types: string[]
  files_purged_at: string | null
  source: SupplierDocument['source']
  uploaded_by_id: string | null
  uploaded_by_name: string | null
  uploaded_at: string
  sent_to_accountant_at: string | null
  document_lines?: LineRow[]
}

const num = (v: unknown): number | null => (v == null ? null : Number(v))

function rowToDoc(row: DocRow): SupplierDocument {
  return {
    id: row.id,
    docType: normalizeDocType(row.doc_type),
    supplierName: row.supplier_name,
    supplierTaxId: row.supplier_tax_id,
    docNumber: row.doc_number,
    docDate: row.doc_date,
    totalBeforeVat: num(row.total_before_vat),
    vatAmount: num(row.vat_amount),
    totalWithVat: num(row.total_with_vat),
    notes: row.notes,
    hasIssues: row.has_issues,
    filePaths: row.file_paths ?? [],
    fileTypes: row.file_types ?? [],
    filesPurgedAt: row.files_purged_at,
    source: row.source,
    uploadedById: row.uploaded_by_id,
    uploadedByName: row.uploaded_by_name,
    uploadedAt: row.uploaded_at,
    sentToAccountantAt: row.sent_to_accountant_at,
    lines: [...(row.document_lines ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(l => ({
        id: l.id,
        description: l.description,
        quantity: num(l.quantity),
        unit: l.unit,
        unitPrice: num(l.unit_price),
        lineTotal: num(l.line_total),
        receivedStatus: l.received_status,
        receivedNote: l.received_note,
      })),
  }
}

function linesToRows(documentId: string, lines: DocumentLine[]) {
  return lines.map((l, i) => ({
    document_id: documentId,
    sort_order: i,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unit_price: l.unitPrice,
    line_total: l.lineTotal,
    received_status: l.receivedStatus,
    received_note: l.receivedNote,
  }))
}

export type DocumentPatch = Partial<Pick<SupplierDocument,
  'docType' | 'supplierName' | 'docNumber' | 'docDate' | 'totalBeforeVat' | 'vatAmount' | 'totalWithVat' | 'notes'
>>

export class SupabaseDocumentsRepository {
  /** Run the Gemini extraction (edge function `analyze-document`). */
  async analyze(files: Pick<PendingFile, 'blob' | 'mimeType'>[]): Promise<ExtractionResult> {
    const payload = await Promise.all(
      files.map(async f => ({ mimeType: f.mimeType, data: await blobToBase64(f.blob) })),
    )
    const { data, error } = await supabase.functions.invoke('analyze-document', { body: { files: payload } })
    if (error) throw new Error('זיהוי המסמך נכשל')
    if (data?.error) throw new Error('זיהוי המסמך נכשל: ' + data.error)
    return data as ExtractionResult
  }

  async getAll(): Promise<SupplierDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*, document_lines(*)')
      .order('doc_date', { ascending: false, nullsFirst: false })
      .order('uploaded_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as DocRow[]).map(rowToDoc)
  }

  async getById(id: string): Promise<SupplierDocument | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*, document_lines(*)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToDoc(data as DocRow) : null
  }

  async getSupplierNames(): Promise<string[]> {
    const { data, error } = await supabase.from('documents').select('supplier_name')
    if (error) throw new Error(error.message)
    const names = new Set((data as { supplier_name: string }[]).map(r => r.supplier_name).filter(Boolean))
    return [...names].sort((a, b) => a.localeCompare(b, 'he'))
  }

  /** Find an already-uploaded copy of this document (same type, number and supplier). */
  async findDuplicate(
    candidate: Pick<SupplierDocument, 'docType' | 'docNumber' | 'supplierName' | 'supplierTaxId'>,
    excludeId?: string,
  ): Promise<SupplierDocument | null> {
    if (!normalizeDocNumber(candidate.docNumber)) return null
    const types = candidate.docType === 'tax_invoice' ? ['tax_invoice', 'tax_invoice_receipt'] : [candidate.docType]
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .in('doc_type', types)
      .not('doc_number', 'is', null)
    if (error) throw new Error(error.message)
    const match = (data as DocRow[]).map(rowToDoc).find(d => d.id !== excludeId && isSameDocument(candidate, d))
    return match ?? null
  }

  async create(input: CreateDocumentInput): Promise<SupplierDocument> {
    const docId = crypto.randomUUID()
    const month = (input.docDate ?? localIsoDate()).slice(0, 7)

    const paths: string[] = []
    try {
      for (const [i, f] of input.files.entries()) {
        const path = `${month}/${docId}/${i + 1}.${extensionFor(f.mimeType)}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, f.blob, { contentType: f.mimeType })
        if (error) throw new Error('העלאת הקובץ נכשלה: ' + error.message)
        paths.push(path)
      }

      const { error } = await supabase.from('documents').insert({
        id: docId,
        doc_type: input.docType,
        supplier_name: input.supplierName.trim(),
        supplier_tax_id: input.supplierTaxId,
        doc_number: input.docNumber?.trim() || null,
        doc_date: input.docDate,
        total_before_vat: input.totalBeforeVat,
        vat_amount: input.vatAmount,
        total_with_vat: input.totalWithVat,
        notes: input.notes,
        has_issues: computeHasIssues(input.lines),
        file_paths: paths,
        file_types: input.files.map(f => f.mimeType),
        source: input.source,
        uploaded_by_id: input.uploadedById,
        uploaded_by_name: input.uploadedByName,
        extraction: input.extraction,
      })
      if (error) throw new Error(error.message)

      if (input.lines.length) {
        const { error: lineErr } = await supabase.from('document_lines').insert(linesToRows(docId, input.lines))
        if (lineErr) {
          await supabase.from('documents').delete().eq('id', docId)
          throw new Error(lineErr.message)
        }
      }
    } catch (err) {
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
      throw err
    }

    const created = await this.getById(docId)
    if (!created) throw new Error('שמירת המסמך נכשלה')
    return created
  }

  async update(id: string, patch: DocumentPatch): Promise<void> {
    const row: Record<string, unknown> = {}
    if (patch.docType !== undefined) row.doc_type = patch.docType
    if (patch.supplierName !== undefined) row.supplier_name = patch.supplierName.trim()
    if (patch.docNumber !== undefined) row.doc_number = patch.docNumber?.trim() || null
    if (patch.docDate !== undefined) row.doc_date = patch.docDate
    if (patch.totalBeforeVat !== undefined) row.total_before_vat = patch.totalBeforeVat
    if (patch.vatAmount !== undefined) row.vat_amount = patch.vatAmount
    if (patch.totalWithVat !== undefined) row.total_with_vat = patch.totalWithVat
    if (patch.notes !== undefined) row.notes = patch.notes
    const { error } = await supabase.from('documents').update(row).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async setSent(ids: string[], sent: boolean): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ sent_to_accountant_at: sent ? new Date().toISOString() : null })
      .in('id', ids)
    if (error) throw new Error(error.message)
  }

  async delete(doc: SupplierDocument): Promise<void> {
    if (doc.filePaths.length) await supabase.storage.from(BUCKET).remove(doc.filePaths)
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) throw new Error(error.message)
  }

  /** Delete the stored files but keep the document's numbers and lines. */
  async purgeFiles(docs: SupplierDocument[]): Promise<void> {
    for (const doc of docs) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(doc.filePaths)
      if (rmErr) continue
      await supabase
        .from('documents')
        .update({ file_paths: [], files_purged_at: new Date().toISOString() })
        .eq('id', doc.id)
    }
  }

  async getSignedUrls(paths: string[]): Promise<string[]> {
    if (!paths.length) return []
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60)
    if (error) throw new Error(error.message)
    return data.map(d => d.signedUrl ?? '')
  }

  async downloadFiles(doc: SupplierDocument, baseName: string): Promise<File[]> {
    const files: File[] = []
    for (const [i, path] of doc.filePaths.entries()) {
      const { data, error } = await supabase.storage.from(BUCKET).download(path)
      if (error || !data) throw new Error('הורדת הקובץ נכשלה')
      const type = doc.fileTypes[i] ?? data.type
      const suffix = doc.filePaths.length > 1 ? `_${i + 1}` : ''
      files.push(new File([data], `${baseName}${suffix}.${extensionFor(type)}`, { type }))
    }
    return files
  }

  /** Read an 'unread' document again with Gemini and fill in its details.
   *  Throws if Gemini is still unavailable (the document stays unread). */
  async reanalyze(doc: SupplierDocument): Promise<SupplierDocument> {
    const files = await this.downloadFiles(doc, 'page')
    const ex = await this.analyze(files.map(f => ({ blob: f, mimeType: f.type })))
    const f = extractionToFields(ex)
    const { error } = await supabase.from('documents').update({
      doc_type: f.docType,
      supplier_name: f.supplierName,
      supplier_tax_id: f.supplierTaxId,
      doc_number: f.docNumber,
      doc_date: f.docDate ?? doc.docDate ?? doc.uploadedAt.slice(0, 10),
      total_before_vat: f.totalBeforeVat,
      vat_amount: f.vatAmount,
      total_with_vat: f.totalWithVat,
      extraction: ex,
    }).eq('id', doc.id)
    if (error) throw new Error(error.message)
    await supabase.from('document_lines').delete().eq('document_id', doc.id)
    if (f.lines.length) {
      const { error: lineErr } = await supabase.from('document_lines').insert(linesToRows(doc.id, f.lines))
      if (lineErr) throw new Error(lineErr.message)
    }
    const updated = await this.getById(doc.id)
    if (!updated) throw new Error('המסמך לא נמצא')
    return updated
  }
}
