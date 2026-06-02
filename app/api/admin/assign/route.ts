import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveEventId } from '@/lib/auth/admin-token'
import { snakeDraft } from '@/lib/algorithms/snake-draft'
import { groupRandom } from '@/lib/algorithms/group-random'
import type { Participant } from '@/lib/types'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const eventId = await resolveEventId(token)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { algorithm, groupCount, excludeId, tempParticipant } = await req.json()

  const supabase = createServiceClient()

  const { data: eventRecord } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (!eventRecord) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (eventRecord.status === 'closed') {
    return NextResponse.json({ error: 'Assignment already completed' }, { status: 409 })
  }

  const { data: allParticipants, error: pErr } = await supabase
    .from('participants')
    .select('*')
    .eq('event_id', eventId)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  let participants: Participant[] = allParticipants ?? []

  if (excludeId) {
    participants = participants.filter(p => p.id !== excludeId)
  }

  // Build local temp participant for algorithm (not yet in DB)
  let tempParticipantRecord: Participant | null = null
  if (tempParticipant) {
    tempParticipantRecord = {
      id: 'temp',
      event_id: eventId,
      name: tempParticipant.name,
      club: tempParticipant.club || null,
      rating: tempParticipant.rating,
      registered_at: new Date().toISOString(),
    }
    participants.push(tempParticipantRecord)
  }

  if (participants.length % 2 !== 0) {
    return NextResponse.json({ error: 'Odd number of participants' }, { status: 400 })
  }

  // Run algorithm
  let pairs
  try {
    if (algorithm === 'snake') {
      pairs = snakeDraft(participants)
    } else if (algorithm === 'group-random') {
      pairs = groupRandom(participants, groupCount as 2 | 4)
    } else {
      return NextResponse.json({ error: 'Unknown algorithm' }, { status: 400 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Algorithm error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Now that algorithm succeeded, persist temp participant if needed
  if (tempParticipantRecord) {
    const { data: realTemp, error: tErr } = await supabase
      .from('participants')
      .insert({
        event_id: eventId,
        name: tempParticipantRecord.name,
        club: tempParticipantRecord.club,
        rating: tempParticipantRecord.rating,
      })
      .select()
      .single()
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
    // Replace temp id in pairs with real DB id
    for (const pair of pairs) {
      if (pair.a.id === 'temp') pair.a = realTemp
      if (pair.b.id === 'temp') pair.b = realTemp
    }
  }

  const pairRows = pairs.map((p, i) => ({
    event_id: eventId,
    team_number: i + 1,
    participant_a_id: p.a.id,
    participant_b_id: p.b.id,
  }))

  const { error: insertErr } = await supabase.from('pairs').insert(pairRows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  await supabase.from('events').update({ status: 'closed' }).eq('id', eventId)

  return NextResponse.json({ success: true, teamCount: pairs.length })
}
