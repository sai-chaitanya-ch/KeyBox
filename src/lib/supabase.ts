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
    const { data: buckets } = await supabaseServer.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === DOCUMENTS_BUCKET);
    if (!exists) {
      await supabaseServer.storage.createBucket(DOCUMENTS_BUCKET, {
        public: true,
        fileSizeLimit: 5242880, // 5MB; application validation requires files to be smaller
      });
    } else {
      await supabaseServer.storage.updateBucket(DOCUMENTS_BUCKET, {
        public: true,
        fileSizeLimit: 5242880,
      });
    }
    bucketEnsured = true;
  } catch (err) {
    console.error('Failed to ensure documents storage bucket:', err);
  }
}
