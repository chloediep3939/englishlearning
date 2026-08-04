'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Settings as SettingsIcon, Check, Target, Mic, Timer,
  BookOpenText, Volume2, Palette, Repeat, ListChecks, Headphones,
  NotebookPen, Zap,
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
import { LISTENING_SETTINGS, M3_SETTINGS, M6_SETTINGS, SENTENCE_STUDY_SETTINGS } from '@/lib/types';
import { setStoredVoicePreference, setStoredWordTtsRate } from '@/lib/tts';
import { apiJson } from '@/lib/common/api-json';

// Tabbed layout — one focused panel at a time instead of a wall of five
// uneven cards. Tab order mirrors how often each group is touched.
type SettingsTab = 'study' | 'audio' | 'practice' | 'reading' | 'ui';

const TABS: Array<{ value: SettingsTab; label: string; icon: React.ReactNode }> = [
  { value: 'study',    label: 'Học & mục tiêu', icon: <Target size={14} strokeWidth={2.4} /> },
  { value: 'audio',    label: 'Âm thanh',       icon: <Volume2 size={14} strokeWidth={2.4} /> },
  { value: 'practice', label: 'Luyện tập',      icon: <Zap size={14} strokeWidth={2.4} /> },
  { value: 'reading',  label: 'Bài đọc',        icon: <BookOpenText size={14} strokeWidth={2.4} /> },
  { value: 'ui',       label: 'Giao diện',      icon: <Palette size={14} strokeWidth={2.4} /> },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<FlashcardSettings | null>(null);
  const [tab, setTab] = useState<SettingsTab>('study');
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
    <div className="hidden md:block" style={{ maxWidth: 760, margin: '0 auto' }}>
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

      {/* Header row — title + a fixed slot for the "Đã lưu" chip so it never
          shifts the layout when it pops in. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 18px' }}>
        <h1
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            letterSpacing: 'var(--v-tracking-tight)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--v-ink)',
          }}
        >
          <SettingsIcon size={24} style={{ color: 'var(--v-primary)' }} /> Cài đặt
        </h1>
        <span style={{ flex: 1 }} />
        <span
          aria-live="polite"
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
            opacity: saved ? 1 : 0,
            transition: 'opacity 200ms var(--v-ease)',
          }}
        >
          <Check size={12} /> Đã lưu
        </span>
      </div>

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

      {/* Tab bar */}
      <div
        role="tablist"
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 999,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: active ? 'var(--v-primary-soft)' : 'transparent',
                color: active ? 'var(--v-primary)' : 'var(--v-ink-soft)',
                border: 'none',
                borderRadius: 999,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'background 150ms var(--v-ease), color 150ms var(--v-ease)',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {!settings ? (
        <LoadingState message="Đang tải cài đặt…" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tab === 'study' && (
            <>
              <SettingsCard title="Mục tiêu hàng ngày" icon={<Target size={16} style={{ color: 'var(--v-primary)' }} />}>
                <Slider
                  label="Mục tiêu ôn mỗi ngày"
                  value={settings.daily_goal_review}
                  min={10}
                  max={200}
                  step={10}
                  onCommit={(v) => save({ daily_goal_review: v })}
                  suffix="lượt"
                />
                <SessionLimitInput
                  label="Số thẻ ôn mỗi phiên"
                  hint="Mặc định cho phiên Học từ / Học câu — chỉnh được từng phiên"
                  value={settings.session_review_limit}
                  onCommit={(v) => save({ session_review_limit: v })}
                  disabled={saving}
                />
                <SessionLimitInput
                  label="Số thẻ mới mỗi phiên"
                  hint="Số từ / câu mới tối đa trộn vào mỗi phiên"
                  value={settings.session_new_limit}
                  onCommit={(v) => save({ session_new_limit: v })}
                  disabled={saving}
                />
                <Toggle
                  label="Ẩn từ đã master khỏi ôn tập"
                  hint="Từ ở status 'master' sẽ không hiện trong phiên ôn"
                  checked={settings.mastered_hide_from_review}
                  onChange={(v) => save({ mastered_hide_from_review: v })}
                  disabled={saving}
                />
              </SettingsCard>
              <SettingsCard title="Câu hỏi dạng nghe" icon={<Headphones size={16} style={{ color: 'var(--v-blue)' }} />}>
                <Toggle
                  label="Bật câu hỏi dạng nghe (phiên Học từ)"
                  hint="Thẻ ôn tập có thể được hỏi bằng loa — nghe rồi gõ lại từ. Thẻ mới luôn hỏi bằng hình + nghĩa Việt"
                  checked={settings.listening_enabled}
                  onChange={(v) => save({ listening_enabled: v })}
                  disabled={saving}
                />
                <SliderWithIcon
                  icon={<Headphones size={14} />}
                  label="Tỉ lệ câu nghe"
                  hint="Bao nhiêu % thẻ ôn tập được hỏi dạng nghe, phần còn lại hỏi dạng dịch"
                  value={settings.listening_ratio}
                  min={LISTENING_SETTINGS.listening_ratio.min}
                  max={LISTENING_SETTINGS.listening_ratio.max}
                  step={LISTENING_SETTINGS.listening_ratio.step}
                  onCommit={(v) => save({ listening_ratio: v })}
                  suffix="%"
                  disabled={!settings.listening_enabled}
                />
              </SettingsCard>
            </>
          )}

          {tab === 'audio' && (
            <SettingsCard title="Âm thanh & giọng đọc" icon={<Volume2 size={16} style={{ color: 'var(--v-teal)' }} />}>
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
                hint="Khi xem đáp án Học từ, Bún đọc từ lặp lại bấy nhiêu lần"
                value={settings.reveal_read_count}
                min={M6_SETTINGS.reveal_read_count.min}
                max={M6_SETTINGS.reveal_read_count.max}
                step={M6_SETTINGS.reveal_read_count.step}
                onCommit={(v) => save({ reveal_read_count: v })}
                suffix="lần"
                disabled={!settings.autoplay_audio}
              />
              <SliderWithIcon
                icon={<NotebookPen size={14} />}
                label="Số lần đọc câu ví dụ (Học câu)"
                hint="Khi xem đáp án Học câu, Bún đọc cả câu bấy nhiêu lần — 0 là tắt"
                value={settings.sentence_read_count}
                min={SENTENCE_STUDY_SETTINGS.sentence_read_count.min}
                max={SENTENCE_STUDY_SETTINGS.sentence_read_count.max}
                step={SENTENCE_STUDY_SETTINGS.sentence_read_count.step}
                onCommit={(v) => save({ sentence_read_count: v })}
                suffix="lần"
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
          )}

          {tab === 'practice' && (
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
          )}

          {tab === 'reading' && (
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
          )}

          {tab === 'ui' && (
            <SettingsCard title="Giao diện" icon={<Palette size={16} style={{ color: 'var(--v-pink)' }} />}>
              <ThemeControl
                value={settings.theme}
                onChange={(v) => save({ theme: v })}
                disabled={saving}
              />
            </SettingsCard>
          )}
        </div>
      )}
    </div>
    </>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Number input for the unified-study session limits (1–200). Commits on
 * blur / Enter so half-typed values don't fire PUTs; reverts to the saved
 * value when the input is invalid.
 */
function SessionLimitInput({
  label, hint, value, onCommit, disabled,
}: {
  label: string;
  hint: string;
  value: number;
  onCommit: (v: number) => void;
  disabled: boolean;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  function commit() {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1 || n > 200) {
      setRaw(String(value));
      return;
    }
    if (n !== value) onCommit(n);
    setRaw(String(n));
  }

  return (
    <div style={{ marginTop: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label
          style={{
            flex: 1,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            fontWeight: 600,
          }}
        >
          {label}
        </label>
        <input
          type="number"
          min={1}
          max={200}
          value={raw}
          disabled={disabled}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          style={{
            width: 84,
            padding: '8px 12px',
            background: 'var(--v-surface)',
            border: '1.5px solid var(--v-border)',
            borderRadius: 'var(--v-radius-sm)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-base)',
            color: 'var(--v-ink)',
            outline: 'none',
            textAlign: 'center',
          }}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          marginTop: 2,
        }}
      >
        {hint}
      </div>
    </div>
  );
}

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
