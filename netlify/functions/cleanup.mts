import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const DOCUMENTS_BUCKET = 'documents';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in Netlify.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Performs physical deletion of expired KeyBox records and their associated
 * document files from Supabase Storage.
 *
 * Condition: expires_at <= now()
 */
export async function performCleanup() {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // 1. Fetch expired records to identify associated document files in storage
  const { data: expiredRecords, error: fetchError } = await supabase
    .from('keyboxes')
    .select('id, content_type, content')
    .lte('expires_at', now);

  if (fetchError) {
    console.error('[Netlify Cleanup] Error fetching expired records:', fetchError);
    throw new Error(`Failed to fetch expired records: [${fetchError.code}] ${fetchError.message}`);
  }

  let deletedFilesCount = 0;

  if (expiredRecords && expiredRecords.length > 0) {
    const storagePathsToDelete: string[] = [];

    for (const record of expiredRecords) {
      const isDoc =
        record.content_type === 'document' ||
        (record.content_type === 'text' && record.content?.startsWith('__KEYBOX_DOCUMENT__:'));

      if (isDoc && record.content) {
        try {
          const rawJson = record.content.startsWith('__KEYBOX_DOCUMENT__:')
            ? record.content.replace('__KEYBOX_DOCUMENT__:', '')
            : record.content;
          const meta = JSON.parse(rawJson);
          if (meta?.storagePath && typeof meta.storagePath === 'string') {
            storagePathsToDelete.push(meta.storagePath);
          }
        } catch (e) {
          console.error('[Netlify Cleanup] Failed to parse expired document metadata for record', record.id, e);
        }
      }
    }

    // Physically delete expired document files from Supabase Storage
    if (storagePathsToDelete.length > 0) {
      const { data: removedFiles, error: storageDelError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove(storagePathsToDelete);

      if (storageDelError) {
        console.error('[Netlify Cleanup] Error deleting expired files from storage:', storageDelError);
      } else {
        deletedFilesCount = removedFiles?.length ?? storagePathsToDelete.length;
        console.log(`[Netlify Cleanup] Physically deleted ${deletedFilesCount} expired files from storage.`);
      }
    }
  }

  // 2. Physically delete expired records from the database table
  const { error: deleteError, count } = await supabase
    .from('keyboxes')
    .delete({ count: 'exact' })
    .lte('expires_at', now);

  if (deleteError) {
    console.error('[Netlify Cleanup] Database error deleting expired keyboxes:', deleteError);
    throw new Error(`Failed to delete expired records: [${deleteError.code}] ${deleteError.message}`);
  }

  const deletedCount = count ?? 0;
  console.log(
    `[Netlify Cleanup] Successfully executed: ${deletedCount} records and ${deletedFilesCount} files deleted at ${now}`
  );

  return {
    success: true,
    deletedCount,
    deletedFilesCount,
    timestamp: now,
  };
}

/**
 * Netlify Scheduled Function: Runs every 10 minutes ("* /10 * * * *").
 * Automatically invoked in the background by Netlify.
 * Not reachable via public HTTP.
 */
export const handler = schedule('*/10 * * * *', async () => {
  try {
    const result = await performCleanup();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('[Netlify Scheduled Cleanup] Error executing scheduled cleanup:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Cleanup failed',
      }),
    };
  }
});
