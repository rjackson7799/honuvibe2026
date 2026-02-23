import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'HonuVibe.AI';
  const category = searchParams.get('category');
  const readingTime = searchParams.get('reading_time');

  const categoryLabel = category
    ? category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(145deg, #080c18 0%, #0d1220 50%, #131a2e 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {categoryLabel && (
            <div
              style={{
                fontSize: '16px',
                color: '#5eaaa8',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              {categoryLabel}
            </div>
          )}
          <div
            style={{
              fontSize: title.length > 60 ? '38px' : '52px',
              color: 'rgba(255, 255, 255, 0.92)',
              lineHeight: 1.2,
              fontWeight: 400,
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #5eaaa8, #b68d40)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              HonuVibe.AI
            </div>
          </div>
          {readingTime && (
            <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.55)' }}>
              {readingTime} min read
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
