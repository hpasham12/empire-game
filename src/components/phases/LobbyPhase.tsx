import type { Player } from '../../types/game'

interface LobbyPhaseProps {
  roomCode: string
  playerId: string
  isHost: boolean
  players: Player[]
  category: string
  onCategoryChange: (value: string) => void
  onStartGame: () => void
  onRemovePlayer: (id: string) => void
  onLeave: () => void
}

export default function LobbyPhase({
  roomCode,
  playerId,
  isHost,
  players,
  category,
  onCategoryChange,
  onStartGame,
  onRemovePlayer,
  onLeave,
}: LobbyPhaseProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Room Code</p>
          <p className="text-6xl font-bold tracking-[0.2em] text-indigo-400">{roomCode}</p>
          <p className="text-gray-500 text-sm mt-2">Share this code with your friends</p>
        </div>

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
                      onClick={() => onRemovePlayer(p.id)}
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

        {isHost && (
          <div className="mb-3">
            <label className="block text-sm text-gray-400 mb-1.5">
              Enter Category <span className="text-gray-600">(e.g., Famous People, Movies)</span>
            </label>
            <input
              type="text"
              placeholder="Famous People"
              value={category}
              onChange={e => onCategoryChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
            <button
              onClick={onStartGame}
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
