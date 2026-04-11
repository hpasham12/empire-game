// Supabase Edge Function: record-player-geo
//
// Captures the *approximate* location of a player server-side. The client IP is
// read from the request as observed by the edge network (not trusted from the
// browser), geolocated via a free no-key API, and written to the player row with
// the service-role key. Best-effort: geolocation failures never block a join.
//
// Deploy:  supabase functions deploy record-player-geo --no-verify-jwt
// (invoked from the browser with the project's anon key)

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { playerId } = await req.json()
    if (!playerId) {
      return json({ error: 'playerId is required' }, 400)
    }

    // Real client IP as seen by the edge network. x-forwarded-for may be a
    // comma-separated chain; the first entry is the originating client.
    const forwarded = req.headers.get('x-forwarded-for') ?? ''
    const clientIp = forwarded.split(',')[0].trim() || req.headers.get('x-real-ip') || ''

    // Always record the raw IP; enrich with geo when the lookup succeeds.
    const geo: Record<string, string | null> = {
      ip: clientIp || null,
      city: null,
      region: null,
      country: null,
    }

    if (clientIp) {
      try {
        const res = await fetch(`https://ipwho.is/${clientIp}`)
        const data = await res.json()
        if (data?.success) {
          geo.city = data.city ?? null
          geo.region = data.region ?? null
          geo.country = data.country ?? null
        }
      } catch {
        // Geolocation is best-effort; keep the raw IP.
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error } = await supabase
      .from('player_geo')
      .upsert({ player_id: playerId, ...geo }, { onConflict: 'player_id' })
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true, geo }, 200)
  } catch (e) {
    return json({ error: String(e) }, 400)
  }
})
