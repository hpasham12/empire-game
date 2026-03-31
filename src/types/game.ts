export interface Player {
  id: string
  nickname: string
  is_host: boolean
  secret_word: string | null
  assigned_read_word: string | null
}
