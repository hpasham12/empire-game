import type { Player } from '../../types/game'

interface GameplayPhaseProps {
  playerId: string
  isHost: boolean
  players: Player[]
  onEndGame: () => void
}

export default function GameplayPhase({ playerId, isHost, players, onEndGame }: GameplayPhaseProps) {
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
            onClick={onEndGame}
            className="w-full bg-rose-700 hover:bg-rose-600 transition-colors rounded-xl py-3 font-semibold mt-4"
          >
            End Game / Play Again
          </button>
        )}
      </div>
    </div>
  )
}
