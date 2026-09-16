import { supabaseServer, DOCUMENTS_BUCKET } from '@/lib/supabase';

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  deletedFilesCount: number;
  timestamp: string;
}

/**
 * Performs actual physical deletion of expired KeyBox records and their associated
 * document files from Supabase Storage.
 *
 * Expiration condition: expires_at <= now()
 */
export async function performCleanup(): Promise<CleanupResult> {
  const now = new Date().toISOString();

  // 1. Fetch expired records to identify associated document files in storage
  const { data: expiredRecords, error: fetchError } = await supabaseServer
    .from('keyboxes')
    .select('id, content_type, content')
    .lte('expires_at', now);

  if (fetchError) {
    console.error('[Cleanup] Error fetching expired records:', fetchError);
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
          console.error('[Cleanup] Failed to parse expired document metadata for record', record.id, e);
        }
      }
    }

    // Physically delete expired document files from Supabase Storage
    if (storagePathsToDelete.length > 0) {
      const { data: removedFiles, error: storageDelError } = await supabaseServer.storage
        .from(DOCUMENTS_BUCKET)
        .remove(storagePathsToDelete);

      if (storageDelError) {
        console.error('[Cleanup] Error deleting expired files from storage:', storageDelError);
      } else {
        deletedFilesCount = removedFiles?.length ?? storagePathsToDelete.length;
        console.log(`[Cleanup] Physically deleted ${deletedFilesCount} expired files from storage.`);
      }
    }
  }

  // 2. Physically delete expired records from the database table
  const { error: deleteError, count } = await supabaseServer
    .from('keyboxes')
    .delete({ count: 'exact' })
    .lte('expires_at', now);

  if (deleteError) {
    console.error('[Cleanup] Database error deleting expired keyboxes:', deleteError);
    throw new Error(`Failed to delete expired records: [${deleteError.code}] ${deleteError.message}`);
  }

  const deletedCount = count ?? 0;
  console.log(`[Cleanup] Successfully executed: ${deletedCount} records and ${deletedFilesCount} files deleted at ${now}`);

  return {
    success: true,
    deletedCount,
    deletedFilesCount,
    timestamp: now,
  };
}
