import type { Player } from '../../types/game'

interface ReadingPhaseProps {
  playerId: string
  isHost: boolean
  players: Player[]
  onStartGuessingPhase: () => void
}

export default function ReadingPhase({ playerId, isHost, players, onStartGuessingPhase }: ReadingPhaseProps) {
  const me = players.find(p => p.id === playerId)
  const myWord = me?.assigned_read_word ?? ''

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Your Word</p>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl px-10 py-10 mt-2">
            <p className="text-5xl font-bold text-indigo-400 tracking-wide">{myWord}</p>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Read this word aloud to the group when it is your turn.
          </p>
        </div>

        {isHost && (
          <button
            onClick={onStartGuessingPhase}
            className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-xl py-3 font-semibold"
          >
            Start Guessing Phase
          </button>
        )}
      </div>
    </div>
  )
}
