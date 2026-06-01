import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/service'
import { signAdminToken } from '@/lib/auth/admin-token'

export async function POST(req: NextRequest) {
  const { eventId, pin } = await req.json()
  if (!eventId || !pin) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: event } = await supabase
    .from('events')
    .select('admin_pin')
    .eq('id', eventId)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(pin, event.admin_pin)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = await signAdminToken(eventId)
  return NextResponse.json({ token })
}
