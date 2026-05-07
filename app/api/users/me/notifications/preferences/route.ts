import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'

// Stored as a JSON column on the User model via metadata, or as a separate
// preferences record. We use a simple upsert on a dedicated table-less approach:
// store preferences in a JSON field on the User model (notificationPreferences).
// Since the Prisma schema doesn't have a dedicated preferences model, we store
// it in the User.metadata field via a raw update, or we can use a simple
// key-value approach via a dedicated preferences table.
// For minimal implementation: store as JSON in a new field via prisma.$executeRaw
// or use an existing extensible field. We'll use a simple approach: store in
// a JSON column by extending the user record with a metadata field.

// Since the schema uses User model without a preferences field, we'll store
// preferences in a separate Notification record with channel=EMAIL and
// eventType='preferences' as a convention, or better: use prisma's Json field.
// The cleanest approach without schema changes: store in a dedicated preferences
// object using the existing infrastructure.

// We'll use a simple in-memory + DB approach: store as a JSON blob in a
// dedicated preferences record using the Notification model with a special
// eventType marker, or add a UserPreferences concept.
// For MVP: store as a JSON payload in a single Notification record per user
// with eventType='email_preferences' that we upsert.

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const preferences = await req.json()

    // Validate: preferences should be a Record<eventType, boolean>
    if (typeof preferences !== 'object' || Array.isArray(preferences)) {
      return NextResponse.json({ error: 'preferences must be an object' }, { status: 400 })
    }

    // Upsert preferences as a special notification record
    const existing = await prisma.notification.findFirst({
      where: { userId: session.sub, eventType: 'email_preferences' },
    })

    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: { payload: preferences },
      })
    } else {
      await prisma.notification.create({
        data: {
          userId: session.sub,
          channel: 'EMAIL',
          eventType: 'email_preferences',
          payload: preferences,
          delivered: true,
        },
      })
    }

    return NextResponse.json({ success: true, preferences })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to update preferences'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)

    const record = await prisma.notification.findFirst({
      where: { userId: session.sub, eventType: 'email_preferences' },
    })

    return NextResponse.json({ preferences: record?.payload ?? {} })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch preferences'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
