import { NextRequest, NextResponse } from 'next/server'

const HETZNER_AI_URL = process.env.HETZNER_AI_URL || 'http://localhost:3001'
const HETZNER_TRIGGER_SECRET = process.env.HETZNER_TRIGGER_SECRET || ''

interface Card {
  id: number
  name: string
  meaning?: string
  inverted?: boolean
}

/**
 * POST /api/tarot/interpret
 *
 * Triggers AI interpretation generation on Hetzner server (fire-and-forget).
 * Client should poll DB for results.
 *
 * Body:
 * {
 *   draftId: number,  // Fortune draft ID from DB
 *   cards: Card[],    // Array of 3 cards
 *   userQuery?: string  // Optional user question
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   status: "triggered",
 *   draftId: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { draftId, cards, userQuery } = body

    // Validate input
    if (!draftId || typeof draftId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'draftId is required and must be a number' },
        { status: 400 }
      )
    }

    if (!cards || !Array.isArray(cards) || cards.length !== 3) {
      return NextResponse.json(
        { success: false, error: 'Expected exactly 3 cards' },
        { status: 400 }
      )
    }

    if (!HETZNER_TRIGGER_SECRET) {
      console.error('[Tarot AI] HETZNER_TRIGGER_SECRET not configured!')
      return NextResponse.json(
        { success: false, error: 'AI server not configured' },
        { status: 503 }
      )
    }

    console.log(`[Tarot AI] Triggering Hetzner for draft ${draftId}`)
    console.log('[Tarot AI] Cards:', cards.map(c => `${c.name} (${c.inverted ? 'inv' : 'up'})`).join(', '))
    console.log('[Tarot AI] User query:', userQuery || '(none)')

    // Trigger Hetzner server (fire-and-forget with short timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout (just for trigger)

    try {
      const response = await fetch(`${HETZNER_AI_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: HETZNER_TRIGGER_SECRET,
          draftId,
          cards: cards.map(c => ({
            id: c.id,
            name: c.name,
            inverted: c.inverted || false
          })),
          userQuery: userQuery || ''
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Tarot AI] Hetzner trigger failed:', response.status, errorText)
        throw new Error(`Hetzner server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.status !== 'triggered') {
        console.error('[Tarot AI] Unexpected response from Hetzner:', data)
        throw new Error('Invalid response from AI server')
      }

      console.log(`[Tarot AI] ✅ Successfully triggered draft ${draftId}`)

      return NextResponse.json({
        success: true,
        status: 'triggered',
        draftId
      })

    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      // Handle timeout
      if (fetchError.name === 'AbortError') {
        console.error('[Tarot AI] Trigger timeout (5s)')
        return NextResponse.json(
          { success: false, error: 'AI server trigger timed out. Please try again.' },
          { status: 504 }
        )
      }

      // Handle connection errors
      if (fetchError.message?.includes('ECONNREFUSED') || fetchError.message?.includes('fetch failed')) {
        console.error('[Tarot AI] Cannot reach Hetzner server:', HETZNER_AI_URL)
        return NextResponse.json(
          { success: false, error: 'AI server is unreachable.' },
          { status: 503 }
        )
      }

      throw fetchError
    }

  } catch (error) {
    console.error('[Tarot AI] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger AI generation'
      },
      { status: 500 }
    )
  }
}
