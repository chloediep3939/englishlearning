'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Settings as SettingsIcon, Check, Target, Mic, Timer,
  BookOpenText, GraduationCap, Gauge, Play, Volume2, Palette, Bell,
  Sun, Moon, Monitor,
} from 'lucide-react';
import LoadingState from '@/components/LoadingState';
import SettingsCard from '@/components/SettingsCard';
import type { FlashcardSettings, CefrLevel, ThemeMode } from '@/lib/types';
import { M3_SETTINGS, M4_SETTINGS } from '@/lib/types';
import { setStoredVoicePreference, speak } from '@/lib/tts';

export default function SettingsPage() {
  const [settings, setSettings] = useState<FlashcardSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json() as Promise<FlashcardSettings>)
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
        href="/"
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

// ============================================================================
// Sliders / toggles (preserved from previous settings page)
// ============================================================================

function Slider({
  label, value, min, max, step, onCommit, suffix,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onCommit: (v: number) => void; suffix: string;
}) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function scheduleCommit(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(v), 400);
  }

  function commitNow(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    dragging.current = false;
    onCommit(v);
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {local} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onPointerDown={() => { dragging.current = true; }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          scheduleCommit(v);
        }}
        onPointerUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function Toggle({
  label, hint, checked, onChange, disabled,
}: {
  label: string; hint?: string; checked: boolean;
  onChange: (v: boolean) => void; disabled: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        cursor: disabled ? 'wait' : 'pointer',
        marginBottom: 10,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: 18, height: 18, cursor: disabled ? 'wait' : 'pointer', marginTop: 2 }}
      />
      <span>
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 2 }}>
            {hint}
          </div>
        )}
      </span>
    </label>
  );
}

function SliderWithIcon({
  icon, label, hint, value, min, max, step, onCommit, suffix, disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
  suffix: string;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function scheduleCommit(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(v), 400);
  }

  function commitNow(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    dragging.current = false;
    onCommit(v);
  }

  return (
    <div style={{ marginBottom: 14, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {local} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={disabled}
        onPointerDown={() => { dragging.current = true; }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          scheduleCommit(v);
        }}
        onPointerUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%' }}
      />
      {hint && (
        <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function MaxAttemptsControl({
  value, onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const unlimited = value === 0;
  const sliderDefault = M3_SETTINGS.f1_max_attempts.default;
  const [sliderValue, setSliderValue] = useState<number>(unlimited ? sliderDefault : value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current && !unlimited) setSliderValue(value);
  }, [value, unlimited]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function scheduleCommit(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(v), 400);
  }

  function commitNow(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    dragging.current = false;
    onCommit(v);
  }

  function toggleUnlimited(next: boolean) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dragging.current = false;
    onCommit(next ? 0 : sliderValue);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Mic size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Số lần thử khi luyện đọc
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {unlimited ? '∞' : `${sliderValue} lần`}
        </span>
      </div>
      <input
        type="range"
        min={M3_SETTINGS.f1_max_attempts.min}
        max={M3_SETTINGS.f1_max_attempts.max}
        step={M3_SETTINGS.f1_max_attempts.step}
        value={sliderValue}
        disabled={unlimited}
        onPointerDown={() => { dragging.current = true; }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setSliderValue(v);
          scheduleCommit(v);
        }}
        onPointerUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%', opacity: unlimited ? 0.5 : 1 }}
      />
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => toggleUnlimited(e.target.checked)}
        />
        <span style={{ fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)' }}>Không giới hạn</span>
      </label>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 2 }}>
        Khi đọc sai, Bún cho bạn thử lại tối đa bao nhiêu lần
      </div>
    </div>
  );
}

// ============================================================================
// M4 controls
// ============================================================================

const CEFR_OPTIONS: Array<{ value: CefrLevel; label: string }> = [
  { value: 'A1', label: 'A1 — Mới bắt đầu' },
  { value: 'A2', label: 'A2 — Cơ bản' },
  { value: 'B1', label: 'B1 — Trung cấp' },
  { value: 'B2', label: 'B2 — Trung cao' },
  { value: 'C1', label: 'C1 — Cao cấp' },
  { value: 'C2', label: 'C2 — Thành thạo' },
];

function CefrControl({
  value, onChange, disabled,
}: {
  value: CefrLevel;
  onChange: (v: CefrLevel) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <GraduationCap size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Trình độ tiếng Anh (CEFR)
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 4 }}>
        {CEFR_OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              style={{
                padding: '8px 0',
                borderRadius: 'var(--v-radius-sm)',
                border: '1.5px solid',
                borderColor: active ? 'var(--v-primary)' : 'var(--v-border)',
                background: active ? 'var(--v-primary)' : 'var(--v-surface)',
                color: active ? '#fff' : 'var(--v-ink)',
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-sm)',
                fontWeight: 800,
                cursor: disabled ? 'wait' : 'pointer',
                transition: 'background 120ms var(--v-ease)',
              }}
            >
              {opt.value}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
        {CEFR_OPTIONS.find((o) => o.value === value)?.label} — Bún sẽ so độ khó của bài đọc với trình độ này
      </div>
    </div>
  );
}

function TtsRateControl({
  value, onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function scheduleCommit(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(v), 400);
  }

  function commitNow(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    dragging.current = false;
    onCommit(v);
  }

  function preview() {
    speak('Reading practice helps you understand English more naturally.', {
      rate: local,
      lang: 'en-US',
    });
  }

  const display = local.toFixed(1);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Gauge size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Tốc độ đọc của Bún
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {display}×
        </span>
      </div>
      <input
        type="range"
        min={M4_SETTINGS.passage_tts_rate.min}
        max={M4_SETTINGS.passage_tts_rate.max}
        step={M4_SETTINGS.passage_tts_rate.step}
        value={local}
        onPointerDown={() => { dragging.current = true; }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          scheduleCommit(v);
        }}
        onPointerUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%' }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 4,
        }}
      >
        <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
          Tốc độ TTS khi nghe đọc bài
        </div>
        <button
          type="button"
          onClick={preview}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Play size={12} /> Nghe thử
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// M5 — Voice picker (Âm thanh card)
// ============================================================================

function VoicePickerControl({
  value, onChange, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const refresh = () => {
      setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')));
    };
    refresh();
    // getVoices() is empty on first call in Chrome until voiceschanged fires.
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);

  function preview() {
    speak("Hello, I'm Bún.", { voice_preference: value, lang: 'en-US' });
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Volume2 size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Giọng nói
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '8px 10px',
            background: 'var(--v-surface)',
            border: '1.5px solid var(--v-border)',
            borderRadius: 'var(--v-radius-sm)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            outline: 'none',
            cursor: disabled ? 'wait' : 'pointer',
          }}
        >
          <option value="auto">Tự động (mặc định trình duyệt)</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} — {v.lang}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={preview}
          disabled={disabled}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            cursor: disabled ? 'wait' : 'pointer',
          }}
        >
          <Play size={12} /> Nghe thử
        </button>
      </div>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 4 }}>
        Giọng đọc TTS{voices.length === 0 ? ' — trình duyệt chưa nạp giọng en-*' : ''}
      </div>
    </div>
  );
}

// ============================================================================
// M5 — Theme picker (Giao diện card)
// ============================================================================

function ThemeControl({
  value, onChange, disabled,
}: {
  value: ThemeMode;
  onChange: (v: ThemeMode) => void;
  disabled: boolean;
}) {
  const options: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Sáng', icon: <Sun size={14} /> },
    { value: 'dark', label: 'Tối', icon: <Moon size={14} /> },
    { value: 'system', label: 'Hệ thống', icon: <Monitor size={14} /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Palette size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Chế độ màu
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              style={{
                padding: '10px 0',
                borderRadius: 'var(--v-radius-sm)',
                border: '1.5px solid',
                borderColor: active ? 'var(--v-primary)' : 'var(--v-border)',
                background: active ? 'var(--v-primary)' : 'var(--v-surface)',
                color: active ? '#fff' : 'var(--v-ink)',
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-sm)',
                fontWeight: 800,
                cursor: disabled ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'background 120ms var(--v-ease)',
              }}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 6 }}>
        Sáng / Tối / Theo cài đặt hệ thống của máy bạn
      </div>
    </div>
  );
}
