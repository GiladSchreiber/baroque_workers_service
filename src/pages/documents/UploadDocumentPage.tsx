import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuthStore } from '../../store/authStore'
import { documentsRepo } from '../../repositories'
import { prepareFile } from '../../lib/documentFiles'
import {
  absOrNull,
  amountToString,
  extractionToLines,
  isValidIsoDate,
  localIsoDate,
  parseAmount,
} from '../../lib/documents'
import {
  CHECKLIST_TYPES,
  DOC_TYPE_LABELS,
  type DocumentLine,
  type ExtractionResult,
  type PendingFile,
} from '../../types/documents'
import { DocumentFields, type DocFieldValues } from './DocumentFields'
import { ReceivingChecklist } from './ReceivingChecklist'
import styles from './Documents.module.scss'

type Step = 'capture' | 'analyzing' | 'review' | 'done'


const emptyFields = (): DocFieldValues => ({
  docType: 'delivery_note',
  supplierName: '',
  docNumber: '',
  docDate: localIsoDate(),
  totalBeforeVat: '',
  vatAmount: '',
  totalWithVat: '',
})

interface Props {
  /** Manager uploads (e.g. documents received by mail) */
  isManager?: boolean
}

export function UploadDocumentPage({ isManager = false }: Props) {
  const currentUser = useAuthStore(s => s.currentUser)
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('capture')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [fields, setFields] = useState<DocFieldValues>(emptyFields)
  const [lines, setLines] = useState<DocumentLine[]>([])
  const [notes, setNotes] = useState('')
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null)
  const [supplierNames, setSupplierNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [highlightUnset, setHighlightUnset] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    documentsRepo.getSupplierNames().then(setSupplierNames).catch(() => {})
  }, [])

  // Release object URLs when files are dropped / page unmounts
  const filesRef = useRef(files)
  useEffect(() => { filesRef.current = files }, [files])
  useEffect(() => () => filesRef.current.forEach(f => URL.revokeObjectURL(f.previewUrl)), [])

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!list.length) return
    setPreparing(true)
    setError('')
    try {
      const prepared = await Promise.all(list.map(prepareFile))
      setFiles(prev => [...prev, ...prepared])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הקובץ')
    } finally {
      setPreparing(false)
    }
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(files[i].previewUrl)
    setFiles(prev => prev.filter((_, j) => j !== i))
  }

  function applyExtraction(ex: ExtractionResult) {
    const exact = supplierNames.find(n => n.trim() === (ex.supplier_name ?? '').trim())
    setFields({
      docType: ex.doc_type ?? 'other',
      supplierName: exact ?? ex.supplier_name ?? '',
      docNumber: ex.doc_number ?? '',
      docDate: isValidIsoDate(ex.doc_date) ? ex.doc_date : localIsoDate(),
      totalBeforeVat: amountToString(absOrNull(ex.total_before_vat)),
      vatAmount: amountToString(absOrNull(ex.vat_amount)),
      totalWithVat: amountToString(absOrNull(ex.total_with_vat)),
    })
    setLines(extractionToLines(ex).map(l => ({
      ...l,
      quantity: absOrNull(l.quantity),
      lineTotal: absOrNull(l.lineTotal),
      unitPrice: absOrNull(l.unitPrice),
    })))
  }

  async function handleAnalyze() {
    if (!files.length) return
    setStep('analyzing')
    setError('')
    try {
      const ex = await documentsRepo.analyze(files)
      setExtraction(ex)
      applyExtraction(ex)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'זיהוי המסמך נכשל')
      setStep('capture')
    }
  }

  function handleManualEntry() {
    setExtraction(null)
    setFields(emptyFields())
    setLines([])
    setError('')
    setStep('review')
  }

  const needsChecklist = CHECKLIST_TYPES.includes(fields.docType) && lines.length > 0

  async function handleSave(skipDuplicateCheck = false) {
    setError('')
    if (fields.docType !== 'other' && !fields.supplierName.trim()) {
      setError('יש להזין שם ספק')
      return
    }
    if (needsChecklist && lines.some(l => !l.receivedStatus)) {
      setHighlightUnset(true)
      setError('יש לסמן לכל פריט אם הגיע')
      return
    }
    setSaving(true)
    try {
      if (!skipDuplicateCheck && fields.docNumber.trim() && fields.supplierName.trim()) {
        const dup = await documentsRepo.findDuplicate(fields.supplierName, fields.docNumber, fields.docType)
        if (dup) {
          setDuplicateWarning(
            `${DOC_TYPE_LABELS[dup.docType]} מס' ${dup.docNumber} של ${dup.supplierName} כבר הועלתה` +
            (dup.uploadedByName ? ` על ידי ${dup.uploadedByName}` : '') + '.',
          )
          setSaving(false)
          return
        }
      }
      await documentsRepo.create({
        docType: fields.docType,
        supplierName: fields.supplierName,
        supplierTaxId: extraction?.supplier_tax_id ?? null,
        docNumber: fields.docNumber || null,
        docDate: isValidIsoDate(fields.docDate) ? fields.docDate : null,
        totalBeforeVat: parseAmount(fields.totalBeforeVat),
        vatAmount: parseAmount(fields.vatAmount),
        totalWithVat: parseAmount(fields.totalWithVat),
        notes: notes.trim(),
        source: isManager ? 'manager' : 'worker',
        uploadedById: currentUser?.id ?? null,
        uploadedByName: currentUser?.name ?? null,
        lines: CHECKLIST_TYPES.includes(fields.docType)
          ? lines
          : lines.map(l => ({ ...l, receivedStatus: null, receivedNote: '' })),
        files,
        extraction,
      })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    files.forEach(f => URL.revokeObjectURL(f.previewUrl))
    setFiles([])
    setFields(emptyFields())
    setLines([])
    setNotes('')
    setExtraction(null)
    setHighlightUnset(false)
    setError('')
    setStep('capture')
  }

  return (
    <div className={styles.page}>
      <PageHeader title={isManager ? 'העלאת מסמך' : 'קבלת סחורה / מסמך'} showBack={isManager} />

      <div className={styles.body}>
        {step === 'capture' && (
          <>
            <p className={styles.muted}>
              צלמו את החשבונית / תעודת המשלוח. מסמך עם כמה עמודים — הוסיפו תמונה לכל עמוד.
            </p>
            <div className={styles.captureBtns}>
              <button className={styles.captureBtn} onClick={() => cameraRef.current?.click()} disabled={preparing}>
                <span>📷</span><span>צילום</span>
              </button>
              <button className={styles.captureBtn} onClick={() => fileRef.current?.click()} disabled={preparing}>
                <span>📎</span><span>{isManager ? 'קובץ / PDF' : 'מהגלריה'}</span>
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={handleFiles} />

            {files.length > 0 && (
              <div className={styles.thumbs}>
                {files.map((f, i) => (
                  <div key={f.previewUrl} className={styles.thumb}>
                    {f.mimeType === 'application/pdf' ? <span>PDF</span> : <img src={f.previewUrl} alt={`עמוד ${i + 1}`} />}
                    <button className={styles.thumbRemove} onClick={() => removeFile(i)} aria-label="הסר">✕</button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <Button fullWidth onClick={handleAnalyze} disabled={!files.length || preparing}>
              המשך — זיהוי המסמך
            </Button>
            {error && files.length > 0 && (
              <Button fullWidth variant="ghost" onClick={handleManualEntry}>מילוי ידני</Button>
            )}
          </>
        )}

        {step === 'analyzing' && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>מזהה את המסמך…</p>
            <p className={styles.muted}>זה לוקח כמה שניות.</p>
          </div>
        )}

        {step === 'review' && (
          <>
            <div className={styles.card}>
              <p className={styles.cardTitle}>פרטי המסמך</p>
              <p className={styles.muted}>בדקו שהפרטים נכונים ותקנו במידת הצורך.</p>
              <DocumentFields
                values={fields}
                onChange={setFields}
                supplierNames={supplierNames}
                showAmounts={isManager || fields.docType !== 'delivery_note'}
              />
            </div>

            {needsChecklist && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>מה הגיע? ({lines.length} פריטים)</p>
                <ReceivingChecklist lines={lines} onChange={setLines} highlightUnset={highlightUnset} />
              </div>
            )}

            {CHECKLIST_TYPES.includes(fields.docType) && lines.length === 0 && (
              <p className={styles.muted}>לא זוהו פריטים במסמך — אם משהו חסר, כתבו בהערות.</p>
            )}

            <Textarea
              label="הערות (אופציונלי)"
              id="doc-notes"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="למשל: הארגז של העגבניות הגיע פתוח"
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <Button onClick={() => handleSave()} isLoading={saving}>שמירה</Button>
              <Button variant="ghost" onClick={() => setStep('capture')} disabled={saving}>חזרה</Button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className={styles.card}>
            <p className={styles.success}>✓ המסמך נשמר</p>
            <div className={styles.actions}>
              <Button onClick={reset}>מסמך נוסף</Button>
              {isManager && <Button variant="ghost" onClick={() => navigate('/manager/documents')}>לרשימת המסמכים</Button>}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={duplicateWarning !== null}
        title="המסמך כבר קיים"
        message={duplicateWarning ? duplicateWarning + ' לשמור בכל זאת?' : undefined}
        confirmLabel="שמור בכל זאת"
        cancelLabel="ביטול"
        variant="primary"
        onConfirm={() => { setDuplicateWarning(null); handleSave(true) }}
        onCancel={() => setDuplicateWarning(null)}
      />
    </div>
  )
}
