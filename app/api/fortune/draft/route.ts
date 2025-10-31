import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/fortune/draft
 *
 * Create a fortune draft before minting.
 * This is called when user clicks "Decrypt Your Fate" button.
 *
 * Body:
 * {
 *   walletAddress: string,  // User's Solana wallet address
 *   userQuery?: string      // Optional user question (max 256 chars)
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   draftId: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, userQuery } = body

    // Validate required fields
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { success: false, error: 'walletAddress is required' },
        { status: 400 }
      )
    }

    // Validate wallet address format (Solana addresses are base58, 32-44 chars)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Validate user query length (optional, max 256 chars)
    if (userQuery !== undefined && userQuery !== null && userQuery !== '') {
      if (typeof userQuery !== 'string' || userQuery.length > 256) {
        return NextResponse.json(
          { success: false, error: 'userQuery must be a string with max 256 characters' },
          { status: 400 }
        )
      }
    }

    // Create draft fortune record
    const fortune = await prisma.fortune.create({
      data: {
        walletAddress,
        userQuery: userQuery || null,
        status: 'pending_mint',
      },
    })

    console.log('[Fortune Draft] Created:', {
      draftId: fortune.id,
      walletAddress,
      hasQuery: !!userQuery,
    })

    return NextResponse.json({
      success: true,
      draftId: fortune.id,
    })

  } catch (error) {
    console.error('[Fortune Draft] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create draft',
      },
      { status: 500 }
    )
  }
}
