import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // 1. Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    
    // In production, enforce secret validation if CRON_SECRET is defined.
    // If not in production (or CRON_SECRET is not configured yet), allow execution for setup/testing.
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // 2. Delete expired records: expires_at <= now()
    const { error, count } = await supabaseServer
      .from('keyboxes')
      .delete({ count: 'exact' })
      .lte('expires_at', now);

    if (error) {
      console.error('Cron cleanup error:', error);
      return NextResponse.json({ error: 'Failed to clean up expired records.' }, { status: 500 });
    }

    console.log(`Cron cleanup successfully executed. Deleted ${count ?? 0} records.`);

    return NextResponse.json({
      success: true,
      deleted_count: count ?? 0,
      timestamp: now,
    });
  } catch (err) {
    console.error('Unexpected error in cron cleanup:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
