import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DOC_TYPES, DOC_TYPE_LABELS, type DocType } from '../../types/documents'
import styles from './Documents.module.scss'

export interface DocFieldValues {
  docType: DocType
  supplierName: string
  docNumber: string
  docDate: string
  totalBeforeVat: string
  vatAmount: string
  totalWithVat: string
}

interface Props {
  values: DocFieldValues
  onChange: (v: DocFieldValues) => void
  supplierNames: string[]
  showAmounts?: boolean
}

export function DocumentFields({ values, onChange, supplierNames, showAmounts = true }: Props) {
  const set = <K extends keyof DocFieldValues>(k: K, v: DocFieldValues[K]) => onChange({ ...values, [k]: v })

  return (
    <>
      <Select
        label="סוג מסמך"
        id="doc-type"
        value={values.docType}
        onChange={e => set('docType', e.target.value as DocType)}
        options={DOC_TYPES.map(t => ({ value: t, label: DOC_TYPE_LABELS[t] }))}
      />
      <Input
        label="ספק"
        id="doc-supplier"
        list="doc-supplier-list"
        value={values.supplierName}
        onChange={e => set('supplierName', e.target.value)}
        placeholder="שם הספק"
      />
      <datalist id="doc-supplier-list">
        {supplierNames.map(n => <option key={n} value={n} />)}
      </datalist>
      <div className={styles.row}>
        <Input
          label="מספר מסמך"
          id="doc-number"
          value={values.docNumber}
          onChange={e => set('docNumber', e.target.value)}
          inputMode="numeric"
        />
        <Input
          label="תאריך"
          id="doc-date"
          type="date"
          value={values.docDate}
          onChange={e => set('docDate', e.target.value)}
        />
      </div>
      {showAmounts && (
        <div className={styles.row}>
          <Input
            label='לפני מע"מ'
            id="doc-before-vat"
            inputMode="decimal"
            value={values.totalBeforeVat}
            onChange={e => set('totalBeforeVat', e.target.value)}
          />
          <Input
            label='מע"מ'
            id="doc-vat"
            inputMode="decimal"
            value={values.vatAmount}
            onChange={e => set('vatAmount', e.target.value)}
          />
          <Input
            label='כולל מע"מ'
            id="doc-with-vat"
            inputMode="decimal"
            value={values.totalWithVat}
            onChange={e => set('totalWithVat', e.target.value)}
          />
        </div>
      )}
    </>
  )
}
