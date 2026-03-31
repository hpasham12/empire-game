import { useState } from 'react'
import Home from './components/Home'
import GameRoom from './components/GameRoom'

type View = 'home' | 'game'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [roomCode, setRoomCode] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [isHost, setIsHost] = useState(false)

  function handleEnterRoom(code: string, pid: string, host: boolean) {
    setRoomCode(code)
    setPlayerId(pid)
    setIsHost(host)
    setView('game')
  }

  function handleLeave() {
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
