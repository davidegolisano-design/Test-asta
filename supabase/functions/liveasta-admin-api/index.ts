import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ADMIN_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''

const allowedOrigins = new Set([
  'https://www.liveasta.it',
  'https://liveasta.it',
  'https://davidegolisano-design.github.io'
])

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true
  if (allowedOrigins.has(origin)) return true
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && isAllowedOrigin(origin) ? origin : 'https://www.liveasta.it',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

function json(origin: string, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' }
  })
}

function bearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? ''

  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin)) return json(origin, 403, { ok: false, error: 'Origin non consentita.' })
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') return json(origin, 405, { ok: false, error: 'Metodo non consentito.' })
  if (!isAllowedOrigin(origin)) return json(origin, 403, { ok: false, error: 'Origin non consentita.' })
  if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY) return json(origin, 500, { ok: false, error: 'Backend Admin non configurato.' })

  const token = bearerToken(req)
  if (!token) return json(origin, 401, { ok: false, error: 'Sessione mancante.' })

  const admin = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) return json(origin, 401, { ok: false, error: 'Sessione non valida.' })
  if (user.app_metadata?.role !== 'liveasta_admin') {
    return json(origin, 403, { ok: false, error: 'Utente non autorizzato come LIVEASTA Admin.' })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(origin, 400, { ok: false, error: 'Payload JSON non valido.' })
  }

  const action = String(body.action ?? '')

  if (action === 'snapshot') {
    const [{ data: pending, error: pendingError }, { data: recent, error: recentError }] = await Promise.all([
      admin
        .from('fanta_rooms')
        .select('id,name,created_at,updated_at,game_mode,approved,approval_status')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: true }),
      admin
        .from('fanta_rooms')
        .select('id,name,created_at,updated_at,game_mode,approved,approval_status,approval_reviewed_at,approval_reviewed_by')
        .in('approval_status', ['approved', 'rejected'])
        .order('approval_reviewed_at', { ascending: false, nullsFirst: false })
        .limit(30)
    ])

    if (pendingError || recentError) {
      console.error('admin snapshot failed', { pendingError, recentError })
      return json(origin, 500, { ok: false, error: 'Impossibile leggere le richieste.' })
    }

    return json(origin, 200, { ok: true, pending: pending ?? [], recent: recent ?? [] })
  }

  if (action === 'review') {
    const roomId = String(body.roomId ?? '')
    const decision = String(body.decision ?? '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId)) {
      return json(origin, 400, { ok: false, error: 'Identificativo stanza non valido.' })
    }
    if (!['approve', 'reject'].includes(decision)) {
      return json(origin, 400, { ok: false, error: 'Decisione non valida.' })
    }

    const approved = decision === 'approve'
    const approvalStatus = approved ? 'approved' : 'rejected'
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await admin
      .from('fanta_rooms')
      .update({
        approved,
        approval_status: approvalStatus,
        approval_reviewed_at: now,
        approval_reviewed_by: user.id,
        updated_at: now
      })
      .eq('id', roomId)
      .eq('approval_status', 'pending')
      .select('id,name,approved,approval_status,approval_reviewed_at')
      .maybeSingle()

    if (updateError) {
      console.error('admin review failed', updateError)
      return json(origin, 500, { ok: false, error: 'Impossibile aggiornare la stanza.' })
    }
    if (!updated) {
      return json(origin, 409, { ok: false, error: 'La richiesta è già stata gestita o non esiste.' })
    }

    return json(origin, 200, { ok: true, room: updated })
  }

  return json(origin, 400, { ok: false, error: 'Azione non riconosciuta.' })
})
