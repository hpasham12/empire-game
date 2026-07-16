import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Player, PlayerSecret } from '../types/game'
import LobbyPhase from './phases/LobbyPhase'
import InputPhase from './phases/InputPhase'
import ReadingPhase from './phases/ReadingPhase'
import GameplayPhase from './phases/GameplayPhase'
import InstructionsModal from './InstructionsModal'

interface GameRoomProps {
  roomCode: string
  playerId: string
  isHost: boolean
  onLeave: () => void
}

export default function GameRoom({ roomCode, playerId, isHost, onLeave }: GameRoomProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [gamePhase, setGamePhase] = useState<string>('lobby')
  const [showInstructions, setShowInstructions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [wordInput, setWordInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  // This player's private words, kept in a separate owner-only table.
  const [mySecret, setMySecret] = useState<PlayerSecret>({ secret_word: null, assigned_read_word: null })
  const hostIdRef = useRef<string | null>(null)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: roomRow } = await supabase
        .from('rooms')
        .select('id, game_phase, category')
        .eq('room_code', roomCode)
        .single()

      if (!roomRow) return

      setGamePhase(roomRow.game_phase)
      if (roomRow.category) setCategory(roomRow.category)
      setRoomId(roomRow.id)

      const { data: playerList } = await supabase
        .from('players')
        .select('id, nickname, is_host, has_submitted')
        .eq('room_id', roomRow.id)

      if (playerList) {
        setPlayers(playerList)
        hostIdRef.current = playerList.find(p => p.is_host)?.id ?? null
        const me = playerList.find(p => p.id === playerId)
        if (me?.has_submitted) setSubmitted(true)
      }

      // Fetch this player's own words (owner-only row).
      const { data: secretRow } = await supabase
        .from('player_secrets')
        .select('secret_word, assigned_read_word')
        .eq('player_id', playerId)
        .maybeSingle()
      if (secretRow) setMySecret(secretRow)

      setLoading(false)

      channel = supabase
        .channel(`room-players-${roomRow.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${roomRow.id}` }, (payload) => {
          setPlayers(prev => [...prev, payload.new as Player])
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${roomRow.id}` }, (payload) => {
          const updated = payload.new as Player
          setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players' }, (payload) => {
          const deleted = payload.old as { id: string }
          if (deleted.id === playerId) { onLeave(); return }
          if (deleted.id === hostIdRef.current) { onLeave(); return }
          setPlayers(prev => prev.filter(p => p.id !== deleted.id))
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomRow.id}` }, (payload) => {
          const newRoom = payload.new as { game_phase: string; category: string }
          setGamePhase(newRoom.game_phase)
          if (newRoom.category) setCategory(newRoom.category)
          if (newRoom.game_phase === 'lobby' || newRoom.game_phase === 'input') {
            setSubmitted(false)
            setWordInput('')
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'player_secrets', filter: `player_id=eq.${playerId}` }, (payload) => {
          const row = payload.new as PlayerSecret
          setMySecret({ secret_word: row.secret_word ?? null, assigned_read_word: row.assigned_read_word ?? null })
        })
        .subscribe()
    }

    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [roomCode, playerId, onLeave])

  async function handleSelfLeave() {
    await supabase.from('players').delete().eq('id', playerId)
    onLeave()
  }

  async function handleRemovePlayer(id: string) {
    await supabase.from('players').delete().eq('id', id)
  }

  async function handleStartGame() {
    if (!roomId) return
    await supabase.from('rooms').update({ game_phase: 'input', category: category.trim() }).eq('id', roomId)
    setGamePhase('input')
  }

  async function handleSubmitWord() {
    if (!wordInput.trim() || !players.some(p => p.id === playerId)) return
    // Word goes to the owner-only secrets table; the players row only tracks a
    // non-secret "submitted" flag so the host can see readiness.
    await supabase.from('player_secrets').upsert(
      { player_id: playerId, secret_word: wordInput.trim().toLowerCase() },
      { onConflict: 'player_id' },
    )
    await supabase.from('players').update({ has_submitted: true }).eq('id', playerId)
    setMySecret(prev => ({ ...prev, secret_word: wordInput.trim().toLowerCase() }))
    setSubmitted(true)
  }

  async function handleDistributeWords() {
    if (!roomId) return
    // Shuffle + assignment happen server-side so secret words never transit
    // other clients and the shuffle can't be tampered with.
    await supabase.functions.invoke('distribute-words', { body: { roomId } })
  }

  async function handleStartGuessingPhase() {
    if (!roomId) return
    await supabase.from('rooms').update({ game_phase: 'gameplay' }).eq('id', roomId)
  }

  async function handleEndGame() {
    if (!roomId) return
    // Clearing every player's secrets + resetting the round touches rows the
    // host doesn't own, so it runs server-side.
    await supabase.functions.invoke('reset-round', { body: { roomId } })
    setMySecret({ secret_word: null, assigned_read_word: null })
    setSubmitted(false)
    setWordInput('')
  }

  let content: React.ReactNode = null

  if (loading) {
    content = (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading room…</p>
      </div>
    )
  } else if (gamePhase === 'lobby') {
    content = (
      <LobbyPhase
        roomCode={roomCode}
        playerId={playerId}
        isHost={isHost}
        players={players}
        category={category}
        onCategoryChange={setCategory}
        onStartGame={handleStartGame}
        onRemovePlayer={handleRemovePlayer}
        onLeave={handleSelfLeave}
      />
    )
  } else if (gamePhase === 'input') {
    content = (
      <InputPhase
        playerId={playerId}
        isHost={isHost}
        players={players}
        category={category}
        submitted={submitted}
        wordInput={wordInput}
        onWordInputChange={setWordInput}
        onSubmitWord={handleSubmitWord}
        onDistributeWords={handleDistributeWords}
      />
    )
  } else if (gamePhase === 'reading') {
    content = (
      <ReadingPhase
        isHost={isHost}
        assignedWord={mySecret.assigned_read_word ?? ''}
        onStartGuessingPhase={handleStartGuessingPhase}
      />
    )
  } else if (gamePhase === 'gameplay') {
    content = (
      <GameplayPhase
        isHost={isHost}
        secretWord={mySecret.secret_word ?? ''}
        onEndGame={handleEndGame}
      />
    )
  }

  return (
    <>
      {content}
      <button
        onClick={() => setShowInstructions(true)}
        className="fixed bottom-4 right-4 z-40 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg border border-gray-600 transition-colors"
        aria-label="How to play"
      >
        ? How to Play
      </button>
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
    </>
  )
}
