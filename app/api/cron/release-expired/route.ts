import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { releaseExpiredReservations } from '@/services/transactionService';

/**
 * Puts the stock and sale quota held by abandoned checkouts back on sale.
 *
 * Meant to be called by a scheduler, not by a person. Guarded by a shared
 * secret rather than a user token: the caller is infrastructure, and any
 * signed-in customer being able to trigger a sweep is not a power worth
 * handing out.
 */

/** `null` when the endpoint is ready to be called. */
function authorizationProblem(request: Request): { status: number; error: string } | null {
  const secret = process.env.CRON_SECRET;

  // Refused outright rather than left open: an unconfigured secret would
  // otherwise make this a public endpoint that cancels orders.
  if (!secret) {
    return { status: 500, error: 'CRON_SECRET is not configured' };
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return { status: 401, error: 'Unauthorized' };
  }

  return null;
}

async function run(request: Request) {
  const problem = authorizationProblem(request);
  if (problem) {
    return NextResponse.json({ error: problem.error }, { status: problem.status });
  }

  try {
    const result = await releaseExpiredReservations();

    if (result.released > 0 || result.failed.length > 0) {
      logger.info('Released expired order reservations', {
        released: result.released,
        failed: result.failed.length,
      });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error(
      'Failed to release expired reservations',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to release expired reservations' }, { status: 500 });
  }
}

/** Vercel Cron sends GET; a system cron entry would more likely send POST. */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
