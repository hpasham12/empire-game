import { useState } from 'react'
import { supabase } from '../supabaseClient'

// Room code passed via a shared link (?room=CODE), read once at load.
const initialRoomFromUrl = new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? ''

interface HomeProps {
  onEnterRoom: (roomCode: string, playerId: string, isHost: boolean) => void
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Fire-and-forget: ask the edge function to record the player's approximate
// location (server-observed IP + geolocation). Never blocks or fails the join.
function recordPlayerGeo(playerId: string) {
  void supabase.functions.invoke('record-player-geo', { body: { playerId } })
}

export default function Home({ onEnterRoom }: HomeProps) {
  const [mode, setMode] = useState<'idle' | 'join'>(initialRoomFromUrl ? 'join' : 'idle')
  const [joinCode, setJoinCode] = useState(initialRoomFromUrl)
  const [nickname, setNickname] = useState('')
  const [hostNickname, setHostNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreateRoom() {
    const name = hostNickname.trim()
    if (!name) {
      setError('Please enter a nickname.')
      return
    }
    if (name.length < 2) {
      setError('Nickname must be at least 2 characters.')
      return
    }
    setLoading(true)
    setError('')

    const roomCode = generateRoomCode()

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({ room_code: roomCode, game_phase: 'lobby' })
      .select()
      .single()

    if (roomErr || !room) {
      setError(roomErr?.message ?? 'Failed to create room.')
      setLoading(false)
      return
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ room_id: room.id, nickname: name, is_host: true })
      .select()
      .single()

    if (playerErr || !player) {
      setError(playerErr?.message ?? 'Failed to add player.')
      setLoading(false)
      return
    }

    recordPlayerGeo(player.id)
    onEnterRoom(room.room_code, player.id, true)
  }

  async function handleJoinRoom() {
    const name = nickname.trim()
    if (!joinCode.trim() || !name) {
      setError('Please enter both a room code and a nickname.')
      return
    }
    if (name.length < 2) {
      setError('Nickname must be at least 2 characters.')
      return
    }
    setLoading(true)
    setError('')

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select()
      .eq('room_code', joinCode.trim().toUpperCase())
      .single()

    if (roomErr || !room) {
      setError('Room not found. Check the code and try again.')
      setLoading(false)
      return
    }

    // Look for an existing player with this nickname (case-insensitive) in the room.
    const { data: matches } = await supabase
      .from('players')
      .select('id, is_host')
      .eq('room_id', room.id)
      .ilike('nickname', name)

    const existing = matches && matches.length > 0 ? matches[0] : null

    // Game already in progress: a matching nickname is a returning/disconnected
    // player rejoining; a new nickname is blocked.
    if (room.game_phase !== 'lobby') {
      if (existing) {
        recordPlayerGeo(existing.id)
        onEnterRoom(room.room_code, existing.id, existing.is_host)
        return
      }
      setError('This game has already started.')
      setLoading(false)
      return
    }

    // Lobby: nicknames must be unique within the room.
    if (existing) {
      setError('That nickname is taken in this room. Pick another.')
      setLoading(false)
      return
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ room_id: room.id, nickname: name, is_host: false })
      .select()
      .single()

    if (playerErr || !player) {
      // 23505 = unique_violation from the (room_id, lower(nickname)) index,
      // in case another device claimed the name in a race.
      if (playerErr?.code === '23505') {
        setError('That nickname is taken in this room. Pick another.')
      } else {
        setError(playerErr?.message ?? 'Failed to join room.')
      }
      setLoading(false)
      return
    }

    recordPlayerGeo(player.id)
    onEnterRoom(room.room_code, player.id, false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-bold text-center mb-2 tracking-tight">Empire</h1>
        <p className="text-center text-gray-400 mb-10">A party game of memory and hidden identities</p>

        {mode === 'idle' && (
          <div className="flex flex-col gap-4">
            {/* Create Room */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Create a Room</h2>
              <input
                type="text"
                placeholder="Your nickname"
                value={hostNickname}
                onChange={e => setHostNickname(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                maxLength={20}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              />
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg py-2.5 font-semibold"
              >
                {loading ? 'Creating…' : 'Create Room'}
              </button>
            </div>

            <div className="text-center text-gray-600 text-sm">or</div>

            {/* Join Room */}
            <button
              onClick={() => setMode('join')}
              className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors rounded-2xl py-4 font-semibold text-gray-300"
            >
              Join a Room
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <button
              onClick={() => { setMode('idle'); setError('') }}
              className="text-gray-500 hover:text-gray-300 text-sm mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-lg font-semibold mb-4">Join a Room</h2>
            <input
              type="text"
              placeholder="4-letter room code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 tracking-widest uppercase"
            />
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              maxLength={20}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg py-2.5 font-semibold"
            >
              {loading ? 'Joining…' : 'Join Room'}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-red-400 text-sm">{error}</p>
        )}
      </div>
    </div>
  )
}
