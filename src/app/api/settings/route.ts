import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { userSettingsDb } from '@/lib/db';
import type { FlashcardSettings } from '@/lib/types';
import { M4_SETTINGS } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireUserId();
    const settings = await userSettingsDb.getFlashcardSettings(userId);
    return NextResponse.json(settings);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[settings GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const partial: Partial<FlashcardSettings> = {};

    if (typeof body.daily_goal_new === 'number' && body.daily_goal_new >= 0 && body.daily_goal_new <= 100) {
      partial.daily_goal_new = Math.floor(body.daily_goal_new);
    }
    if (typeof body.daily_goal_review === 'number' && body.daily_goal_review >= 0 && body.daily_goal_review <= 500) {
      partial.daily_goal_review = Math.floor(body.daily_goal_review);
    }
    if (typeof body.reminder_time === 'string' && /^\d{2}:\d{2}$/.test(body.reminder_time)) {
      partial.reminder_time = body.reminder_time;
    }
    if (typeof body.reminder_enabled === 'boolean') {
      partial.reminder_enabled = body.reminder_enabled;
    }
    if (typeof body.mastered_hide_from_review === 'boolean') {
      partial.mastered_hide_from_review = body.mastered_hide_from_review;
    }
    if (typeof body.daily_new_limit === 'number' && body.daily_new_limit >= 0 && body.daily_new_limit <= 100) {
      partial.daily_new_limit = Math.floor(body.daily_new_limit);
    }
    // ----- M3 keys -----
    if (typeof body.daily_new_word_target === 'number' && body.daily_new_word_target >= 5 && body.daily_new_word_target <= 100) {
      partial.daily_new_word_target = Math.floor(body.daily_new_word_target);
    }
    // f1_max_attempts: 0 = unlimited, otherwise 1-10
    if (typeof body.f1_max_attempts === 'number' && body.f1_max_attempts >= 0 && body.f1_max_attempts <= 10) {
      partial.f1_max_attempts = Math.floor(body.f1_max_attempts);
    }
    if (typeof body.f2_timer_seconds === 'number' && body.f2_timer_seconds >= 15 && body.f2_timer_seconds <= 300) {
      partial.f2_timer_seconds = Math.floor(body.f2_timer_seconds);
    }
    if (typeof body.f3_max_words_per_composition === 'number' && body.f3_max_words_per_composition >= 5 && body.f3_max_words_per_composition <= 100) {
      partial.f3_max_words_per_composition = Math.floor(body.f3_max_words_per_composition);
    }
    // ----- M4 keys -----
    if (typeof body.user_cefr_level === 'string' && (M4_SETTINGS.user_cefr_level.values as readonly string[]).includes(body.user_cefr_level)) {
      partial.user_cefr_level = body.user_cefr_level as FlashcardSettings['user_cefr_level'];
    }
    if (typeof body.passage_tts_rate === 'number' && body.passage_tts_rate >= M4_SETTINGS.passage_tts_rate.min && body.passage_tts_rate <= M4_SETTINGS.passage_tts_rate.max) {
      // Round to one decimal so we don't store 1.0000000001 from a slider tick.
      partial.passage_tts_rate = Math.round(body.passage_tts_rate * 10) / 10;
    }
    if (typeof body.passage_pre_fetch === 'boolean') {
      partial.passage_pre_fetch = body.passage_pre_fetch;
    }
    // ----- M5 keys -----
    if (typeof body.autoplay_audio === 'boolean') {
      partial.autoplay_audio = body.autoplay_audio;
    }
    if (typeof body.voice_preference === 'string' && body.voice_preference.length <= 100) {
      partial.voice_preference = body.voice_preference;
    }
    if (typeof body.theme === 'string' && (body.theme === 'light' || body.theme === 'dark' || body.theme === 'system')) {
      partial.theme = body.theme;
    }
    // ----- Pomodoro -----
    if (typeof body.pomodoro_work_minutes === 'number' && body.pomodoro_work_minutes >= 1 && body.pomodoro_work_minutes <= 120) {
      partial.pomodoro_work_minutes = Math.floor(body.pomodoro_work_minutes);
    }
    if (typeof body.pomodoro_break_minutes === 'number' && body.pomodoro_break_minutes >= 1 && body.pomodoro_break_minutes <= 60) {
      partial.pomodoro_break_minutes = Math.floor(body.pomodoro_break_minutes);
    }
    // ----- Read-Along keys -----
    // Speed is one of the four chips; clamp to the safe TTS range 0.5–2.0.
    if (typeof body.reading_speed === 'number' && body.reading_speed >= 0.5 && body.reading_speed <= 2.0) {
      partial.reading_speed = Math.round(body.reading_speed * 100) / 100;
    }
    if (typeof body.reading_auto_continue === 'boolean') {
      partial.reading_auto_continue = body.reading_auto_continue;
    }
    // reading_deck_id: a positive integer deck id, or null to clear.
    if (body.reading_deck_id === null) {
      partial.reading_deck_id = null;
    } else if (typeof body.reading_deck_id === 'number' && Number.isInteger(body.reading_deck_id) && body.reading_deck_id > 0) {
      partial.reading_deck_id = body.reading_deck_id;
    }

    await userSettingsDb.updateFlashcardSettings(userId, partial);
    const settings = await userSettingsDb.getFlashcardSettings(userId);
    return NextResponse.json(settings);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[settings PUT] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
