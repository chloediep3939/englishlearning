'use client';

import { useState } from 'react';
import { ExternalLink, Film } from 'lucide-react';
import type { Sound } from '@/lib/pronunciation/catalog-meta';
import { PLAYLIST_URL } from '@/lib/pronunciation/catalog-meta';

export default function SoundVideoPanel({ sound }: { sound: Sound }) {
  const [mouthError, setMouthError] = useState(false);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14,
      }}
    >
      {/* Mouth-shape clip — paused on entry (no autoplay); user presses play. */}
      <div>
        <div style={labelStyle}>Khẩu hình</div>
        {mouthError ? (
          <div
            style={{
              aspectRatio: '4 / 3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: 'var(--v-panel)',
              border: '1px dashed var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              color: 'var(--v-muted)',
              textAlign: 'center',
              padding: 12,
              fontSize: 'var(--v-text-sm)',
            }}
          >
            <Film size={22} />
            Chưa có video khẩu hình cho âm này.
          </div>
        ) : (
          <video
            src={sound.mouthClip}
            muted
            loop
            playsInline
            controls
            preload="metadata"
            onError={() => setMouthError(true)}
            style={{
              width: '100%',
              aspectRatio: '4 / 3',
              objectFit: 'cover',
              background: '#000',
              borderRadius: 'var(--v-radius-md)',
              border: '1px solid var(--v-border)',
            }}
          />
        )}
      </div>

      {/* BBC YouTube lesson — embedded by default, PAUSED (no autoplay). */}
      <div>
        <div style={labelStyle}>Video BBC</div>
        {sound.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${sound.youtubeId}?rel=0`}
            title={`BBC — âm /${sound.ipa}/`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
            }}
          />
        ) : (
          <a
            href={PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'var(--v-panel)',
              border: '1px dashed var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              textDecoration: 'none',
              color: 'var(--v-muted)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              textAlign: 'center',
              padding: 12,
            }}
          >
            <ExternalLink size={22} />
            Mở playlist BBC &quot;Sounds of English&quot;
          </a>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--v-font-head)',
  fontSize: 'var(--v-text-xs)',
  fontWeight: 800,
  color: 'var(--v-muted)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--v-tracking-wide)',
  marginBottom: 6,
};
