# Empire

A multiplayer party game of memory, deduction, and keeping a perfect poker face. Players try to correctly guess the secret identities of their friends and absorb everyone into their empire.

## How to Play

1. **Setup** — One player creates a room and shares the 4-letter code. Everyone joins and the host announces a category (e.g., Famous Actors, Fictional Characters).
2. **Submit** — Each player submits a secret word fitting the category.
3. **Read** — The app shuffles and assigns words. Each player reads their assigned word aloud, then everyone puts their phones down.
4. **Guess** — Players take turns guessing who has which word. A correct guess brings that player into your empire and earns you another turn. A wrong guess ends your turn.
5. **Steal** — Players in an empire lose their individual turns but help their Empire Head. You can steal an entire empire by correctly guessing the Head's word.
6. **Win** — Absorb all other players into your empire to win.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (with Rolldown/Oxc)
- **Tailwind CSS 4**
- **Supabase** — PostgreSQL backend with real-time subscriptions for live game state sync

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with `rooms` and `players` tables

### Setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:5173/empire-game/`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── App.tsx                  # Root component, handles Home ↔ GameRoom routing
├── supabaseClient.ts        # Supabase client initialization
├── types/game.ts            # Shared TypeScript types
└── components/
    ├── Home.tsx             # Room creation and joining
    ├── GameRoom.tsx         # Game state orchestration
    ├── InstructionsModal.tsx
    └── phases/
        ├── LobbyPhase.tsx   # Pre-game lobby
        ├── InputPhase.tsx   # Word submission
        ├── ReadingPhase.tsx # Word reveal
        └── GameplayPhase.tsx # Active guessing
```

## Deployment

The app is configured with `base: '/empire-game/'` for deployment to a subdirectory (e.g., GitHub Pages). Build with `npm run build` and serve the `dist/` folder as a static site.
