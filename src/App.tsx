import { useState } from 'react'
import Home from './components/Home'
import GameRoom from './components/GameRoom'

type View = 'home' | 'game'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [roomCode, setRoomCode] = useState('')
  const [playerId, setPlayerId] = useState('')

  function handleEnterRoom(code: string, pid: string) {
    setRoomCode(code)
    setPlayerId(pid)
    setView('game')
  }

  function handleLeave() {
    setRoomCode('')
    setPlayerId('')
    setView('home')
  }

  if (view === 'game') {
    return (
      <GameRoom
        roomCode={roomCode}
        playerId={playerId}
        onLeave={handleLeave}
      />
    )
  }

  return <Home onEnterRoom={handleEnterRoom} />
}
