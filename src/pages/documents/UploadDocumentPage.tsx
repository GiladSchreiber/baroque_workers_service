import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { useAuthStore } from '../../store/authStore'
import { documentsRepo } from '../../repositories'
import { prepareFile } from '../../lib/documentFiles'
import {
  absOrNull,
  amountToString,
  extractionToLines,
  groupPages,
  isChecklistLine,
  isValidIsoDate,
  localIsoDate,
  mergeExtractions,
  parseAmount,
} from '../../lib/documents'
import {
  CHECKLIST_TYPES,
  DOC_TYPE_LABELS,
  normalizeDocType,
  type DocumentLine,
  type ExtractionResult,
  type PendingFile,
  type SupplierDocument,
} from '../../types/documents'
import { DocumentFields, type DocFieldValues } from './DocumentFields'
import { ReceivingChecklist } from './ReceivingChecklist'
import styles from './Documents.module.scss'

type Step = 'capture' | 'analyzing' | 'review' | 'done'

/** One document in the batch (may span several images). */
interface Draft {
  key: string
  files: PendingFile[]
  extraction: ExtractionResult | null
  fields: DocFieldValues
  lines: DocumentLine[]
  notes: string
  duplicate: SupplierDocument | null
  highlightUnset: boolean
  saved: boolean
}

/** Images are sent to Gemini one at a time — on the free tier, parallel requests
 *  slow each other down until they time out. */
const ANALYZE_CONCURRENCY = 1

const emptyFields = (): DocFieldValues => ({
  docType: 'delivery_note',
  supplierName: '',
  docNumber: '',
  docDate: localIsoDate(),
  totalBeforeVat: '',
  vatAmount: '',
  totalWithVat: '',
})

function draftFromExtraction(files: PendingFile[], ex: ExtractionResult | null, supplierNames: string[]): Draft {
  const base: Draft = {
    key: files[0].previewUrl,
    files,
    extraction: ex,
    fields: emptyFields(),
    lines: [],
    notes: '',
    duplicate: null,
    highlightUnset: false,
    saved: false,
  }
  if (!ex) return base
  const exact = supplierNames.find(n => n.trim() === (ex.supplier_name ?? '').trim())
  return {
    ...base,
    fields: {
      docType: normalizeDocType(ex.doc_type),
      supplierName: exact ?? ex.supplier_name ?? '',
      docNumber: ex.doc_number ?? '',
      docDate: isValidIsoDate(ex.doc_date) ? ex.doc_date : localIsoDate(),
      totalBeforeVat: amountToString(absOrNull(ex.total_before_vat)),
      vatAmount: amountToString(absOrNull(ex.vat_amount)),
      totalWithVat: amountToString(absOrNull(ex.total_with_vat)),
    },
    lines: extractionToLines(ex).map(l => ({
      ...l,
      quantity: absOrNull(l.quantity),
      lineTotal: absOrNull(l.lineTotal),
      unitPrice: absOrNull(l.unitPrice),
    })),
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>, onDone: () => void): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
      onDone()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

interface Props {
  /** Manager uploads (e.g. documents received by mail) */
  isManager?: boolean
}

export function UploadDocumentPage({ isManager = false }: Props) {
  const currentUser = useAuthStore(s => s.currentUser)
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('capture')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [supplierNames, setSupplierNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    documentsRepo.getSupplierNames().then(setSupplierNames).catch(() => {})
  }, [])

  // Release object URLs when the page unmounts
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

  // Each image is read on its own; images with the same type + number + supplier
  // are then merged into one multi-page document.
  async function handleAnalyze() {
    if (!files.length) return
    setStep('analyzing')
    setProgress(0)
    setError('')
    const failReasons: string[] = []
    const tryAnalyze = (i: number) =>
      documentsRepo.analyze([files[i]]).catch(err => {
        failReasons[i] = err instanceof Error ? err.message : String(err)
        return null
      })
    const extractions = await mapWithConcurrency(
      files.map((_, i) => i),
      ANALYZE_CONCURRENCY,
      tryAnalyze,
      () => setProgress(p => p + 1),
    )
    // Give the ones that failed one more chance before they go to 'לא נקרא'.
    // Gemini's "busy" (503) spikes are short, so wait a few seconds first.
    if (extractions.some(e => !e)) await new Promise(r => setTimeout(r, 5000))
    for (const [i, ex] of extractions.entries()) {
      if (!ex) extractions[i] = await tryAnalyze(i)
    }
    // Images Gemini couldn't read are saved as 'לא נקרא' — the manager retries later.
    const okIdx: number[] = []
    const manual: Draft[] = []
    let unread = 0
    for (const [i, ex] of extractions.entries()) {
      if (ex) { okIdx.push(i); continue }
      try {
        await documentsRepo.create({
          docType: 'unread',
          supplierName: '',
          supplierTaxId: null,
          docNumber: null,
          docDate: localIsoDate(),
          totalBeforeVat: null,
          vatAmount: null,
          totalWithVat: null,
          notes: `לא נקרא: ${failReasons[i] ?? 'שגיאה לא ידועה'}`,
          source: isManager ? 'manager' : 'worker',
          uploadedById: currentUser?.id ?? null,
          uploadedByName: currentUser?.name ?? null,
          lines: [],
          files: [files[i]],
          extraction: null,
        })
        unread++
      } catch {
        // Couldn't even save (e.g. offline) — fall back to filling it in by hand
        manual.push(draftFromExtraction([files[i]], null, supplierNames))
      }
    }
    setUnreadCount(unread)

    const groups = groupPages(okIdx.map(i => extractions[i])).map(g => g.map(j => okIdx[j]))
    const read = await Promise.all(groups.map(async idxs => {
      const pageEx = idxs.map(i => extractions[i]).filter((e): e is ExtractionResult => e !== null)
      const ex = mergeExtractions(pageEx)
      const draft = draftFromExtraction(idxs.map(i => files[i]), ex, supplierNames)
      draft.duplicate = await documentsRepo.findDuplicate({
        docType: draft.fields.docType,
        docNumber: draft.fields.docNumber,
        supplierName: draft.fields.supplierName,
        supplierTaxId: ex.supplier_tax_id,
      }).catch(() => null)
      return draft
    }))
    const built = [...read, ...manual]
    if (!built.length) {
      setDrafts([])
      setStep('done')
      return
    }
    setDrafts(built)
    setCurrent(0)
    setStep('review')
  }

  const draft = drafts[current] as Draft | undefined

  function updateDraft(patch: Partial<Draft>) {
    setDrafts(prev => prev.map((d, i) => (i === current ? { ...d, ...patch } : d)))
  }

  function handleFieldsChange(next: DocFieldValues) {
    if (!draft) return
    const f = draft.fields
    const identityChanged = next.docType !== f.docType || next.docNumber !== f.docNumber || next.supplierName !== f.supplierName
    updateDraft({ fields: next, ...(identityChanged ? { duplicate: null } : {}) })
  }

  function goTo(i: number) {
    setError('')
    setCurrent(i)
    window.scrollTo({ top: 0 })
  }

  function removeCurrent() {
    const remaining = drafts.filter((_, i) => i !== current)
    setDrafts(remaining)
    if (!remaining.length) { reset(); return }
    if (remaining.every(d => d.saved)) { setStep('done'); return }
    setCurrent(Math.min(current, remaining.length - 1))
  }

  const checklistCount = draft ? draft.lines.filter(isChecklistLine).length : 0
  const needsChecklist = !!draft && CHECKLIST_TYPES.includes(draft.fields.docType) && checklistCount > 0

  async function handleSave() {
    if (!draft) return
    const { fields, lines, extraction } = draft
    setError('')
    if (fields.docType !== 'other' && !fields.supplierName.trim()) {
      setError('יש להזין שם ספק')
      return
    }
    if (needsChecklist && lines.some(l => isChecklistLine(l) && !l.receivedStatus)) {
      updateDraft({ highlightUnset: true })
      setError('יש לסמן לכל פריט אם הגיע')
      return
    }
    setSaving(true)
    try {
      const dup = await documentsRepo.findDuplicate({
        docType: fields.docType,
        docNumber: fields.docNumber,
        supplierName: fields.supplierName,
        supplierTaxId: extraction?.supplier_tax_id ?? null,
      })
      if (dup) {
        updateDraft({ duplicate: dup })
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
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
        notes: draft.notes.trim(),
        source: isManager ? 'manager' : 'worker',
        uploadedById: currentUser?.id ?? null,
        uploadedByName: currentUser?.name ?? null,
        lines: CHECKLIST_TYPES.includes(fields.docType)
          ? lines
          : lines.map(l => ({ ...l, receivedStatus: null, receivedNote: '' })),
        files: draft.files,
        extraction,
      })
      const next = drafts.map((d, i) => (i === current ? { ...d, saved: true } : d))
      setDrafts(next)
      // Move on to the next unsaved document (after this one, then wrap around)
      const order = [...next.keys()].slice(current + 1).concat([...next.keys()].slice(0, current))
      const nextIdx = order.find(i => !next[i].saved)
      if (nextIdx === undefined) setStep('done')
      else goTo(nextIdx)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    files.forEach(f => URL.revokeObjectURL(f.previewUrl))
    setFiles([])
    setDrafts([])
    setCurrent(0)
    setUnreadCount(0)
    setError('')
    setStep('capture')
  }

  const savedCount = drafts.filter(d => d.saved).length

  return (
    <div className={styles.page}>
      <PageHeader title={isManager ? 'העלאת מסמכים' : 'קבלת סחורה / מסמכים'} showBack={isManager} />

      <div className={styles.body}>
        {step === 'capture' && (
          <>
            <p className={styles.muted}>
              צלמו או בחרו את כל המסמכים — אפשר כמה מסמכים ביחד. מסמך עם כמה עמודים — צלמו כל עמוד, הם יאוחדו אוטומטית.
            </p>
            <div className={styles.captureBtns}>
              <button className={styles.captureBtn} onClick={() => cameraRef.current?.click()} disabled={preparing}>
                <span>📷</span><span>צילום</span>
              </button>
              <button className={styles.captureBtn} onClick={() => fileRef.current?.click()} disabled={preparing}>
                <span>📎</span><span>{isManager ? 'קבצים / PDF' : 'מהגלריה'}</span>
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={handleFiles} />

            {files.length > 0 && (
              <>
                <p className={styles.muted}>{files.length} תמונות</p>
                <div className={styles.thumbs}>
                  {files.map((f, i) => (
                    <div key={f.previewUrl} className={styles.thumb}>
                      {f.mimeType === 'application/pdf' ? <span>PDF</span> : <img src={f.previewUrl} alt={`תמונה ${i + 1}`} />}
                      <button className={styles.thumbRemove} onClick={() => removeFile(i)} aria-label="הסר">✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <Button fullWidth onClick={handleAnalyze} disabled={!files.length || preparing}>
              המשך — זיהוי המסמכים
            </Button>
          </>
        )}

        {step === 'analyzing' && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>מזהה את המסמכים… {progress}/{files.length}</p>
            <p className={styles.muted}>זה לוקח כמה שניות לכל תמונה.</p>
          </div>
        )}

        {step === 'review' && draft && (
          <>
            {unreadCount > 0 && (
              <p className={styles.unreadNote}>
                {unreadCount === 1 ? 'תמונה אחת לא נקראה' : `${unreadCount} תמונות לא נקראו`} ונשמרו תחת "לא נקרא" — המנהל ינסה לזהות אותן שוב מאוחר יותר.
              </p>
            )}
            {drafts.length > 1 && (
              <div className={styles.batchNav}>
                <button className={styles.monthArrow} onClick={() => goTo(current - 1)} disabled={current === 0} aria-label="הקודם">›</button>
                <span className={styles.batchCounter}>
                  {current + 1}/{drafts.length}
                  {draft.saved && <span className={styles.batchSaved}> ✓</span>}
                </span>
                <button className={styles.monthArrow} onClick={() => goTo(current + 1)} disabled={current === drafts.length - 1} aria-label="הבא">‹</button>
              </div>
            )}

            <div className={styles.thumbs}>
              {draft.files.map((f, i) => (
                <a key={f.previewUrl} href={f.previewUrl} target="_blank" rel="noreferrer" className={styles.thumb}>
                  {f.mimeType === 'application/pdf' ? <span>PDF</span> : <img src={f.previewUrl} alt={`עמוד ${i + 1}`} />}
                </a>
              ))}
            </div>
            {draft.files.length > 1 && <p className={styles.muted}>{draft.files.length} עמודים אוחדו למסמך אחד</p>}

            {draft.saved ? (
              <div className={styles.card}>
                <p className={styles.success}>✓ המסמך נשמר</p>
                <p className={styles.muted}>
                  {DOC_TYPE_LABELS[draft.fields.docType]} · {draft.fields.supplierName}
                  {draft.fields.docNumber ? ` · מס' ${draft.fields.docNumber}` : ''}
                </p>
              </div>
            ) : (
              <>
                {draft.duplicate && (
                  <div className={`${styles.card} ${styles.duplicateCard}`}>
                    <p className={styles.cardTitle}>המסמך הזה כבר הועלה</p>
                    <p className={styles.muted}>
                      {DOC_TYPE_LABELS[draft.duplicate.docType]} מס' {draft.duplicate.docNumber} של {draft.duplicate.supplierName || 'ספק לא ידוע'}
                      {' '}הועלה{draft.duplicate.uploadedByName ? ` על ידי ${draft.duplicate.uploadedByName}` : ''}
                      {' '}ב-{new Date(draft.duplicate.uploadedAt).toLocaleDateString('he-IL')}. אין צורך להעלות אותו שוב.
                    </p>
                    <div className={styles.actions}>
                      {isManager && (
                        <Button onClick={() => navigate(`/manager/documents/${draft.duplicate!.id}`)}>פתיחת המסמך הקיים</Button>
                      )}
                      <Button variant={isManager ? 'ghost' : 'primary'} onClick={removeCurrent}>
                        {drafts.length > 1 ? 'הסרה מהרשימה' : 'מסמך אחר'}
                      </Button>
                    </div>
                    <p className={styles.muted}>זה מסמך אחר? תקנו את מספר המסמך או הספק למטה.</p>
                  </div>
                )}

                {!draft.extraction && (
                  <p className={styles.error}>לא הצלחנו לזהות את המסמך — מלאו את הפרטים ידנית.</p>
                )}

                <div className={styles.card}>
                  <p className={styles.cardTitle}>פרטי המסמך</p>
                  <p className={styles.muted}>בדקו שהפרטים נכונים ותקנו במידת הצורך.</p>
                  <DocumentFields
                    values={draft.fields}
                    onChange={handleFieldsChange}
                    supplierNames={supplierNames}
                    showAmounts={isManager || draft.fields.docType !== 'delivery_note'}
                  />
                </div>

                {needsChecklist && !draft.duplicate && (
                  <div className={styles.card}>
                    <ReceivingChecklist
                      title={`מה הגיע? (${checklistCount} פריטים)`}
                      lines={draft.lines}
                      onChange={lines => updateDraft({ lines })}
                      highlightUnset={draft.highlightUnset}
                    />
                  </div>
                )}

                {CHECKLIST_TYPES.includes(draft.fields.docType) && checklistCount === 0 && (
                  <p className={styles.muted}>לא זוהו פריטים במסמך — אם משהו חסר, כתבו בהערות.</p>
                )}

                <Textarea
                  label="הערות (אופציונלי)"
                  id="doc-notes"
                  rows={3}
                  value={draft.notes}
                  onChange={e => updateDraft({ notes: e.target.value })}
                  placeholder="למשל: הארגז של העגבניות הגיע פתוח"
                />

                {error && <p className={styles.error}>{error}</p>}

                <div className={styles.actions}>
                  <Button onClick={handleSave} isLoading={saving} disabled={!!draft.duplicate}>
                    {drafts.length - savedCount > 1 ? 'שמירה והבא' : 'שמירה'}
                  </Button>
                  {drafts.length > 1 && !draft.duplicate && (
                    <Button variant="ghost" onClick={removeCurrent} disabled={saving}>הסרה מהרשימה</Button>
                  )}
                </div>
              </>
            )}

            {savedCount === 0 && (
              <Button variant="ghost" fullWidth onClick={reset} disabled={saving}>התחלה מחדש</Button>
            )}
          </>
        )}

        {step === 'done' && (
          <div className={styles.card}>
            <p className={styles.success}>
              ✓ {savedCount + unreadCount > 1 ? `${savedCount + unreadCount} מסמכים נשמרו` : 'המסמך נשמר'}
            </p>
            {unreadCount > 0 && (
              <p className={styles.unreadNote}>
                {unreadCount === 1 ? 'תמונה אחת לא נקראה' : `${unreadCount} תמונות לא נקראו`} ונשמרו תחת "לא נקרא" — המנהל ינסה לזהות אותן שוב מאוחר יותר.
              </p>
            )}
            <div className={styles.actions}>
              <Button onClick={reset}>מסמכים נוספים</Button>
              {isManager && <Button variant="ghost" onClick={() => navigate('/manager/documents')}>לרשימת המסמכים</Button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
