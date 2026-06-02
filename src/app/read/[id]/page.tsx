import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import { userSettingsDb, flashcardDecksDb } from '@/lib/db';
import ReadAlong from '@/components/reading/ReadAlong';
import { READING_DEFAULT_DECK_NAME } from '@/lib/reading/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ReadAlongPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const passageId = Number(id);
  if (!Number.isInteger(passageId) || passageId <= 0) notFound();

  const passage = await passagesDb.getById(userId, passageId);
  if (!passage) notFound();

  const settings = await userSettingsDb.getFlashcardSettings(userId);
  let decks = await flashcardDecksDb.getAllWithCounts(userId);

  // Resolve the deck words save into (BR10 / Q7 / E5.2): last-used → first
  // deck → auto-create a default reading deck. Persist the resolution so it
  // stays sticky as "last used". The user can change it via the tray picker.
  let deck =
    (settings.reading_deck_id != null
      ? decks.find((d) => d.id === settings.reading_deck_id)
      : undefined) ?? decks[0];
  if (!deck) {
    const newId = await flashcardDecksDb.create(userId, { name: READING_DEFAULT_DECK_NAME });
    decks = await flashcardDecksDb.getAllWithCounts(userId);
    deck = decks.find((d) => d.id === newId) ?? decks[0];
  }
  const deckId = deck?.id ?? null;
  if (deckId != null && settings.reading_deck_id !== deckId) {
    await userSettingsDb.updateFlashcardSettings(userId, { reading_deck_id: deckId });
  }

  return (
    <div>
      <ReadAlong
        passage={{
          id: passage.id,
          title: passage.title,
          content: passage.content,
          word_count: passage.word_count,
          level_estimate: passage.level_estimate,
        }}
        initialRate={settings.reading_speed}
        initialAuto={settings.reading_auto_continue}
        initialDeckId={deckId}
        decks={decks.map((d) => ({ id: d.id, name: d.name }))}
      />

      {/* Grammar analysis ("Tìm hiểu grammar patterns") tạm bỏ theo yêu cầu.
          Để bật lại: import GrammarSection và render
          <GrammarSection passageId={passage.id} initialAnalysis={passage.grammar_analysis} /> */}
    </div>
  );
}
