// Supabase Edge Function: analyze-document
// Sends a photographed / uploaded supplier document to Gemini and returns
// structured JSON (type, supplier, number, date, totals, line items).
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   GEMINI_API_KEY  – from https://aistudio.google.com/apikey (free tier)
//   GEMINI_MODEL    – optional, defaults to "gemini-flash-lite-latest"

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PROMPT = `You are reading an Israeli business document (Hebrew) photographed or scanned at a restaurant.
Classify it and extract its data.

doc_type must be one of:
- "delivery_note"       – תעודת משלוח
- "tax_invoice"         – חשבונית מס, including חשבונית מס / קבלה
- "credit_note"         – חשבונית זיכוי / חשבונית מס זיכוי
- "receipt"             – קבלה only
- "other"               – anything else

Rules:
- supplier_name is the ISSUING business (the seller), not the customer. Keep it in Hebrew as printed.
- supplier_tax_id is the seller's ע.מ / ח.פ number, digits only.
- doc_date in YYYY-MM-DD format.
- Amounts are positive numbers without currency signs (also for credit notes).
- total_before_vat = סה"כ לפני מע"מ, vat_amount = מע"מ, total_with_vat = סה"כ לתשלום / כולל מע"מ.
- lines: every product line. line_total is the line amount as printed. Keep descriptions in Hebrew as printed.
- If a value is not visible, return null. Never invent values.`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    doc_type: {
      type: 'STRING',
      enum: ['delivery_note', 'tax_invoice', 'credit_note', 'receipt', 'other'],
    },
    supplier_name: { type: 'STRING', nullable: true },
    supplier_tax_id: { type: 'STRING', nullable: true },
    doc_number: { type: 'STRING', nullable: true },
    doc_date: { type: 'STRING', nullable: true },
    total_before_vat: { type: 'NUMBER', nullable: true },
    vat_amount: { type: 'NUMBER', nullable: true },
    total_with_vat: { type: 'NUMBER', nullable: true },
    lines: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          quantity: { type: 'NUMBER', nullable: true },
          unit: { type: 'STRING', nullable: true },
          unit_price: { type: 'NUMBER', nullable: true },
          line_total: { type: 'NUMBER', nullable: true },
        },
        required: ['description'],
      },
    },
  },
  required: ['doc_type', 'lines'],
}

interface InputFile { mimeType: string; data: string } // data = base64 (no data: prefix)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'GEMINI_API_KEY is not configured' }, 500)
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-lite-latest'

  let files: InputFile[]
  try {
    const body = await req.json()
    files = body.files
    if (!Array.isArray(files) || files.length === 0) throw new Error('no files')
  } catch {
    return json({ error: 'Body must be { files: [{ mimeType, data }] }' }, 400)
  }

  const parts = [
    { text: PROMPT },
    ...files.map(f => ({ inline_data: { mime_type: f.mimeType, data: f.data } })),
  ]

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
    },
  })

  // One model only. The free tier is occasionally overloaded (503), rate-limited
  // (429) or slow. "Busy" answers come back within ~2s, so wait a little and
  // try again (up to 3 attempts). A full invoice can take ~20s to read.
  // (Supabase allows 150s per request; worst case here ≈ 3 × 45s.)
  let res: Response | null = null
  const errors: string[] = []
  const BACKOFF_MS = [0, 2000, 5000]
  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
    if (BACKOFF_MS[attempt]) await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]))
    const m = model
    const started = Date.now()
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: requestBody,
          signal: AbortSignal.timeout(40_000),
        },
      )
      if (r.ok) { res = r; break }
      const text = await r.text()
      errors.push(`${m}: ${r.status} after ${Date.now() - started}ms ${text.slice(0, 200)}`)
      if (r.status !== 503 && r.status !== 429 && r.status < 500) break // only retry when busy / server error
    } catch (e) {
      errors.push(`${m}: ${e instanceof Error ? e.name : 'error'} after ${Date.now() - started}ms`)
    }
  }

  if (!res) {
    return json({ error: 'Gemini unavailable', detail: errors.join(' | ') }, 502)
  }

  const out = await res.json()
  const text: string | undefined = out?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return json({ error: 'Empty response from Gemini' }, 502)

  try {
    return json(JSON.parse(text))
  } catch {
    return json({ error: 'Gemini returned invalid JSON', detail: text }, 502)
  }
})
