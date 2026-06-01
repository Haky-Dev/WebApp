import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pairs')
    .select(`
      id,
      event_id,
      team_number,
      participant_a_id,
      participant_b_id,
      participant_a:participants!pairs_participant_a_id_fkey(id, name, club, rating),
      participant_b:participants!pairs_participant_b_id_fkey(id, name, club, rating)
    `)
    .eq('event_id', eventId)
    .order('team_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
