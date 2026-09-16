import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { supabaseServer, DOCUMENTS_BUCKET, ensureDocumentsBucket } from '@/lib/supabase';

// Content-type validation
const ALLOWED_CONTENT_TYPES = ['text', 'url', 'code', 'document'] as const;
type ContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

// Duration validation (in minutes: 5, 10, 30, 60)
const ALLOWED_DURATIONS = [5, 10, 30, 60] as const;
type Duration = (typeof ALLOWED_DURATIONS)[number];

// Allowed document extensions & size limit (under 5MB)
const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.md', '.rtf',
  '.csv', '.xlsx', '.xls', '.pptx', '.ppt',
  '.odt', '.ods', '.odp'
] as const;
const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB exclusive

function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeFileName(name: string): string {
  // Remove any path traversal components, keep safe characters and extension
  const baseName = name.replace(/^.*[\\/]/, '');
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: Request) {
  try {
    const contentTypeHeader = request.headers.get('content-type') || '';
    const isMultipart = contentTypeHeader.includes('multipart/form-data');

    let contentStr = '';
    let contentType: ContentType = 'text';
    let durationNum: number = 30;
    let documentFile: File | null = null;
    let documentStoragePath = '';

    if (isMultipart) {
      const formData = await request.formData();
      const file = formData.get('file');
      const rawContentType = (formData.get('content_type') as string) || 'document';
      const rawDuration = formData.get('duration');

      if (!file || !(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'Please select a document file to share.' }, { status: 400 });
      }

      if (file.size >= MAX_DOCUMENT_SIZE_BYTES) {
        return NextResponse.json({ error: 'Document size must be less than 5MB.' }, { status: 400 });
      }

      const originalName = file.name || 'document';
      const extMatch = originalName.lastIndexOf('.');
      const ext = extMatch !== -1 ? originalName.substring(extMatch).toLowerCase() : '';

      if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext as (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number])) {
        return NextResponse.json({
          error: `Unsupported file format. Supported formats: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), Plain Text (TXT/MD/RTF, CSV), and OpenDocument.`
        }, { status: 400 });
      }

      contentType = rawContentType as ContentType;
      durationNum = Number(rawDuration);
      documentFile = file;
    } else {
      const body = await request.json();
      const { content, content_type, duration } = body;

      // 1. Validate content presence
      if (content === undefined || content === null || (typeof content === 'string' && content.trim() === '')) {
        return NextResponse.json({ error: 'Please enter some content.' }, { status: 400 });
      }

      contentStr = String(content);

      // 2. Validate maximum length (5,000 characters limit for text/url/code)
      if (contentStr.length > 5000) {
        return NextResponse.json({ error: 'Content cannot exceed 5,000 characters.' }, { status: 400 });
      }

      contentType = content_type as ContentType;
      durationNum = Number(duration);

      // 3. Validate URL syntax if type is url
      if (contentType === 'url' && !isValidUrl(contentStr)) {
        return NextResponse.json({ error: 'Please enter a valid URL.' }, { status: 400 });
      }
    }

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type.' }, { status: 400 });
    }

    // Validate duration
    if (!ALLOWED_DURATIONS.includes(durationNum as Duration)) {
      return NextResponse.json({ error: 'Invalid duration value. Allowed: 5, 10, 30 minutes, or 1 hour.' }, { status: 400 });
    }

    // Generate secure key and insert into DB, handling collisions
    let inserted = false;
    let accessKey = '';
    let expiresAt: Date | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure documents storage bucket exists if uploading a document
    if (documentFile) {
      await ensureDocumentsBucket();
    }

    while (!inserted && attempts < maxAttempts) {
      attempts++;
      accessKey = randomInt(100000, 1000000).toString();
      
      const now = new Date();
      expiresAt = new Date(now.getTime() + durationNum * 60 * 1000);

      // If document, upload file to Supabase Storage first
      if (documentFile) {
        const sanitized = sanitizeFileName(documentFile.name);
        documentStoragePath = `${accessKey}/${sanitized}`;
        const fileBuffer = Buffer.from(await documentFile.arrayBuffer());

        const { error: uploadError } = await supabaseServer.storage
          .from(DOCUMENTS_BUCKET)
          .upload(documentStoragePath, fileBuffer, {
            contentType: documentFile.type || 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          console.error('Document storage upload error:', uploadError);
          return NextResponse.json({ error: 'Failed to upload document. Please try again.' }, { status: 500 });
        }

        const metadata = {
          fileName: documentFile.name,
          fileSize: documentFile.size,
          fileType: documentFile.type || 'application/octet-stream',
          storagePath: documentStoragePath,
        };
        contentStr = JSON.stringify(metadata);
      }

      // Try inserting with content_type 'document'
      let { error: insertError } = await supabaseServer
        .from('keyboxes')
        .insert({
          access_key: accessKey,
          content_type: contentType,
          content: contentStr,
          expires_at: expiresAt.toISOString(),
        });

      // If check constraint fails because database hasn't had the migration applied yet,
      // fallback to storing as 'text' with '__KEYBOX_DOCUMENT__:' prefix
      if (insertError && insertError.code === '23514' && contentType === 'document') {
        const fallbackContent = `__KEYBOX_DOCUMENT__:${contentStr}`;
        const fallbackRes = await supabaseServer
          .from('keyboxes')
          .insert({
            access_key: accessKey,
            content_type: 'text',
            content: fallbackContent,
            expires_at: expiresAt.toISOString(),
          });
        insertError = fallbackRes.error;
      }

      if (!insertError) {
        inserted = true;
      } else {
        // If upload occurred but insert failed, clean up uploaded file
        if (documentFile && documentStoragePath) {
          await supabaseServer.storage.from(DOCUMENTS_BUCKET).remove([documentStoragePath]).catch(() => {});
        }

        // Unique constraint violation in Postgres is code '23505'
        if (insertError.code === '23505') {
          continue;
        }
        // Log other database errors on server side only
        console.error('Database insertion error:', insertError);
        const devErrorMsg = process.env.NODE_ENV === 'development'
          ? `Database insertion error: [${insertError.code}] ${insertError.message}`
          : 'Something went wrong. Please try again.';
        return NextResponse.json({ error: devErrorMsg }, { status: 500 });
      }
    }

    if (!inserted) {
      if (documentFile && documentStoragePath) {
        await supabaseServer.storage.from(DOCUMENTS_BUCKET).remove([documentStoragePath]).catch(() => {});
      }
      console.error('Failed to generate a unique key after maximum attempts.');
      const devErrorMsg = process.env.NODE_ENV === 'development'
        ? 'Failed to generate a unique key after maximum attempts.'
        : 'Something went wrong. Please try again.';
      return NextResponse.json({ error: devErrorMsg }, { status: 500 });
    }

    return NextResponse.json({
      access_key: accessKey,
      expires_at: expiresAt?.toISOString(),
    });
  } catch (err) {
    console.error('Unexpected error in create keybox API:', err);
    const devErrorMsg = process.env.NODE_ENV === 'development'
      ? `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
      : 'Something went wrong. Please try again.';
    return NextResponse.json({ error: devErrorMsg }, { status: 500 });
  }
}

