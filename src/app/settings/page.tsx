'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Settings as SettingsIcon, Check, Target, Mic, Timer,
  BookOpenText, Volume2, Palette, Repeat, ListChecks,
} from 'lucide-react';
import LoadingState from '@/components/common/LoadingState';
import SettingsCard from '@/components/SettingsCard';
import Slider from '@/components/settings-controls/Slider';
import Toggle from '@/components/settings-controls/Toggle';
import SliderWithIcon from '@/components/settings-controls/SliderWithIcon';
import MaxAttemptsControl from '@/components/settings-controls/MaxAttemptsControl';
import SpeedTimerControl from '@/components/settings-controls/SpeedTimerControl';
import CefrControl from '@/components/settings-controls/CefrControl';
import TtsRateControl from '@/components/settings-controls/TtsRateControl';
import VoicePickerControl from '@/components/settings-controls/VoicePickerControl';
import ThemeControl from '@/components/settings-controls/ThemeControl';
import MSettings from '@/components/app-mobile/screens/MSettings';
import type { FlashcardSettings, ThemeMode } from '@/lib/types';
import { M3_SETTINGS, M6_SETTINGS } from '@/lib/types';
import { setStoredVoicePreference, setStoredWordTtsRate } from '@/lib/tts';
import { apiJson } from '@/lib/common/api-json';

export default function SettingsPage() {
  const [settings, setSettings] = useState<FlashcardSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<FlashcardSettings>('/api/settings')
      .then((d) => {
        setSettings(d);
        // Mirror voice preference + word rate into localStorage so AudioButton
        // & friends pick them up without re-fetching settings.
        setStoredVoicePreference(d.voice_preference);
        setStoredWordTtsRate(d.word_tts_rate);
      })
      .catch(() => setError('Không tải được cài đặt.'));
  }, []);

  async function save(partial: Partial<FlashcardSettings>) {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Không lưu được.');
        return;
      }
      const updated = (await res.json()) as FlashcardSettings;
      setSettings(updated);
      if (partial.voice_preference !== undefined) {
        setStoredVoicePreference(updated.voice_preference);
      }
      if (partial.word_tts_rate !== undefined) {
        setStoredWordTtsRate(updated.word_tts_rate);
      }
      if (partial.theme !== undefined) {
        // Apply immediately so the user sees the change without a refresh.
        applyThemeImmediately(updated.theme);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Lỗi kết nối.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <div className="md:hidden">
      <MSettings />
    </div>
    <div className="hidden md:block" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Link
        href="/dashboard"
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
        <ArrowLeft size={14} /> Dashboard
      </Link>

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <SettingsIcon size={24} style={{ color: 'var(--v-primary)' }} /> Cài đặt
      </h1>

      {saved && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'var(--v-primary-soft)',
            color: 'var(--v-primary-deep)',
            borderRadius: 'var(--v-radius-pill)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-xs)',
            marginBottom: 14,
          }}
        >
          <Check size={12} /> Đã lưu
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,87,87,0.08)',
            border: '1px solid rgba(255,87,87,0.25)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-red)',
            fontSize: 'var(--v-text-md)',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!settings ? (
        <LoadingState message="Đang tải cài đặt…" />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* 🎯 Mục tiêu hàng ngày */}
          <SettingsCard title="Mục tiêu hàng ngày" icon={<Target size={16} style={{ color: 'var(--v-primary)' }} />}>
            <Slider
              label="Từ mới mỗi ngày"
              value={settings.daily_new_limit}
              min={0}
              max={50}
              step={1}
              onCommit={(v) => save({ daily_new_limit: v })}
              suffix="từ"
            />
            <Slider
              label="Số từ ôn tối đa mỗi ngày"
              value={settings.daily_goal_review}
              min={10}
              max={200}
              step={10}
              onCommit={(v) => save({ daily_goal_review: v })}
              suffix="từ"
            />
            <Toggle
              label="Ẩn từ đã master khỏi ôn tập"
              hint="Từ ở status 'master' sẽ không hiện trong /review"
              checked={settings.mastered_hide_from_review}
              onChange={(v) => save({ mastered_hide_from_review: v })}
              disabled={saving}
            />
          </SettingsCard>

          {/* 🧠 Luyện tập */}
          <SettingsCard title="Luyện tập" icon={<Mic size={16} style={{ color: 'var(--v-blue)' }} />}>
            <MaxAttemptsControl
              value={settings.f1_max_attempts}
              onCommit={(v) => save({ f1_max_attempts: v })}
            />
            <SliderWithIcon
              icon={<Timer size={14} />}
              label="Thời gian đặt câu (giây)"
              hint="Đếm ngược trong chế độ Đặt câu"
              value={settings.f2_timer_seconds}
              min={M3_SETTINGS.f2_timer_seconds.min}
              max={M3_SETTINGS.f2_timer_seconds.max}
              step={M3_SETTINGS.f2_timer_seconds.step}
              onCommit={(v) => save({ f2_timer_seconds: v })}
              suffix="giây"
            />
            <SliderWithIcon
              icon={<BookOpenText size={14} />}
              label="Số từ tối đa trong 1 bài viết"
              hint="Pool từ vựng tối đa cho mỗi bài viết"
              value={settings.f3_max_words_per_composition}
              min={M3_SETTINGS.f3_max_words_per_composition.min}
              max={M3_SETTINGS.f3_max_words_per_composition.max}
              step={M3_SETTINGS.f3_max_words_per_composition.step}
              onCommit={(v) => save({ f3_max_words_per_composition: v })}
              suffix="từ"
            />
            <SpeedTimerControl
              value={settings.speed_timer_seconds}
              onCommit={(v) => save({ speed_timer_seconds: v })}
            />
            <SliderWithIcon
              icon={<Repeat size={14} />}
              label="Số lần đọc từ (Flashcard nhanh)"
              hint="Tự đọc từ tiếng Anh khi câu hỏi hiện ra — 0 là tắt"
              value={settings.speed_read_count}
              min={0}
              max={M6_SETTINGS.speed_read_count.max}
              step={M6_SETTINGS.speed_read_count.step}
              onCommit={(v) => save({ speed_read_count: v })}
              suffix="lần"
            />
            <SliderWithIcon
              icon={<ListChecks size={14} />}
              label="Số câu mặc định mỗi phiên"
              hint="Được chọn sẵn khi mở Flashcard nhanh / Điền từ / Luyện đọc / Đặt câu"
              value={settings.default_session_size}
              min={M6_SETTINGS.default_session_size.min}
              max={M6_SETTINGS.default_session_size.max}
              step={M6_SETTINGS.default_session_size.step}
              onCommit={(v) => save({ default_session_size: v })}
              suffix="câu"
            />
          </SettingsCard>

          {/* 📖 Học theo bài đọc */}
          <SettingsCard title="Học theo bài đọc" icon={<BookOpenText size={16} style={{ color: 'var(--v-purple)' }} />}>
            <CefrControl
              value={settings.user_cefr_level}
              onChange={(v) => save({ user_cefr_level: v })}
              disabled={saving}
            />
            <TtsRateControl
              value={settings.passage_tts_rate}
              onCommit={(v) => save({ passage_tts_rate: v })}
            />
            <Toggle
              label="Tải trước AI feedback"
              hint="Khi đọc bài, Bún chuẩn bị sẵn feedback các bước sau → đỡ chờ"
              checked={settings.passage_pre_fetch}
              onChange={(v) => save({ passage_pre_fetch: v })}
              disabled={saving}
            />
            <SliderWithIcon
              icon={<Timer size={14} />}
              label="Khoảng dừng giữa các cụm"
              hint="Nghỉ giữa các thought-group khi luyện đọc theo cụm"
              value={settings.chunk_pause_ms}
              min={M6_SETTINGS.chunk_pause_ms.min}
              max={M6_SETTINGS.chunk_pause_ms.max}
              step={M6_SETTINGS.chunk_pause_ms.step}
              onCommit={(v) => save({ chunk_pause_ms: v })}
              suffix="ms"
            />
          </SettingsCard>

          {/* 🔊 Âm thanh */}
          <SettingsCard title="Âm thanh" icon={<Volume2 size={16} style={{ color: 'var(--v-teal)' }} />}>
            <Toggle
              label="Tự đọc khi xem đáp án"
              hint="Khi xem đáp án, Bún tự đọc từ đó cho bạn nghe"
              checked={settings.autoplay_audio}
              onChange={(v) => save({ autoplay_audio: v })}
              disabled={saving}
            />
            <SliderWithIcon
              icon={<Repeat size={14} />}
              label="Số lần đọc lại từ"
              hint="Khi xem đáp án flashcard, Bún đọc từ lặp lại bấy nhiêu lần"
              value={settings.reveal_read_count}
              min={M6_SETTINGS.reveal_read_count.min}
              max={M6_SETTINGS.reveal_read_count.max}
              step={M6_SETTINGS.reveal_read_count.step}
              onCommit={(v) => save({ reveal_read_count: v })}
              suffix="lần"
              disabled={!settings.autoplay_audio}
            />
            <SliderWithIcon
              icon={<Timer size={14} />}
              label="Khoảng nghỉ giữa các lần đọc"
              hint="Nghỉ bao lâu giữa hai lần đọc để bạn kịp nhẩm theo"
              value={settings.reveal_read_gap_ms}
              min={M6_SETTINGS.reveal_read_gap_ms.min}
              max={M6_SETTINGS.reveal_read_gap_ms.max}
              step={M6_SETTINGS.reveal_read_gap_ms.step}
              onCommit={(v) => save({ reveal_read_gap_ms: v })}
              suffix="ms"
              disabled={!settings.autoplay_audio}
            />
            <TtsRateControl
              value={settings.word_tts_rate}
              onCommit={(v) => save({ word_tts_rate: v })}
              label="Tốc độ đọc từ"
              hint="Áp dụng khi Bún đọc một từ đơn (flashcard, quiz, nút loa)"
              min={M6_SETTINGS.word_tts_rate.min}
              max={M6_SETTINGS.word_tts_rate.max}
              step={M6_SETTINGS.word_tts_rate.step}
              previewText="vocabulary"
            />
            <VoicePickerControl
              value={settings.voice_preference}
              onChange={(v) => save({ voice_preference: v })}
              disabled={saving}
            />
          </SettingsCard>

          {/* 🎨 Giao diện */}
          <SettingsCard title="Giao diện" icon={<Palette size={16} style={{ color: 'var(--v-pink)' }} />}>
            <ThemeControl
              value={settings.theme}
              onChange={(v) => save({ theme: v })}
              disabled={saving}
            />
          </SettingsCard>
        </div>
      )}
    </div>
    </>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function applyThemeImmediately(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  const effective =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.setAttribute('data-theme', effective);
  try {
    window.localStorage.setItem('theme', theme);
  } catch {
    /* ignore */
  }
}

