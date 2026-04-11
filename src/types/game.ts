export interface Player {
  id: string
  nickname: string
  is_host: boolean
  has_submitted: boolean
}

// A player's private words, stored in a separate table readable only by its owner.
export interface PlayerSecret {
  secret_word: string | null
  assigned_read_word: string | null
}
