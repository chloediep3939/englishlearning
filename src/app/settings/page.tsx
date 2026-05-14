'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Settings as SettingsIcon, Check, Target, Mic, Timer,
  BookOpenText, Volume2, Palette, Bell,
} from 'lucide-react';
import LoadingState from '@/components/common/LoadingState';
import SettingsCard from '@/components/SettingsCard';
import Slider from '@/components/settings-controls/Slider';
import Toggle from '@/components/settings-controls/Toggle';
import SliderWithIcon from '@/components/settings-controls/SliderWithIcon';
import MaxAttemptsControl from '@/components/settings-controls/MaxAttemptsControl';
import CefrControl from '@/components/settings-controls/CefrControl';
import TtsRateControl from '@/components/settings-controls/TtsRateControl';
import VoicePickerControl from '@/components/settings-controls/VoicePickerControl';
import ThemeControl from '@/components/settings-controls/ThemeControl';
import type { FlashcardSettings, ThemeMode } from '@/lib/types';
import { M3_SETTINGS } from '@/lib/types';
import { setStoredVoicePreference } from '@/lib/tts';
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
        // Mirror voice preference into localStorage so AudioButton picks it
        // up without re-fetching settings.
        setStoredVoicePreference(d.voice_preference);
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
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
            <SliderWithIcon
              icon={<Target size={14} />}
              label="Mục tiêu từ mới (M3)"
              hint="Số từ mới Bún sẽ giúp bạn học mỗi ngày"
              value={settings.daily_new_word_target}
              min={M3_SETTINGS.daily_new_word_target.min}
              max={M3_SETTINGS.daily_new_word_target.max}
              step={M3_SETTINGS.daily_new_word_target.step}
              onCommit={(v) => save({ daily_new_word_target: v })}
              suffix="từ"
            />
          </SettingsCard>

          {/* 🔔 Nhắc nhở + ôn tập */}
          <SettingsCard title="Nhắc nhở + ôn tập" icon={<Bell size={16} style={{ color: 'var(--v-orange)' }} />}>
            <Toggle
              label="Bật nhắc học hàng ngày"
              hint="Push notification — cần permission từ browser"
              checked={settings.reminder_enabled}
              onChange={(v) => save({ reminder_enabled: v })}
              disabled={saving}
            />
            <div style={{ marginTop: 10, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-md)',
                  color: 'var(--v-ink)',
                  fontWeight: 600,
                }}
              >
                Giờ nhắc
              </label>
              <input
                type="time"
                value={settings.reminder_time}
                onChange={(e) => save({ reminder_time: e.target.value })}
                disabled={saving || !settings.reminder_enabled}
                style={{
                  padding: '8px 12px',
                  background: 'var(--v-surface)',
                  border: '1.5px solid var(--v-border)',
                  borderRadius: 'var(--v-radius-sm)',
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 'var(--v-text-base)',
                  color: 'var(--v-ink)',
                  outline: 'none',
                }}
              />
            </div>
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

