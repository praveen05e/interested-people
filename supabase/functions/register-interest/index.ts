// Supabase Edge Function: register-interest
// Deno runtime — runs entirely server-side
// All sensitive credentials accessed via Supabase secrets (never frontend env vars)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ───────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Google Sheets JWT helper ────────────────────────────────
async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  // Encode JWT header + payload
  const header = { alg: 'RS256', typ: 'JWT' }
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Parse the PEM private key
  const pemBody = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${signingInput}.${sigBase64}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Failed to get Google access token: ${err}`)
  }

  const { access_token } = await tokenRes.json()
  return access_token
}

// ─── Append row to Google Sheet ──────────────────────────────
async function appendToSheet(
  accessToken: string,
  sheetId: string,
  tabName: string,
  values: string[],
): Promise<void> {
  const range = encodeURIComponent(`${tabName}!A:C`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Sheets append failed: ${err}`)
  }
}

// ─── Ensure header row exists ─────────────────────────────────
async function ensureHeaderRow(
  accessToken: string,
  sheetId: string,
  tabName: string,
): Promise<void> {
  const range = encodeURIComponent(`${tabName}!A1:C1`)
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`

  const res = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return // best-effort

  const data = await res.json()
  const rows = data.values as string[][] | undefined

  if (!rows || rows.length === 0 || rows[0][0] !== 'Full Name') {
    // Write header
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`
    await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [['Full Name', 'Gmail Address', 'Registered At']] }),
    })
  }
}

// ─── Main handler ─────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    // ── 1. Authenticate the request ─────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Missing authentication token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with service role for server operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Verify the user JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── 2. Extract verified identity ─────────────────────────
    const email = user.email
    if (!email) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'No verified email on your Google account' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      normalizedEmail.split('@')[0]

    // ── 3. Check for existing registration ───────────────────
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('product_interest_registrations')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (lookupError) {
      console.error('DB lookup error:', lookupError.message)
      return new Response(
        JSON.stringify({ status: 'error', message: 'Database error. Please try again.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    if (existing) {
      return new Response(
        JSON.stringify({ status: 'already_registered', message: 'You are already registered!' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── 4. Insert registration record ────────────────────────
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('product_interest_registrations')
      .insert({
        user_id: user.id,
        full_name: fullName,
        email: normalizedEmail,
        sheet_sync_status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      // Handle unique constraint violation (race condition duplicate)
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ status: 'already_registered', message: 'You are already registered!' }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }
      console.error('DB insert error:', insertError.message)
      return new Response(
        JSON.stringify({ status: 'error', message: 'Registration failed. Please try again.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── 5. Sync to Google Sheets ─────────────────────────────
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID')
    const tabName = Deno.env.get('GOOGLE_SHEET_TAB') || 'Interested Customers'

    let sheetSyncStatus = 'skipped_no_config'
    let sheetRowNumber: number | null = null

    if (serviceAccountEmail && serviceAccountKey && sheetId) {
      try {
        // Replace literal \n with actual newlines in the private key
        const formattedKey = serviceAccountKey.replace(/\\n/g, '\n')

        const accessToken = await getGoogleAccessToken(serviceAccountEmail, formattedKey)
        await ensureHeaderRow(accessToken, sheetId, tabName)

        const registeredAt = new Date(inserted.registered_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })

        await appendToSheet(accessToken, sheetId, tabName, [fullName, normalizedEmail, registeredAt])
        sheetSyncStatus = 'synced'
      } catch (sheetErr) {
        // Google Sheets failure must NOT lose the registration
        console.error('Google Sheets sync failed:', sheetErr)
        sheetSyncStatus = 'sync_failed'
      }
    }

    // ── 6. Update sync status in DB ──────────────────────────
    await supabaseAdmin
      .from('product_interest_registrations')
      .update({
        sheet_sync_status: sheetSyncStatus,
        sheet_row_number: sheetRowNumber,
      })
      .eq('id', inserted.id)

    // ── 7. Return success ─────────────────────────────────────
    return new Response(
      JSON.stringify({
        status: 'success',
        message: "You're on the list!",
        sheet_sync: sheetSyncStatus,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ status: 'error', message: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
