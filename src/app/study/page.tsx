export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, BookOpen, ArrowRight, Plus } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import SessionFlow from '@/components/flashcard-session/SessionFlow';
import DeckPickerStep, { DeckEyebrow } from '@/components/flashcard-session/DeckPickerStep';
import { requireUserId } from '@/lib/current-user';
import { flashcardsDb, flashcardDecksDb, userSettingsDb } from '@/lib/db';

interface StudyPageProps {
  searchParams: Promise<{ deck_id?: string }>;
}

export default async function StudyPage({ searchParams }: StudyPageProps) {
  const { deck_id } = await searchParams;
  const userId = await requireUserId();
  const settings = await userSettingsDb.getFlashcardSettings(userId);
  const decks = await flashcardDecksDb.getAllWithCounts(userId);

  // Show deck picker when (a) the user has >1 deck AND (b) no choice yet.
  // Single-deck users skip the picker and go straight to the session.
  const showDeckPicker = decks.length > 1 && deck_id === undefined;

  // Resolve the deck_id query param into a DB filter. "all" + undefined
  // both mean "no filter"; a numeric string means "filter by that deck".
  const deckFilter: number | null =
    deck_id && deck_id !== 'all' && /^\d+$/.test(deck_id) ? Number(deck_id) : null;

  // Load all new candidates so the picker can show the full deck. The
  // `daily_new_limit` becomes the *default selection size* (pre-checked) —
  // user can use "Chọn hết" to expand or trim. The 1000 ceiling is a sanity
  // cap for very large decks.
  const cards = showDeckPicker
    ? []
    : await flashcardsDb.getNewForToday(userId, 1000, deckFilter);

  // Resolve the picked deck name for the eyebrow (only when filtering).
  const pickedDeck = deckFilter ? decks.find((d) => d.id === deckFilter) ?? null : null;
  const totalAcrossAllDecks = decks.reduce((sum, d) => sum + d.new_count, 0);

  return (
    <div>
      <Link
        href={decks.length > 1 && !showDeckPicker ? '/study' : '/dashboard'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        <ArrowLeft size={14} /> {decks.length > 1 && !showDeckPicker ? 'Đổi bộ từ' : 'Dashboard'}
      </Link>

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <BookOpen size={24} style={{ color: 'var(--v-blue)' }} /> Học hôm nay
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Gợi ý {settings.daily_new_limit} từ mới mỗi ngày — chọn thêm hoặc bớt tuỳ bạn.
      </p>

      {!showDeckPicker && (pickedDeck || deck_id === 'all') && (
        <DeckEyebrow
          name={pickedDeck ? pickedDeck.name : 'Tất cả các bộ'}
          color={pickedDeck?.color ?? 'var(--v-primary)'}
        />
      )}

      {showDeckPicker ? (
        <DeckPickerStep mode="study" decks={decks} basePath="/study" totalAll={totalAcrossAllDecks} />
      ) : cards.length === 0 ? (
        <StudyEmpty />
      ) : (
        <SessionFlow mode="study" initialCards={cards} defaultPick={settings.daily_new_limit} />
      )}
    </div>
  );
}

function StudyEmpty() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      <Mascot pose="sleep" size={120} />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          margin: '12px 0 8px',
          color: 'var(--v-ink)',
        }}
      >
        Hôm nay chưa có từ mới
      </h2>
      <p style={{ color: 'var(--v-muted)', marginBottom: 20, fontSize: 'var(--v-text-md)' }}>
        Bún ngủ trưa thôi — bạn thêm vài từ rồi quay lại nha.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/add"
          style={{
            padding: '11px 18px',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-base)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus size={14} /> THÊM TỪ
        </Link>
        <Link
          href="/dashboard"
          style={{
            padding: '10px 18px',
            background: 'var(--v-surface)',
            color: 'var(--v-ink-soft)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-shadow-sm)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-md)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Về dashboard <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
