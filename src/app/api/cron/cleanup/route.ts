import { NextResponse } from 'next/server';
import { supabaseServer, DOCUMENTS_BUCKET } from '@/lib/supabase';

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

    // 2. Fetch expired records to clean up associated document files from storage
    const { data: expiredRecords } = await supabaseServer
      .from('keyboxes')
      .select('content_type, content')
      .lte('expires_at', now);

    if (expiredRecords && expiredRecords.length > 0) {
      const storagePathsToDelete: string[] = [];
      for (const record of expiredRecords) {
        const isDoc = record.content_type === 'document' ||
          (record.content_type === 'text' && record.content?.startsWith('__KEYBOX_DOCUMENT__:'));
        if (isDoc) {
          try {
            const rawJson = record.content.startsWith('__KEYBOX_DOCUMENT__:')
              ? record.content.replace('__KEYBOX_DOCUMENT__:', '')
              : record.content;
            const meta = JSON.parse(rawJson);
            if (meta.storagePath) {
              storagePathsToDelete.push(meta.storagePath);
            }
          } catch (e) {
            console.error('Error parsing expired document record:', e);
          }
        }
      }

      if (storagePathsToDelete.length > 0) {
        const { error: storageDelError } = await supabaseServer.storage
          .from(DOCUMENTS_BUCKET)
          .remove(storagePathsToDelete);
        if (storageDelError) {
          console.error('Failed to clean up expired document files from storage:', storageDelError);
        }
      }
    }

    // 3. Delete expired records from database: expires_at <= now()
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
