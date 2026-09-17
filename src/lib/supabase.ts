import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
}

// Create a server-side Supabase client using the Service Role Key to bypass RLS.
// This client must NEVER be imported in client-side components.
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const DOCUMENTS_BUCKET = 'documents';

let bucketEnsured = false;
export async function ensureDocumentsBucket() {
  if (bucketEnsured) return;
  try {
    // Attempt to create bucket if it doesn't already exist.
    // Kept private so all file access requires key verification via short-lived signed URLs.
    await supabaseServer.storage.createBucket(DOCUMENTS_BUCKET, {
      public: false,
      fileSizeLimit: 5242880, // 5MB
    });
    bucketEnsured = true;
  } catch {
    // Bucket already exists or created by another worker
    bucketEnsured = true;
  }
}
