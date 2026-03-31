interface InstructionsModalProps {
  onClose: () => void
}

export default function InstructionsModal({ onClose }: InstructionsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">How to Play Empire</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed mb-5">
          Welcome to Empire, a party game of memory, deduction, and keeping a perfect poker face.
          The goal of the game is to correctly guess the secret identities of your friends and
          absorb everyone into your massive empire!
        </p>

        <div className="space-y-5 text-gray-300 text-sm leading-relaxed">
          <section>
            <h3 className="text-white font-semibold mb-2">Phase 1: Setup &amp; Submission</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-white font-medium">Join the Room:</span> One player creates a
                room and acts as the Host. Everyone else joins using the 4-letter Room Code on their
                devices.
              </li>
              <li>
                <span className="text-white font-medium">The Category:</span> The Host will announce
                the category for the round (e.g., "Famous Actors," "Fictional Characters," "Types of
                Food").
              </li>
              <li>
                <span className="text-white font-medium">Submit Your Secret Word:</span> Type a word
                fitting the category into your device and hit submit. Keep it a secret — do not let
                anyone see what you wrote.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">Phase 2: The Reading Phase</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-white font-medium">Listen Carefully:</span> Once everyone has
                submitted, the app shuffles all the words and randomly sends one to every player's
                screen.
              </li>
              <li>
                <span className="text-white font-medium">Read Aloud:</span> Go around the circle and
                have everyone clearly read the word on their screen out loud. (Because it is truly
                random, you might get your own word — just read it normally and do not give it away!)
              </li>
              <li>
                <span className="text-white font-medium">Memorize:</span> This is the only time the
                list of words will be read. Once the Host ends the reading phase, put your phones
                down. You may only peek at your own original secret word if you forget it.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">Phase 3: Building Your Empire</h3>
            <p className="mb-2">
              Make sure everyone is sitting in a physical circle. Nominate one person to take the
              first turn.
            </p>
            <ul className="space-y-2">
              <li>
                <span className="text-white font-medium">Making a Guess:</span> On your turn, ask
                another player if they are a specific word from the list. (e.g., "Sarah, are you
                Batman?")
              </li>
              <li>
                <span className="text-white font-medium">If You Guess Correctly:</span> The player
                joins your Empire! They physically move to sit next to you (everyone else scoots to
                close the gap), and you get to guess again immediately.
              </li>
              <li>
                <span className="text-white font-medium">If You Guess Wrong:</span> Your turn ends
                immediately. The turn passes to the person you just guessed (or the next available
                empire head in the circle order).
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">Phase 4: Stealing Empires &amp; Rules of Engagement</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-white font-medium">The Head of the Empire:</span> The person
                who made the correct guess is the "Head." Everyone captured by them are "Subjects."
              </li>
              <li>
                <span className="text-white font-medium">Subjects Lose Their Turn:</span> Once in an
                empire, you lose your individual turn. Only the Head can make official guesses.
              </li>
              <li>
                <span className="text-white font-medium">Conferring:</span> Subjects can quietly
                talk with their Head and empire to figure out who is left.
              </li>
              <li>
                <span className="text-white font-medium">Stealing an Empire:</span> Guess the
                identity of an empire's Head. If correct, the Head and all their Subjects physically
                move to sit next to you!
              </li>
              <li>
                <span className="text-white font-medium">Invalid Moves:</span> You cannot guess a
                Subject who is already captured. Doing so automatically ends your turn.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-2">Winning the Game</h3>
            <p>
              The game ends when one player has successfully guessed the identities of all remaining
              empire heads, absorbing every single player in the room into their ultimate Empire!
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
