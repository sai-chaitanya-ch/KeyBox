import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { supabaseServer } from '@/lib/supabase';

// Content-type validation
const ALLOWED_CONTENT_TYPES = ['text', 'url', 'code'] as const;
type ContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

// Duration validation (in minutes)
const ALLOWED_DURATIONS = [5, 10, 30] as const;
type Duration = (typeof ALLOWED_DURATIONS)[number];

function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, content_type, duration } = body;

    // 1. Validate content presence
    if (content === undefined || content === null || (typeof content === 'string' && content.trim() === '')) {
      return NextResponse.json({ error: 'Please enter some content.' }, { status: 400 });
    }

    const contentStr = String(content);

    // 2. Validate maximum length (5,000 characters limit)
    if (contentStr.length > 5000) {
      return NextResponse.json({ error: 'Content cannot exceed 5,000 characters.' }, { status: 400 });
    }

    // 3. Validate content type
    if (!ALLOWED_CONTENT_TYPES.includes(content_type as ContentType)) {
      return NextResponse.json({ error: 'Invalid content type.' }, { status: 400 });
    }

    // 4. Validate URL syntax if type is url
    if (content_type === 'url' && !isValidUrl(contentStr)) {
      return NextResponse.json({ error: 'Please enter a valid URL.' }, { status: 400 });
    }

    // 5. Validate duration
    const durationNum = Number(duration);
    if (!ALLOWED_DURATIONS.includes(durationNum as Duration)) {
      return NextResponse.json({ error: 'Invalid duration value.' }, { status: 400 });
    }

    // 6. Generate secure key and insert into DB, handling collisions
    let inserted = false;
    let accessKey = '';
    let expiresAt: Date | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!inserted && attempts < maxAttempts) {
      attempts++;
      accessKey = randomInt(100000, 1000000).toString();
      
      const now = new Date();
      expiresAt = new Date(now.getTime() + durationNum * 60 * 1000);

      const { error } = await supabaseServer
        .from('keyboxes')
        .insert({
          access_key: accessKey,
          content_type,
          content: contentStr,
          expires_at: expiresAt.toISOString(),
        });

      if (!error) {
        inserted = true;
      } else {
        // Unique constraint violation in Postgres is code '23505'
        if (error.code === '23505') {
          continue;
        }
        // Log other database errors on server side only
        console.error('Database insertion error:', error);
        const devErrorMsg = process.env.NODE_ENV === 'development'
          ? `Database insertion error: [${error.code}] ${error.message}`
          : 'Something went wrong. Please try again.';
        return NextResponse.json({ error: devErrorMsg }, { status: 500 });
      }
    }

    if (!inserted) {
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
