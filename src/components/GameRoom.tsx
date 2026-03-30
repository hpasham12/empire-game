interface GameRoomProps {
  roomCode: string
  playerId: string
  onLeave: () => void
}

export default function GameRoom({ roomCode, playerId, onLeave }: GameRoomProps) {
  return (
    <div>
      <h1>Room: {roomCode}</h1>
      <p>Player ID: {playerId}</p>
      <button onClick={onLeave}>Leave Room</button>
    </div>
  )
}
