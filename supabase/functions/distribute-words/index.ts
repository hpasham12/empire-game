// Supabase Edge Function: distribute-words
//
// Host-only. Claims the round by advancing the room from 'input' to 'reading'
// (rejecting repeat calls with 409), then reads every player's secret word,
// shuffles them server-side so at most 2 players are assigned their own word,
// and writes each shuffled word back as an assigned_read_word in
// player_secrets. Runs with the
// service role so secret words never transit other clients and the shuffle
// cannot be tampered with.
//
// Deploy:  supabase functions deploy distribute-words --no-verify-jwt

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

    // Verify the caller is the room's host.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const authed = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const { data: room } = await service.from('rooms').select('host_user_id').eq('id', roomId).single()
    if (!room || room.host_user_id !== user.id) return json({ error: 'forbidden' }, 403)

    // Atomically claim the round (input -> reading) before shuffling. Concurrent
    // calls interleave their per-row writes and produce duplicate / missing
    // assignments, so only the call that flips the phase may proceed.
    const { data: claimed } = await service
      .from('rooms')
      .update({ game_phase: 'reading' })
      .eq('id', roomId)
      .eq('game_phase', 'input')
      .select('id')
    if (!claimed || claimed.length === 0) return json({ error: 'words already distributed' }, 409)
    const releaseClaim = () => service.from('rooms').update({ game_phase: 'input' }).eq('id', roomId)

    const { data: playerRows } = await service.from('players').select('id').eq('room_id', roomId)
    if (!playerRows || playerRows.length === 0) {
      await releaseClaim()
      return json({ error: 'no players' }, 400)
    }

    const ids = playerRows.map(p => p.id)
    const { data: secrets } = await service
      .from('player_secrets')
      .select('player_id, secret_word')
      .in('player_id', ids)

    const rows = secrets ?? []
    const own = rows.map(s => s.secret_word as string)

    const shuffle = (arr: string[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }
    const selfReads = (arr: string[]) => arr.reduce((n, w, i) => n + (w === own[i] ? 1 : 0), 0)

    // Reshuffle until at most 2 players are assigned their own word. With
    // duplicate words a valid arrangement may not exist, so cap the attempts
    // and fall back to the best one seen.
    const MAX_ATTEMPTS = 10
    let words = shuffle([...own])
    let best = selfReads(words)
    for (let attempt = 1; best > 2 && attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = shuffle([...own])
      const score = selfReads(candidate)
      if (score < best) {
        words = candidate
        best = score
      }
    }

    const results = await Promise.all(
      rows.map((s, i) =>
        service.from('player_secrets').update({ assigned_read_word: words[i] }).eq('player_id', s.player_id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed) {
      await releaseClaim()
      return json({ error: failed.error!.message }, 500)
    }

    return json({ ok: true }, 200)
  } catch (e) {
    return json({ error: String(e) }, 400)
  }
})
