import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { documentsRepo } from '../../repositories'
import { amountToString, formatMoney, isValidIsoDate, parseAmount } from '../../lib/documents'
import { RECEIVED_LABELS, isSendableType, type SupplierDocument } from '../../types/documents'
import { DocumentFields, type DocFieldValues } from './DocumentFields'
import styles from './Documents.module.scss'

function toFields(d: SupplierDocument): DocFieldValues {
  return {
    docType: d.docType,
    supplierName: d.supplierName,
    docNumber: d.docNumber ?? '',
    docDate: d.docDate ?? '',
    totalBeforeVat: amountToString(d.totalBeforeVat),
    vatAmount: amountToString(d.vatAmount),
    totalWithVat: amountToString(d.totalWithVat),
  }
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<SupplierDocument | null>(null)
  const [urls, setUrls] = useState<string[]>([])
  const [fields, setFields] = useState<DocFieldValues | null>(null)
  const [notes, setNotes] = useState('')
  const [supplierNames, setSupplierNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(() =>
    documentsRepo.getById(id ?? '')
      .then(async d => {
        const signed = d ? await documentsRepo.getSignedUrls(d.filePaths) : []
        setDoc(d)
        if (d) {
          setFields(toFields(d))
          setNotes(d.notes)
          setUrls(signed)
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
      .finally(() => setLoading(false)), [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { documentsRepo.getSupplierNames().then(setSupplierNames).catch(() => {}) }, [])

  async function save() {
    if (!doc || !fields) return
    setSaving(true)
    setError('')
    setSavedMsg('')
    try {
      await documentsRepo.update(doc.id, {
        docType: fields.docType,
        supplierName: fields.supplierName,
        docNumber: fields.docNumber || null,
        docDate: isValidIsoDate(fields.docDate) ? fields.docDate : null,
        totalBeforeVat: parseAmount(fields.totalBeforeVat),
        vatAmount: parseAmount(fields.vatAmount),
        totalWithVat: parseAmount(fields.totalWithVat),
        notes: notes.trim(),
      })
      setSavedMsg('נשמר ✓')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  async function toggleSent() {
    if (!doc) return
    await documentsRepo.setSent([doc.id], !doc.sentToAccountantAt)
    await load()
  }

  async function handleDelete() {
    if (!doc) return
    await documentsRepo.delete(doc)
    navigate('/manager/documents', { replace: true })
  }

  if (loading && !doc) return <div className={styles.page}><PageHeader title="מסמך" showBack /><LoadingSpinner /></div>
  if (!doc || !fields) return <div className={styles.page}><PageHeader title="מסמך" showBack /><p className={styles.muted} style={{ padding: '1rem' }}>המסמך לא נמצא</p></div>

  return (
    <div className={styles.page}>
      <PageHeader title={doc.supplierName || 'מסמך'} showBack />
      <div className={styles.body}>
        <p className={styles.muted}>
          הועלה {new Date(doc.uploadedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
          {doc.uploadedByName ? ` על ידי ${doc.uploadedByName}` : ''}
          {doc.sentToAccountantAt ? ` · נשלח לרו״ח ${new Date(doc.sentToAccountantAt).toLocaleDateString('he-IL')}` : ''}
        </p>

        <div className={styles.card}>
          <p className={styles.cardTitle}>פרטים</p>
          <DocumentFields values={fields} onChange={setFields} supplierNames={supplierNames} />
          <Textarea label="הערות" id="detail-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          {error && <p className={styles.error}>{error}</p>}
          {savedMsg && <p className={styles.muted}>{savedMsg}</p>}
          <Button onClick={save} isLoading={saving}>שמירת שינויים</Button>
        </div>

        {doc.lines.length > 0 && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>פריטים</p>
            <table className={styles.linesTable}>
              <thead>
                <tr><th>פריט</th><th className={styles.num}>כמות</th><th className={styles.num}>סכום</th><th>התקבל</th></tr>
              </thead>
              <tbody>
                {doc.lines.map(l => (
                  <tr key={l.id}>
                    <td>
                      {l.description}
                      {l.receivedNote && <span className={styles.lineNote}>{l.receivedNote}</span>}
                    </td>
                    <td className={styles.num}>{l.quantity ?? '—'} {l.unit ?? ''}</td>
                    <td className={styles.num}>{formatMoney(l.lineTotal)}</td>
                    <td className={l.receivedStatus ? styles[`mark_${l.receivedStatus}`] : undefined}>{l.receivedStatus ? RECEIVED_LABELS[l.receivedStatus] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.preview}>
          {doc.filesPurgedAt && <p className={styles.muted}>הקובץ נמחק (מסמך ישן) — נשמרו רק הנתונים.</p>}
          {urls.map((u, i) =>
            doc.fileTypes[i] === 'application/pdf'
              ? <a key={u} href={u} target="_blank" rel="noreferrer" className={styles.pdfLink}>📄 פתיחת PDF {urls.length > 1 ? i + 1 : ''}</a>
              : <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt={`עמוד ${i + 1}`} /></a>,
          )}
        </div>

        <div className={styles.actions}>
          {isSendableType(doc.docType) && (
            <Button variant="secondary" onClick={toggleSent}>
              {doc.sentToAccountantAt ? 'סמן כלא נשלח' : 'סמן כנשלח לרו״ח'}
            </Button>
          )}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>מחיקה</Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="למחוק את המסמך?"
        message="המסמך והקבצים יימחקו לצמיתות."
        confirmLabel="מחק"
        cancelLabel="ביטול"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
