// Supabase Edge Function: rejoin
//
// Lets a disconnected player reclaim their existing player row in an
// in-progress game. A reconnecting device has a fresh auth.uid(), so ownership
// must be reassigned server-side (RLS only lets a client update rows it already
// owns). Matches on room code + case-insensitive nickname and, if found,
// reassigns user_id to the caller and returns the player id.
//
// Residual risk (accepted): typing another player's exact nickname claims their
// slot — unavoidable without real accounts.
//
// Deploy:  supabase functions deploy rejoin --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { roomCode, nickname } = await req.json()
    if (!roomCode || !nickname) return json({ error: 'roomCode and nickname are required' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const authed = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const { data: room } = await service
      .from('rooms')
      .select('id')
      .eq('room_code', String(roomCode).toUpperCase())
      .single()
    if (!room) return json({ error: 'room not found' }, 404)

    const { data: matches } = await service
      .from('players')
      .select('id, is_host')
      .eq('room_id', room.id)
      .ilike('nickname', String(nickname).trim())

    const existing = matches && matches.length > 0 ? matches[0] : null
    if (!existing) return json({ found: false }, 200)

    await service.from('players').update({ user_id: user.id }).eq('id', existing.id)

    return json({ found: true, playerId: existing.id, isHost: existing.is_host }, 200)
  } catch (e) {
    return json({ error: String(e) }, 400)
  }
})
