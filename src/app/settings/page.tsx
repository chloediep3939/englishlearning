'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon, Check, Target, Mic, Timer, BookOpenText, GraduationCap, Gauge, Play } from 'lucide-react';
import LoadingState from '@/components/LoadingState';
import type { FlashcardSettings, CefrLevel } from '@/lib/types';
import { M3_SETTINGS, M4_SETTINGS } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<FlashcardSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json() as Promise<FlashcardSettings>)
      .then((d) => setSettings(d))
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Lỗi kết nối.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
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
            maxWidth: 720,
          }}
        >
          {error}
        </div>
      )}

      {!settings ? (
        <LoadingState message="Đang tải cài đặt…" />
      ) : (
        <div>
          <Section title="Mục tiêu hàng ngày">
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
          </Section>

          <Section title="Ôn tập">
            <Toggle
              label="Ẩn từ đã master khỏi ôn tập"
              hint="Từ ở status 'master' sẽ không hiện trong /review"
              checked={settings.mastered_hide_from_review}
              onChange={(v) => save({ mastered_hide_from_review: v })}
              disabled={saving}
            />
          </Section>

          <Section title="Luyện tập">
            <SliderWithIcon
              icon={<Target size={14} />}
              label="Mục tiêu từ mới mỗi ngày"
              hint="Số từ mới Bún sẽ giúp bạn học mỗi ngày"
              value={settings.daily_new_word_target}
              min={M3_SETTINGS.daily_new_word_target.min}
              max={M3_SETTINGS.daily_new_word_target.max}
              step={M3_SETTINGS.daily_new_word_target.step}
              onCommit={(v) => save({ daily_new_word_target: v })}
              suffix="từ"
            />

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
          </Section>

          <Section title="Học theo bài đọc">
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
          </Section>

          <Section title="Nhắc nhở (sắp có)">
            <Toggle
              label="Bật nhắc học hàng ngày"
              hint="Push notification — cần permission từ browser"
              checked={settings.reminder_enabled}
              onChange={(v) => save({ reminder_enabled: v })}
              disabled={saving}
            />
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
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
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
        padding: 18,
        marginBottom: 14,
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-base)',
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wider)',
          textTransform: 'uppercase',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Slider({
  label, value, min, max, step, onCommit, suffix,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onCommit: (v: number) => void; suffix: string;
}) {
  // Local state so dragging stays smooth and doesn't fire a PUT per tick.
  // Parent only learns the new value after the user stops moving (debounce)
  // or releases the thumb. Sync back when the parent value changes externally.
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
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-md)',
            fontWeight: 900,
            color: 'var(--v-primary)',
          }}
        >
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
        alignItems: 'center',
        gap: 12,
        cursor: disabled ? 'wait' : 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: 18, height: 18, cursor: disabled ? 'wait' : 'pointer' }}
      />
      <span>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            fontWeight: 600,
          }}
        >
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
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-md)',
            fontWeight: 900,
            color: 'var(--v-primary)',
          }}
        >
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

/**
 * Specialised control for `f1_max_attempts` — slider 1-10 PLUS a checkbox
 * "Không giới hạn". Checked stores 0; unchecked + dragging stores 1-10.
 * When the user re-enables the slider from "unlimited", the slider position
 * stays at the previously stored value if it was 1-10, else defaults to 3.
 * The 0/unlimited state is only written when the user TOGGLES the checkbox
 * (not when they drag back to a small slider value).
 */
function MaxAttemptsControl({
  value, onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const unlimited = value === 0;
  // Position the slider would show if we re-enabled. Defaults to last numeric
  // value (or M3 default 3) — never 0, since the slider min is 1.
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
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            fontWeight: 600,
          }}
        >
          Số lần thử khi luyện đọc
        </span>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-md)',
            fontWeight: 900,
            color: 'var(--v-primary)',
          }}
        >
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
  value,
  onChange,
  disabled,
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
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            fontWeight: 600,
          }}
        >
          Trình độ tiếng Anh (CEFR)
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 4,
          marginBottom: 4,
        }}
      >
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
  value,
  onCommit,
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
    // Use the user's current local rate (not the saved one) so they hear
    // exactly what they're dragging towards. Bail silently in environments
    // without speechSynthesis (some embedded webviews).
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        'Reading practice helps you understand English more naturally.',
      );
      u.rate = local;
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  const display = local.toFixed(1);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Gauge size={14} />
        </span>
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            fontWeight: 600,
          }}
        >
          Tốc độ đọc của Bún
        </span>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-md)',
            fontWeight: 900,
            color: 'var(--v-primary)',
          }}
        >
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

