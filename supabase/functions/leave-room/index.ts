// Supabase Edge Function: leave-room
//
// Host-only. Lets the host leave gracefully: the host role is reassigned to
// another player in the room (and rooms.host_user_id updated), then the
// leaving host's player row is deleted. If no other players remain, the room
// is deleted instead. Runs with the service role because promoting another
// player touches a row the caller doesn't own.
//
// Deploy:  supabase functions deploy leave-room --no-verify-jwt

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

    const { data: playerRows } = await service
      .from('players')
      .select('id, user_id')
      .eq('room_id', roomId)
      .order('id', { ascending: true })

    const players = playerRows ?? []
    const hostPlayer = players.find(p => p.user_id === user.id)
    const others = players.filter(p => p.id !== hostPlayer?.id)

    if (others.length > 0) {
      const next = others[0]
      await service.from('players').update({ is_host: true }).eq('id', next.id)
      await service.from('rooms').update({ host_user_id: next.user_id }).eq('id', roomId)
      if (hostPlayer) await service.from('players').delete().eq('id', hostPlayer.id)
      return json({ ok: true, reassignedTo: next.id }, 200)
    }

    // No one else left — remove the room (cascades players/secrets/geo).
    await service.from('players').delete().eq('room_id', roomId)
    await service.from('rooms').delete().eq('id', roomId)
    return json({ ok: true, roomDeleted: true }, 200)
  } catch (e) {
    return json({ error: String(e) }, 400)
  }
})
