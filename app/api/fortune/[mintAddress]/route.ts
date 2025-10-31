import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fortune/[mintAddress]
 *
 * Get fortune details by mint address.
 * This will be used in History page and for displaying full fortune details.
 *
 * Returns:
 * {
 *   success: true,
 *   fortune: {
 *     id: number,
 *     mintAddress: string,
 *     walletAddress: string,
 *     fortuneNumber: number,
 *     signature: string,
 *     userQuery: string | null,
 *     cards: [{id: number, inverted: boolean}],
 *     interpretation: string | null,
 *     status: string,
 *     createdAt: string
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mintAddress: string }> }
) {
  try {
    const { mintAddress } = await params

    // Validate mint address
    if (!mintAddress || typeof mintAddress !== 'string') {
      return NextResponse.json(
        { success: false, error: 'mintAddress is required' },
        { status: 400 }
      )
    }

    // Find fortune by mint address
    const fortune = await prisma.fortune.findUnique({
      where: { mintAddress },
    })

    if (!fortune) {
      return NextResponse.json(
        { success: false, error: 'Fortune not found' },
        { status: 404 }
      )
    }

    // Return fortune data
    return NextResponse.json({
      success: true,
      fortune: {
        id: fortune.id,
        mintAddress: fortune.mintAddress,
        walletAddress: fortune.walletAddress,
        fortuneNumber: fortune.fortuneNumber,
        signature: fortune.signature,
        userQuery: fortune.userQuery,
        cards: fortune.cards,
        interpretation: fortune.interpretation,
        status: fortune.status,
        createdAt: fortune.createdAt.toISOString(),
      },
    })

  } catch (error) {
    console.error('[Fortune Get] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch fortune',
      },
      { status: 500 }
    )
  }
}
