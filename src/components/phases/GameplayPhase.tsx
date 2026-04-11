interface GameplayPhaseProps {
  isHost: boolean
  secretWord: string
  onPlayAgain: () => void
  onEndGame: () => void
  onLeave: () => void
}

export default function GameplayPhase({ isHost, secretWord, onPlayAgain, onEndGame, onLeave }: GameplayPhaseProps) {
  const mySecretWord = secretWord

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

        <div className="w-full flex flex-col gap-3 mt-4">
          {isHost && (
            <>
              <button
                onClick={onPlayAgain}
                className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-xl py-3 font-semibold"
              >
                Play Again
              </button>
              <button
                onClick={onEndGame}
                className="w-full bg-rose-700 hover:bg-rose-600 transition-colors rounded-xl py-3 font-semibold"
              >
                End Game
              </button>
            </>
          )}
          <button
            onClick={onLeave}
            className="w-full text-gray-600 hover:text-gray-400 text-sm py-2 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}
