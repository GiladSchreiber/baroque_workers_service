// Supabase Edge Function: analyze-document
// Sends a photographed / uploaded supplier document to Gemini and returns
// structured JSON (type, supplier, number, date, totals, line items).
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   GEMINI_API_KEY  – from https://aistudio.google.com/apikey (free tier)
//   GEMINI_MODEL    – optional, defaults to "gemini-flash-latest"

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
- "tax_invoice"         – חשבונית מס
- "tax_invoice_receipt" – חשבונית מס / קבלה
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
      enum: ['delivery_note', 'tax_invoice', 'tax_invoice_receipt', 'credit_note', 'receipt', 'other'],
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
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest'

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

  // The free tier is sometimes overloaded (503) or rate-limited (429):
  // retry, then fall back to lighter models.
  const models = [...new Set([model, 'gemini-flash-lite-latest', 'gemini-2.5-flash'])]
  let res: Response | null = null
  let lastError = ''
  outer: for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: requestBody,
        },
      )
      if (res.ok) break outer
      lastError = `${m}: ${res.status} ${await res.text()}`
      if (res.status !== 503 && res.status !== 429 && res.status !== 404) break outer
      if (res.status === 404) break // unknown model name → next model
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  if (!res?.ok) {
    return json({ error: `Gemini error ${res?.status ?? ''}`, detail: lastError }, 502)
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
