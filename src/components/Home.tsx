import { useState } from 'react'
import { supabase } from '../supabaseClient'

interface HomeProps {
  onEnterRoom: (roomCode: string, playerId: string, isHost: boolean) => void
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Home({ onEnterRoom }: HomeProps) {
  const [mode, setMode] = useState<'idle' | 'join'>('idle')
  const [joinCode, setJoinCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [hostNickname, setHostNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreateRoom() {
    if (!hostNickname.trim()) {
      setError('Please enter a nickname.')
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
      .insert({ room_id: room.id, nickname: hostNickname.trim(), is_host: true })
      .select()
      .single()

    if (playerErr || !player) {
      setError(playerErr?.message ?? 'Failed to add player.')
      setLoading(false)
      return
    }

    onEnterRoom(room.room_code, player.id, true)
  }

  async function handleJoinRoom() {
    if (!joinCode.trim() || !nickname.trim()) {
      setError('Please enter both a room code and a nickname.')
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

    if (room.game_phase !== 'lobby') {
      setError('This game has already started.')
      setLoading(false)
      return
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ room_id: room.id, nickname: nickname.trim(), is_host: false })
      .select()
      .single()

    if (playerErr || !player) {
      setError(playerErr?.message ?? 'Failed to join room.')
      setLoading(false)
      return
    }

    onEnterRoom(room.room_code, player.id, false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-bold text-center mb-2 tracking-tight">Empire</h1>
        <p className="text-center text-gray-400 mb-10">A real-time party word game</p>

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
