import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/fortune/pending?wallet=<address>
 *
 * Finds pending AI fortune for reconnect scenarios.
 * Returns most recent fortune with aiStatus = "pending" or "processing"
 *
 * Query params:
 * - wallet: Solana wallet address
 *
 * Returns:
 * {
 *   success: true,
 *   fortune: {
 *     id: number,
 *     aiStatus: string,
 *     interpretation?: string,
 *     aiError?: string
 *   } | null
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'wallet parameter is required' },
        { status: 400 }
      )
    }

    console.log(`[Fortune Pending] Checking wallet: ${wallet}`)

    // Find most recent pending/processing fortune for this wallet
    const fortune = await prisma.fortune.findFirst({
      where: {
        walletAddress: wallet,
        aiStatus: {
          in: ['pending', 'processing']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        aiStatus: true,
        interpretation: true,
        aiError: true
      }
    })

    if (!fortune) {
      console.log(`[Fortune Pending] No pending fortunes found`)
      return NextResponse.json({
        success: true,
        fortune: null
      })
    }

    console.log(`[Fortune Pending] Found pending fortune ${fortune.id}, status: ${fortune.aiStatus}`)

    return NextResponse.json({
      success: true,
      fortune
    })

  } catch (error) {
    console.error('[Fortune Pending] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check pending fortunes'
      },
      { status: 500 }
    )
  }
}
