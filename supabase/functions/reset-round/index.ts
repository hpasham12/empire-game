// Supabase Edge Function: reset-round
//
// Host-only. Clears every player's secret + assigned word, resets the
// has_submitted flags, and returns the room to the 'lobby' phase (End Game /
// Play Again). Runs with the service role because it touches rows the host
// does not own.
//
// Deploy:  supabase functions deploy reset-round --no-verify-jwt

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
    const { roomId } = await req.json()
    if (!roomId) return json({ error: 'roomId is required' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const authed = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const { data: room } = await service.from('rooms').select('host_user_id').eq('id', roomId).single()
    if (!room || room.host_user_id !== user.id) return json({ error: 'forbidden' }, 403)

    const { data: playerRows } = await service.from('players').select('id').eq('room_id', roomId)
    const ids = (playerRows ?? []).map(p => p.id)

    if (ids.length > 0) {
      await service
        .from('player_secrets')
        .update({ secret_word: null, assigned_read_word: null })
        .in('player_id', ids)
    }
    await service.from('players').update({ has_submitted: false }).eq('room_id', roomId)
    await service.from('rooms').update({ game_phase: 'lobby' }).eq('id', roomId)

    return json({ ok: true }, 200)
  } catch (e) {
    return json({ error: String(e) }, 400)
  }
})
