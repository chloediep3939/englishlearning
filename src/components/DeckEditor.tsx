'use client';

import { useState, useEffect } from 'react';
import {
  X, BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { FlashcardDeck, DeckIcon } from '@/lib/types';
import { DECK_ICON_OPTIONS } from '@/lib/types';

interface Props {
  deck: FlashcardDeck | null; // null = creating new
  onClose: () => void;
  onSaved: () => void;
}

const COLORS = ['#7ac143', '#ff7849', '#ffd143', '#3da9fc', '#a974ff', '#ff5fb1', '#5fd4c8'];

// Mapping of icon names to lucide components. Order matches DECK_ICON_OPTIONS.
const ICON_MAP: Record<DeckIcon, LucideIcon> = {
  BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
};

export default function DeckEditor({ deck, onClose, onSaved }: Props) {
  const [name, setName] = useState(deck?.name ?? '');
  const [description, setDescription] = useState(deck?.description ?? '');
  const [subtitle, setSubtitle] = useState(deck?.subtitle ?? '');
  const [color, setColor] = useState(deck?.color ?? COLORS[0]);
  const [icon, setIcon] = useState<DeckIcon>(
    (deck?.icon && (DECK_ICON_OPTIONS as readonly string[]).includes(deck.icon)
      ? (deck.icon as DeckIcon)
      : DECK_ICON_OPTIONS[0])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(deck?.name ?? '');
    setDescription(deck?.description ?? '');
    setSubtitle(deck?.subtitle ?? '');
    setColor(deck?.color ?? COLORS[0]);
    setIcon(
      deck?.icon && (DECK_ICON_OPTIONS as readonly string[]).includes(deck.icon)
        ? (deck.icon as DeckIcon)
        : DECK_ICON_OPTIONS[0]
    );
  }, [deck]);

  async function handleSave() {
    if (name.trim().length === 0) {
      setError('Tên không được để trống.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = deck === null || deck.id === 0;
      const url = isNew ? '/api/decks' : `/api/decks/${deck.id}`;
      const trimmedSub = subtitle.trim();
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          icon,
          subtitle: trimmedSub.length === 0 ? null : trimmedSub,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Không lưu được.');
        return;
      }
      onSaved();
    } catch {
      setError('Lỗi kết nối.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,30,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 520,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-2xl)',
              margin: 0,
              color: 'var(--v-ink)',
            }}
          >
            {deck ? 'Sửa bộ từ' : 'Tạo bộ từ mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--v-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(255,87,87,0.08)',
              border: '1px solid rgba(255,87,87,0.25)',
              borderRadius: 'var(--v-radius-sm)',
              color: 'var(--v-red)',
              fontSize: 'var(--v-text-sm)',
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <Label>Tên bộ từ</Label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="vd: TOEIC 600"
          autoFocus
          style={inputStyle()}
        />

        <Label>Mô tả ngắn (subtitle)</Label>
        <input
          type="text"
          value={subtitle ?? ''}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="vd: Daily English, TOEIC vocab"
          maxLength={60}
          style={inputStyle()}
        />

        <Label>Ghi chú (tuỳ chọn)</Label>
        <textarea
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ngữ cảnh, mục tiêu..."
          rows={2}
          style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'var(--v-font-body)' }}
        />

        <Label>Biểu tượng</Label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 8,
            marginBottom: 8,
          }}
        >
          {DECK_ICON_OPTIONS.map((opt) => {
            const Icon = ICON_MAP[opt];
            const active = icon === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setIcon(opt)}
                aria-label={opt}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--v-radius-sm)',
                  background: active ? color : 'var(--v-bg)',
                  border: active
                    ? `2px solid var(--v-primary)`
                    : '1.5px solid var(--v-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: active ? '#fff' : 'var(--v-ink-soft)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        <Label>Màu</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Màu ${c}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: c,
                border: color === c ? '3px solid var(--v-ink)' : '2px solid var(--v-border)',
                cursor: 'pointer',
                boxShadow: color === c ? `0 0 0 2px ${c}40` : 'none',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              background: 'var(--v-surface)',
              color: 'var(--v-ink-soft)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              cursor: 'pointer',
            }}
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || name.trim().length === 0}
            style={{
              padding: '10px 22px',
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-md)',
              cursor: saving || name.trim().length === 0 ? 'not-allowed' : 'pointer',
              opacity: saving || name.trim().length === 0 ? 0.6 : 1,
            }}
          >
            {saving ? 'ĐANG LƯU...' : 'LƯU'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--v-font-body)',
        fontSize: 'var(--v-text-xs)',
        fontWeight: 800,
        color: 'var(--v-muted)',
        letterSpacing: 'var(--v-tracking-wider)',
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 14,
      }}
    >
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '11px 14px',
    fontFamily: 'var(--v-font-body)',
    fontSize: 'var(--v-text-base)',
    fontWeight: 600,
    background: 'var(--v-bg)',
    border: '1.5px solid var(--v-border)',
    borderRadius: 'var(--v-radius-md)',
    color: 'var(--v-ink)',
    outline: 'none',
    marginBottom: 4,
  };
}
