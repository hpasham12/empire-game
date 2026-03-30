interface HomeProps {
  onEnterRoom: (roomCode: string, playerId: string) => void
}

export default function Home({ onEnterRoom }: HomeProps) {
  return (
    <div>
      <h1>Empire Game</h1>
      <p>Home screen — create or join a room here.</p>
      {/* Temporary: jump straight to a room for dev purposes */}
      <button onClick={() => onEnterRoom('TEST', 'placeholder-player-id')}>
        Enter Room (dev)
      </button>
    </div>
  )
}
