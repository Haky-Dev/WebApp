export type EventStatus = 'collecting' | 'drawing' | 'closed'

export interface TournamentEvent {
  id: string
  name: string
  status: EventStatus
  created_at: string
}

export interface ExpectedParticipant {
  id: string
  event_id: string
  name: string
}

export interface Participant {
  id: string
  event_id: string
  name: string
  club: string | null
  rating: number
  registered_at: string
}

export interface Pair {
  id: string
  event_id: string
  team_number: number
  group_label: string | null
  participant_a_id: string
  participant_b_id: string
  participant_a?: Participant
  participant_b?: Participant
}

export interface Club {
  id: string
  name: string
  created_at: string
}
