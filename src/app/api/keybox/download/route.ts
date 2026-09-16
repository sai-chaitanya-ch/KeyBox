import { NextResponse } from 'next/server';
import { supabaseServer, DOCUMENTS_BUCKET } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const isPreview = searchParams.get('preview') === '1';

    if (!key || typeof key !== 'string' || !/^\d{6}$/.test(key)) {
      return NextResponse.json({ error: 'Invalid key.' }, { status: 400 });
    }

    const { data: keybox, error: dbError } = await supabaseServer
      .from('keyboxes')
      .select('id, content, content_type, expires_at')
      .eq('access_key', key)
      .maybeSingle();

    if (dbError || !keybox) {
      return NextResponse.json({ error: 'KeyBox not found.' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(keybox.expires_at);
    if (expiresAt.getTime() <= now.getTime()) {
      return NextResponse.json({ error: 'This KeyBox has expired.' }, { status: 410 });
    }

    const isDoc = keybox.content_type === 'document' ||
      (keybox.content_type === 'text' && keybox.content?.startsWith('__KEYBOX_DOCUMENT__:'));

    if (!isDoc) {
      return NextResponse.json({ error: 'This KeyBox does not contain a document.' }, { status: 400 });
    }

    let meta: { fileName: string; fileSize: number; fileType: string; storagePath: string };
    try {
      const rawJson = keybox.content.startsWith('__KEYBOX_DOCUMENT__:')
        ? keybox.content.replace('__KEYBOX_DOCUMENT__:', '')
        : keybox.content;
      meta = JSON.parse(rawJson);
    } catch {
      return NextResponse.json({ error: 'Invalid document metadata.' }, { status: 500 });
    }

    const { data: blob, error: dlError } = await supabaseServer.storage
      .from(DOCUMENTS_BUCKET)
      .download(meta.storagePath);

    if (dlError || !blob) {
      console.error('Download error:', dlError);
      return NextResponse.json({ error: 'File could not be downloaded.' }, { status: 500 });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const dispositionType = isPreview ? 'inline' : 'attachment';
    const encodedFileName = encodeURIComponent(meta.fileName);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': meta.fileType || 'application/octet-stream',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Content-Disposition': `${dispositionType}; filename="${meta.fileName.replace(/"/g, '')}"; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Unexpected error in download route:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
