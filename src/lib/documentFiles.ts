// Browser-side file handling for supplier documents: compression, base64,
// and sharing to WhatsApp via the Web Share API.

import type { PendingFile } from '../types/documents'

const MAX_PDF_BYTES = 10 * 1024 * 1024

/** Images are downscaled & re-encoded as JPEG (sharp enough for small print);
 *  PDFs are kept as-is. */
export async function prepareFile(file: File): Promise<PendingFile> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error('קובץ PDF גדול מדי (מקסימום 10MB)')
    return { blob: file, mimeType: file.type, previewUrl: URL.createObjectURL(file), name: file.name }
  }
  if (!file.type.startsWith('image/')) throw new Error('ניתן להעלות רק תמונה או PDF')
  const blob = await compressImage(file, 2000, 0.8)
  return {
    blob,
    mimeType: 'image/jpeg',
    previewUrl: URL.createObjectURL(blob),
    name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
  }
}

async function compressImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('דחיסת התמונה נכשלה'))), 'image/jpeg', quality),
  )
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'))
    reader.readAsDataURL(blob)
  })
}

export function extensionFor(mimeType: string): string {
  return mimeType === 'application/pdf' ? 'pdf' : 'jpg'
}

export function canShareFiles(files: File[]): boolean {
  return typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files })
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
