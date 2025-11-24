import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fortune/by-id/[id]
 *
 * Get fortune details by internal ID (used for polling after mint).
 *
 * Returns:
 * {
 *   success: true,
 *   fortune: {
 *     id: number,
 *     mintAddress: string | null,
 *     fortuneNumber: number | null,
 *     cards: [{id: number, inverted: boolean}] | null,
 *     interpretation: string | null,
 *     aiStatus: string,
 *     aiError: string | null,
 *     status: string
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Parse ID
    const fortuneId = parseInt(id, 10)
    if (isNaN(fortuneId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' },
        { status: 400 }
      )
    }

    // Find fortune by ID
    const fortune = await prisma.fortune.findUnique({
      where: { id: fortuneId },
    })

    if (!fortune) {
      return NextResponse.json(
        { success: false, error: 'Fortune not found' },
        { status: 404 }
      )
    }

    // Return fortune data (minimal fields for polling)
    return NextResponse.json({
      success: true,
      fortune: {
        id: fortune.id,
        mintAddress: fortune.mintAddress,
        fortuneNumber: fortune.fortuneNumber,
        cards: fortune.cards,
        interpretation: fortune.interpretation,
        aiStatus: fortune.aiStatus,
        aiError: fortune.aiError,
        status: fortune.status,
      },
    })

  } catch (error) {
    console.error('[Fortune By ID] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch fortune',
      },
      { status: 500 }
    )
  }
}
