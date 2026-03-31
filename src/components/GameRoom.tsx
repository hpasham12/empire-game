import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Player } from '../types/game'
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
        .subscribe()
    }

    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [roomCode, playerId, onLeave])

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
    await supabase.from('players').update({ secret_word: wordInput.trim() }).eq('id', playerId)
    setSubmitted(true)
  }

  async function handleDistributeWords() {
    if (!roomId) return

    const { data: playerList } = await supabase
      .from('players')
      .select('id, secret_word')
      .eq('room_id', roomId)

    if (!playerList || playerList.length === 0) return

    const words = playerList.map(p => p.secret_word as string)
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[words[i], words[j]] = [words[j], words[i]]
    }

    await Promise.all(
      playerList.map((p, i) =>
        supabase.from('players').update({ assigned_read_word: words[i] }).eq('id', p.id)
      )
    )
    await supabase.from('rooms').update({ game_phase: 'reading' }).eq('id', roomId)
  }

  async function handleStartGuessingPhase() {
    if (!roomId) return
    await supabase.from('rooms').update({ game_phase: 'gameplay' }).eq('id', roomId)
  }

  async function handleEndGame() {
    if (!roomId) return
    await supabase.from('players').update({ secret_word: null, assigned_read_word: null }).eq('room_id', roomId)
    await supabase.from('rooms').update({ game_phase: 'lobby' }).eq('id', roomId)
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
        onLeave={onLeave}
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
        playerId={playerId}
        isHost={isHost}
        players={players}
        onStartGuessingPhase={handleStartGuessingPhase}
      />
    )
  } else if (gamePhase === 'gameplay') {
    content = (
      <GameplayPhase
        playerId={playerId}
        isHost={isHost}
        players={players}
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
