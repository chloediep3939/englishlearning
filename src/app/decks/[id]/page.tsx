import { requireUserId } from '@/lib/current-user';
import { flashcardDecksDb, flashcardsDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import DeckDetailClient from '@/components/DeckDetailClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const deck = await flashcardDecksDb.getById(userId, id);
  if (!deck) notFound();

  const cards = await flashcardsDb.listByDeck(userId, id, { limit: 500 });

  return <DeckDetailClient deck={deck} cards={cards} />;
}
