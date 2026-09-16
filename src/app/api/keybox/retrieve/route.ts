import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseServer, DOCUMENTS_BUCKET } from '@/lib/supabase';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: Request): string {
  // Get IP from common proxy headers
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can be a list of IPs, get the first one
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }
  return '127.0.0.1';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { access_key } = body;

    // Get client IP and hash it for privacy
    const ip = getClientIp(request);
    const ipHash = createHash('sha256').update(ip).digest('hex');

    // 1. Check rate limiting (failed attempts)
    const { data: attemptRecord } = await supabaseServer
      .from('failed_attempts')
      .select('attempts, last_attempt')
      .eq('ip_hash', ipHash)
      .maybeSingle();

    const now = new Date();
    let currentAttempts = 0;
    let isLocked = false;

    if (attemptRecord) {
      const lastAttemptTime = new Date(attemptRecord.last_attempt);
      const timeDifference = now.getTime() - lastAttemptTime.getTime();

      if (timeDifference < LOCKOUT_PERIOD_MS) {
        currentAttempts = attemptRecord.attempts;
        if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
          isLocked = true;
        }
      } else {
        // Reset count if the lockout period has passed
        currentAttempts = 0;
        await supabaseServer
          .from('failed_attempts')
          .delete()
          .eq('ip_hash', ipHash);
      }
    }

    if (isLocked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Helper to increment failed attempts
    const registerFailedAttempt = async () => {
      const nextAttempts = currentAttempts + 1;
      await supabaseServer
        .from('failed_attempts')
        .upsert({
          ip_hash: ipHash,
          attempts: nextAttempts,
          last_attempt: now.toISOString(),
        });
    };

    // 2. Validate that the supplied key consists of exactly six digits
    if (!access_key || typeof access_key !== 'string' || !/^\d{6}$/.test(access_key)) {
      await registerFailedAttempt();
      return NextResponse.json({ error: 'KeyBox not found.' }, { status: 404 });
    }

    // 3. Look up the record server-side
    const { data: keybox, error: dbError } = await supabaseServer
      .from('keyboxes')
      .select('id, content, content_type, expires_at')
      .eq('access_key', access_key)
      .maybeSingle();

    if (dbError) {
      console.error('Database retrieval error:', dbError);
      const devErrorMsg = process.env.NODE_ENV === 'development'
        ? `Database retrieval error: [${dbError.code}] ${dbError.message}`
        : 'Something went wrong. Please try again.';
      return NextResponse.json({ error: devErrorMsg }, { status: 500 });
    }

    if (!keybox) {
      await registerFailedAttempt();
      return NextResponse.json({ error: 'KeyBox not found.' }, { status: 404 });
    }

    // Helper to check and extract document metadata
    const isDoc = keybox.content_type === 'document' || (keybox.content_type === 'text' && keybox.content.startsWith('__KEYBOX_DOCUMENT__:'));
    let docMeta: { fileName: string; fileSize: number; fileType: string; storagePath: string } | null = null;
    if (isDoc) {
      try {
        const rawJson = keybox.content.startsWith('__KEYBOX_DOCUMENT__:')
          ? keybox.content.replace('__KEYBOX_DOCUMENT__:', '')
          : keybox.content;
        docMeta = JSON.parse(rawJson);
      } catch (e) {
        console.error('Failed to parse document metadata:', e);
      }
    }

    // 4. Check expiration using server time
    const expiresAt = new Date(keybox.expires_at);
    if (expiresAt.getTime() <= now.getTime()) {
      // If it was a document, clean up the file from Supabase Storage
      if (docMeta?.storagePath) {
        await supabaseServer.storage.from(DOCUMENTS_BUCKET).remove([docMeta.storagePath]).catch(() => {});
      }

      // Expired! Delete the record
      await supabaseServer
        .from('keyboxes')
        .delete()
        .eq('id', keybox.id);

      await registerFailedAttempt();
      return NextResponse.json({ error: 'This KeyBox has expired.' }, { status: 410 });
    }

    // 5. Successful lookup: Reset failed attempts for this client IP
    await supabaseServer
      .from('failed_attempts')
      .delete()
      .eq('ip_hash', ipHash);

    // If document, generate a signed download URL valid for the remaining duration
    if (isDoc && docMeta) {
      const remainingSeconds = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      const { data: signedUrlData } = await supabaseServer.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(docMeta.storagePath, remainingSeconds, {
          download: docMeta.fileName,
        });

      return NextResponse.json({
        content: docMeta.fileName,
        content_type: 'document',
        expires_at: keybox.expires_at,
        document: {
          fileName: docMeta.fileName,
          fileSize: docMeta.fileSize,
          fileType: docMeta.fileType,
          downloadUrl: signedUrlData?.signedUrl || '',
        },
      });
    }

    // Return only required fields (exclude database id or other details)
    return NextResponse.json({
      content: keybox.content,
      content_type: keybox.content_type,
      expires_at: keybox.expires_at,
    });
  } catch (err) {
    console.error('Unexpected error in retrieve API:', err);
    const devErrorMsg = process.env.NODE_ENV === 'development'
      ? `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
      : 'Something went wrong. Please try again.';
    return NextResponse.json({ error: devErrorMsg }, { status: 500 });
  }
}
