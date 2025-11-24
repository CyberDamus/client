import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/cleanup
 *
 * Cleanup cron job - deletes old pending_mint records.
 * Runs daily at midnight UTC via Vercel Cron.
 *
 * Deletes records where:
 * - status = 'pending_mint'
 * - created_at < 24 hours ago
 *
 * Returns:
 * {
 *   success: true,
 *   deleted: number
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - 24)

    console.log('[Cleanup Cron] Starting cleanup for records older than:', cutoffTime.toISOString())

    // Delete old pending_mint records
    const result = await prisma.fortune.deleteMany({
      where: {
        status: 'pending_mint',
        createdAt: {
          lt: cutoffTime,
        },
      },
    })

    console.log('[Cleanup Cron] Deleted records:', result.count)

    return NextResponse.json({
      success: true,
      deleted: result.count,
      cutoffTime: cutoffTime.toISOString(),
    })

  } catch (error) {
    console.error('[Cleanup Cron] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      },
      { status: 500 }
    )
  }
}
