import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

interface Player {
  id: string
  nickname: string
  is_host: boolean
  secret_word: string | null
  assigned_read_word: string | null
}

interface GameRoomProps {
  roomCode: string
  playerId: string
  isHost: boolean
  onLeave: () => void
}

export default function GameRoom({ roomCode, playerId, isHost, onLeave }: GameRoomProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [gamePhase, setGamePhase] = useState<string>('lobby')
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [wordInput, setWordInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)

  // Fetch room + players, then set up real-time subscriptions — single room lookup
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const [{ data: roomRow }, ] = await Promise.all([
        supabase.from('rooms').select('id, game_phase, category').eq('room_code', roomCode).single(),
      ])

      if (!roomRow) return

      setGamePhase(roomRow.game_phase)
      if (roomRow.category) setCategory(roomRow.category)
      setRoomId(roomRow.id)

      const { data: playerList } = await supabase
        .from('players')
        .select('id, nickname, is_host, secret_word, assigned_read_word')
        .eq('room_id', roomRow.id)

      if (playerList) {
        setPlayers(playerList)
        const me = playerList.find(p => p.id === playerId)
        if (me?.secret_word) setSubmitted(true)
      }
      setLoading(false)

      channel = supabase
        .channel(`room-players-${roomRow.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'players',
            filter: `room_id=eq.${roomRow.id}`,
          },
          (payload) => {
            setPlayers(prev => [...prev, payload.new as Player])
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'players',
            filter: `room_id=eq.${roomRow.id}`,
          },
          (payload) => {
            const updated = payload.new as Player
            setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'players',
          },
          (payload) => {
            const deleted = payload.old as { id: string }
            if (deleted.id === playerId) {
              onLeave()
              return
            }
            setPlayers(prev => prev.filter(p => p.id !== deleted.id))
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomRow.id}`,
          },
          (payload) => {
            const newRoom = payload.new as { game_phase: string; category: string }
            setGamePhase(newRoom.game_phase)
            if (newRoom.category) setCategory(newRoom.category)
            if (newRoom.game_phase === 'lobby' || newRoom.game_phase === 'input') {
              setSubmitted(false)
              setWordInput('')
            }
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [roomCode, playerId, onLeave])

  async function handleRemovePlayer(id: string) {
    await supabase.from('players').delete().eq('id', id)
  }

  async function handleStartGame() {
    if (!roomId) return

    const { error } = await supabase
      .from('rooms')
      .update({ game_phase: 'input', category: category.trim() })
      .eq('id', roomId)

    if (!error) {
      setGamePhase('input')
    }
  }

  async function handleSubmitWord() {
    if (!wordInput.trim()) return
    if (!players.some(p => p.id === playerId)) return
    await supabase
      .from('players')
      .update({ secret_word: wordInput.trim() })
      .eq('id', playerId)
    setSubmitted(true)
  }

  async function handleDistributeWords() {
    if (!roomId) return

    const { data: playerList } = await supabase
      .from('players')
      .select('id, secret_word')
      .eq('room_id', roomId)

    if (!playerList || playerList.length === 0) return

    // Shuffle words (Fisher-Yates)
    const words = playerList.map(p => p.secret_word as string)
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[words[i], words[j]] = [words[j], words[i]]
    }

    // Assign shuffled words to each player
    await Promise.all(
      playerList.map((p, i) =>
        supabase
          .from('players')
          .update({ assigned_read_word: words[i] })
          .eq('id', p.id)
      )
    )

    await supabase
      .from('rooms')
      .update({ game_phase: 'reading' })
      .eq('id', roomId)
  }

  async function handleStartGuessingPhase() {
    if (!roomId) return

    await supabase
      .from('rooms')
      .update({ game_phase: 'gameplay' })
      .eq('id', roomId)
  }

  async function handleEndGame() {
    if (!roomId) return

    await supabase
      .from('players')
      .update({ secret_word: null, assigned_read_word: null })
      .eq('room_id', roomId)

    await supabase
      .from('rooms')
      .update({ game_phase: 'lobby' })
      .eq('id', roomId)

    setSubmitted(false)
    setWordInput('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading room…</p>
      </div>
    )
  }

  if (gamePhase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Room code */}
          <div className="text-center mb-8">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Room Code</p>
            <p className="text-6xl font-bold tracking-[0.2em] text-indigo-400">{roomCode}</p>
            <p className="text-gray-500 text-sm mt-2">Share this code with your friends</p>
          </div>

          {/* Player list */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Players — {players.length}
            </h2>
            <ul className="flex flex-col gap-2">
              {players.map(p => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2.5"
                >
                  <span className="font-medium">
                    {p.nickname}
                    {p.id === playerId && (
                      <span className="ml-2 text-xs text-gray-500">(you)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {p.is_host && (
                      <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                    {isHost && !p.is_host && (
                      <button
                        onClick={() => handleRemovePlayer(p.id)}
                        className="text-gray-600 hover:text-rose-400 transition-colors text-xs px-1.5"
                        title="Remove player"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {players.length < 2 && (
              <p className="text-gray-600 text-sm text-center mt-4">
                Waiting for more players to join…
              </p>
            )}
          </div>

          {/* Start game — host only */}
          {isHost && (
            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-1.5">
                Enter Category <span className="text-gray-600">(e.g., Famous People, Movies)</span>
              </label>
              <input
                type="text"
                placeholder="Famous People"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              />
              <button
                onClick={handleStartGame}
                disabled={players.length < 2 || !category.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-xl py-3 font-semibold"
              >
                Start Game
              </button>
            </div>
          )}

          {!isHost && (
            <p className="text-center text-gray-600 text-sm mb-3">
              Waiting for the host to start the game…
            </p>
          )}

          <button
            onClick={onLeave}
            className="w-full text-gray-600 hover:text-gray-400 text-sm py-2 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    )
  }

  if (gamePhase === 'input') {
    const submittedCount = players.filter(p => p.secret_word).length
    const allSubmitted = players.length > 0 && submittedCount === players.length

    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Category display */}
          <div className="text-center mb-8">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Current Category</p>
            <p className="text-4xl font-bold text-indigo-400">{category}</p>
          </div>

          {/* Secret word input or confirmation */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-5">
            {submitted ? (
              <div className="text-center py-4">
                <p className="text-green-400 font-semibold text-lg mb-1">Word submitted!</p>
                <p className="text-gray-500 text-sm">Waiting for other players…</p>
              </div>
            ) : (
              <>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Your secret word
                </label>
                <input
                  type="text"
                  placeholder={`A ${category} name…`}
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitWord()}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                  autoFocus
                />
                <button
                  onClick={handleSubmitWord}
                  disabled={!wordInput.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-xl py-3 font-semibold"
                >
                  Submit
                </button>
              </>
            )}
          </div>

          {/* Host-only: submission progress + distribute button */}
          {isHost && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                  Player Progress
                </h2>
                <span className={`text-sm font-bold ${allSubmitted ? 'text-green-400' : 'text-gray-300'}`}>
                  {submittedCount}/{players.length} ready
                </span>
              </div>
              <ul className="flex flex-col gap-2 mb-4">
                {players.map(p => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2"
                  >
                    <span className="text-sm font-medium">{p.nickname}</span>
                    {p.secret_word ? (
                      <span className="text-green-400 text-xs font-semibold">Ready ✓</span>
                    ) : (
                      <span className="text-gray-600 text-xs">Waiting…</span>
                    )}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleDistributeWords}
                disabled={!allSubmitted}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-xl py-3 font-semibold"
              >
                Distribute Words
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (gamePhase === 'reading') {
    const me = players.find(p => p.id === playerId)
    const myWord = me?.assigned_read_word ?? ''

    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Your Word</p>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl px-10 py-10 mt-2">
              <p className="text-5xl font-bold text-indigo-400 tracking-wide">{myWord}</p>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              Read this word aloud to the group when it is your turn.
            </p>
          </div>

          {isHost && (
            <button
              onClick={handleStartGuessingPhase}
              className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-xl py-3 font-semibold"
            >
              Start Guessing Phase
            </button>
          )}
        </div>
      </div>
    )
  }

  if (gamePhase === 'gameplay') {
    const me = players.find(p => p.id === playerId)
    const mySecretWord = me?.secret_word ?? ''

    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-white mb-2">Gameplay in progress.</p>
            <p className="text-gray-400 text-lg">Put your phones down and start guessing!</p>
          </div>

          <p className="text-gray-400 text-sm">
            My word: <span className="text-indigo-300 font-semibold">{mySecretWord}</span>
          </p>

          {isHost && (
            <button
              onClick={handleEndGame}
              className="w-full bg-rose-700 hover:bg-rose-600 transition-colors rounded-xl py-3 font-semibold mt-4"
            >
              End Game / Play Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}
