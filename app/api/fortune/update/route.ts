import { prisma } from '@/lib/db'
import { formatCardForAI } from '@/lib/tarot-cards'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/fortune/update
 *
 * Update a fortune draft after minting (success or failure).
 *
 * Body for SUCCESS:
 * {
 *   draftId: number,
 *   mintAddress: string,
 *   fortuneNumber: number,
 *   cards: [{id: number, inverted: boolean}],
 *   signature: string,
 *   status: 'pending_interpretation'
 * }
 *
 * Body for FAILURE:
 * {
 *   draftId: number,
 *   status: 'failed',
 *   errorMessage: string
 * }
 *
 * Returns:
 * {
 *   success: true
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { draftId, status, mintAddress, fortuneNumber, cards, signature, errorMessage } = body

    // Validate required fields
    if (!draftId || typeof draftId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'draftId is required and must be a number' },
        { status: 400 }
      )
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending_interpretation', 'completed', 'failed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if draft exists
    const existingFortune = await prisma.fortune.findUnique({
      where: { id: draftId },
    })

    if (!existingFortune) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Prepare update data based on status
    let updateData: any = { status }

    if (status === 'failed') {
      // Failed mint - save error message
      updateData.errorMessage = errorMessage || 'Unknown error'

      console.log('[Fortune Update] Failed:', {
        draftId,
        errorMessage: updateData.errorMessage,
      })

    } else if (status === 'pending_interpretation' || status === 'completed') {
      // Successful mint - save blockchain data
      if (!mintAddress || !fortuneNumber || !cards || !signature) {
        return NextResponse.json(
          { success: false, error: 'mintAddress, fortuneNumber, cards, and signature are required for successful mint' },
          { status: 400 }
        )
      }

      // Validate cards array
      if (!Array.isArray(cards) || cards.length !== 3) {
        return NextResponse.json(
          { success: false, error: 'cards must be an array of 3 cards' },
          { status: 400 }
        )
      }

      // Validate card structure
      for (const card of cards) {
        if (typeof card.id !== 'number' || typeof card.inverted !== 'boolean') {
          return NextResponse.json(
            { success: false, error: 'Invalid card structure. Each card must have id (number) and inverted (boolean)' },
            { status: 400 }
          )
        }
      }

      updateData = {
        ...updateData,
        mintAddress,
        fortuneNumber,
        cards,
        signature,
      }

      console.log('[Fortune Update] Success:', {
        draftId,
        mintAddress,
        fortuneNumber,
        cards,
      })
    }

    // Update the fortune record
    const updatedFortune = await prisma.fortune.update({
      where: { id: draftId },
      data: updateData,
    })

    // Trigger AI interpretation if mint succeeded
    if (status === 'pending_interpretation' && cards && Array.isArray(cards)) {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL ||
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

      try {
        await fetch(`${apiUrl}/api/tarot/interpret`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: updatedFortune.id,
            cards: cards.map(formatCardForAI),
            userQuery: updatedFortune.userQuery || ''
          })
        })
      } catch {
        // AI trigger failed silently - polling will handle timeout
      }
    }

    return NextResponse.json({
      success: true,
      fortune: {
        id: updatedFortune.id,
        status: updatedFortune.status,
        mintAddress: updatedFortune.mintAddress,
      },
    })

  } catch (error) {
    console.error('[Fortune Update] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update draft',
      },
      { status: 500 }
    )
  }
}
