import { useEffect, useState } from 'react'
import Home from './components/Home'
import GameRoom from './components/GameRoom'
import { supabase } from './supabaseClient'

type View = 'home' | 'game'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [roomCode, setRoomCode] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [isHost, setIsHost] = useState(false)

  useEffect(() => {
    async function restore() {
      const savedPlayerId = localStorage.getItem('playerId')
      const savedRoomCode = localStorage.getItem('roomCode')
      const savedIsHost = localStorage.getItem('isHost') === 'true'

      const urlParams = new URLSearchParams(window.location.search)
      const urlRoomCode = urlParams.get('room')

      const playerIdToUse = savedPlayerId
      const roomCodeToUse = savedRoomCode || urlRoomCode

      if (!playerIdToUse || !roomCodeToUse) return

      const { data: player } = await supabase
        .from('players')
        .select('id, is_host')
        .eq('id', playerIdToUse)
        .single()

      if (!player) {
        localStorage.removeItem('playerId')
        localStorage.removeItem('roomCode')
        localStorage.removeItem('isHost')
        const url = new URL(window.location.href)
        url.searchParams.delete('room')
        window.history.replaceState({}, '', url)
        return
      }

      setPlayerId(playerIdToUse)
      setRoomCode(roomCodeToUse)
      setIsHost(savedIsHost)
      setView('game')
    }

    restore()
  }, [])

  function handleEnterRoom(code: string, pid: string, host: boolean) {
    setRoomCode(code)
    setPlayerId(pid)
    setIsHost(host)
    setView('game')

    localStorage.setItem('playerId', pid)
    localStorage.setItem('roomCode', code)
    localStorage.setItem('isHost', String(host))

    const url = new URL(window.location.href)
    url.searchParams.set('room', code)
    window.history.replaceState({}, '', url)
  }

  function handleLeave() {
    localStorage.removeItem('playerId')
    localStorage.removeItem('roomCode')
    localStorage.removeItem('isHost')

    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, '', url)

    setRoomCode('')
    setPlayerId('')
    setIsHost(false)
    setView('home')
  }

  if (view === 'game') {
    return (
      <GameRoom
        roomCode={roomCode}
        playerId={playerId}
        isHost={isHost}
        onLeave={handleLeave}
      />
    )
  }

  return <Home onEnterRoom={handleEnterRoom} />
}
