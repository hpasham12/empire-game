import type { Player } from '../../types/game'

interface InputPhaseProps {
  playerId: string
  isHost: boolean
  players: Player[]
  category: string
  submitted: boolean
  wordInput: string
  onWordInputChange: (value: string) => void
  onSubmitWord: () => void
  onDistributeWords: () => void
}

export default function InputPhase({
  isHost,
  players,
  category,
  submitted,
  wordInput,
  onWordInputChange,
  onSubmitWord,
  onDistributeWords,
}: InputPhaseProps) {
  const submittedCount = players.filter(p => p.secret_word).length
  const allSubmitted = players.length > 0 && submittedCount === players.length

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Current Category</p>
          <p className="text-4xl font-bold text-indigo-400">{category}</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-5">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-green-400 font-semibold text-lg mb-1">Word submitted!</p>
              <p className="text-gray-500 text-sm">Waiting for other players…</p>
            </div>
          ) : (
            <>
              <label className="block text-sm text-gray-400 mb-1.5">
                Your secret word
              </label>
              <input
                type="text"
                placeholder={`A ${category} name…`}
                value={wordInput}
                onChange={e => onWordInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSubmitWord()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                autoFocus
              />
              <button
                onClick={onSubmitWord}
                disabled={!wordInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-xl py-3 font-semibold"
              >
                Submit
              </button>
            </>
          )}
        </div>

        {isHost && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                Player Progress
              </h2>
              <span className={`text-sm font-bold ${allSubmitted ? 'text-green-400' : 'text-gray-300'}`}>
                {submittedCount}/{players.length} ready
              </span>
            </div>
            <ul className="flex flex-col gap-2 mb-4">
              {players.map(p => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2"
                >
                  <span className="text-sm font-medium">{p.nickname}</span>
                  {p.secret_word ? (
                    <span className="text-green-400 text-xs font-semibold">Ready ✓</span>
                  ) : (
                    <span className="text-gray-600 text-xs">Waiting…</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={onDistributeWords}
              disabled={!allSubmitted}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-xl py-3 font-semibold"
            >
              Distribute Words
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
