'use client';

// Combined button + modal in one client component because they share state.
// Lives in the Sidebar above the user-avatar block, so it survives the
// collapsed-sidebar mode (icon-only).
//
// Email-prefill behaviour:
//   • Real Google user → defaults to their account email.
//   • Demo user (email ends in @bun.local) → leaves it blank; the synthetic
//     placeholder is useless for replies and would confuse the user.

import { useState } from 'react';
import { MessageSquare, X, Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Props {
  collapsed: boolean;        // sidebar collapse state — drives label visibility
  initialEmail: string | null;
  isDemo: boolean;
}

type Mood = 1 | 3 | 5;

const MIN_LEN = 10;
const MAX_LEN = 2000;

export default function FeedbackWidget({ collapsed, initialEmail, isDemo }: Props) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood | null>(null);
  // Demo users' synthetic emails (demo-…@bun.local) make no sense as reply-to —
  // skip the prefill and let them type one if they want a follow-up.
  const prefillEmail = isDemo ? '' : initialEmail ?? '';
  const [email, setEmail] = useState(prefillEmail);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMood(null);
    setEmail(prefillEmail);
    setContent('');
    setSubmitted(false);
    setError(null);
  }

  function close() {
    setOpen(false);
    // Slight delay so the modal-close animation (none today, just a guard
    // against jank) doesn't show the form snapping back during fade.
    setTimeout(reset, 200);
  }

  async function submit() {
    if (content.trim().length < MIN_LEN) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: mood ?? null,
          content: content.trim(),
          email: email.trim() || null,
        }),
      });
      if (!res.ok) {
        setError('Không gửi được. Thử lại nhé.');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setSubmitting(false);
    } catch {
      setError('Lỗi kết nối. Thử lại nhé.');
      setSubmitting(false);
    }
  }

  const tooShort = content.trim().length < MIN_LEN;

  return (
    <>
      {/* ── Trigger button (sidebar item) ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={collapsed ? 'Góp ý cho Bún' : undefined}
        aria-label="Góp ý cho Bún"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          width: '100%',
          padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius: 11,
          background: 'transparent',
          border: 'none',
          color: 'var(--v-ink)',
          fontFamily: 'var(--v-font-body)',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: 'var(--v-teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(40,30,15,0.1)',
            flexShrink: 0,
          }}
        >
          <MessageSquare size={13} color="#fff" strokeWidth={2.4} />
        </div>
        {!collapsed && 'Góp ý'}
      </button>

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Góp ý cho Bún"
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-xl)',
              boxShadow: 'var(--v-shadow-lg)',
              padding: '20px 22px 22px',
              fontFamily: 'var(--v-font-body)',
              color: 'var(--v-ink)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Image
                src="/mascot/ngoc-happy.png"
                alt="Bún"
                width={44}
                height={44}
                style={{ flexShrink: 0 }}
              />
              <h2
                style={{
                  flex: 1,
                  margin: 0,
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-lg)',
                  letterSpacing: 'var(--v-tracking-tight)',
                }}
              >
                Góp ý cho Bún
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Đóng"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--v-ink-soft)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'inline-flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {submitted ? (
              <div style={{ padding: '20px 6px', textAlign: 'center' }}>
                <Sparkles size={32} color="var(--v-primary)" style={{ marginBottom: 10 }} />
                <p
                  style={{
                    margin: '0 0 6px',
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 900,
                    fontSize: 'var(--v-text-lg)',
                  }}
                >
                  Cảm ơn bạn 🌱
                </p>
                <p style={{ margin: '0 0 16px', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-sm)' }}>
                  Bún đã nhận được góp ý của bạn.
                </p>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--v-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--v-radius-md)',
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 800,
                    fontSize: 'var(--v-text-base)',
                    cursor: 'pointer',
                    boxShadow: 'var(--v-shadow-sm)',
                  }}
                >
                  Đóng
                </button>
              </div>
            ) : (
              <>
                {/* Mood picker */}
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 'var(--v-text-sm)',
                      color: 'var(--v-ink-soft)',
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Bạn thấy app thế nào?
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([
                      { value: 1, label: '😞' },
                      { value: 3, label: '😐' },
                      { value: 5, label: '😍' },
                    ] as Array<{ value: Mood; label: string }>).map((m) => {
                      const selected = mood === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMood(selected ? null : m.value)}
                          aria-pressed={selected}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            fontSize: 22,
                            background: selected ? 'var(--v-primary-soft)' : 'var(--v-bg)',
                            border: `1px solid ${selected ? 'var(--v-primary)' : 'var(--v-border)'}`,
                            borderRadius: 'var(--v-radius-md)',
                            cursor: 'pointer',
                            transition: 'background 120ms var(--v-ease), border 120ms var(--v-ease)',
                          }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_LEN))}
                  placeholder="Tính năng gì hay? Chỗ nào khó dùng? Bug? Ý tưởng?"
                  rows={5}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    background: 'var(--v-bg)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-md)',
                    fontFamily: 'inherit',
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink)',
                    resize: 'vertical',
                    minHeight: 90,
                  }}
                />
                <div
                  style={{
                    fontSize: 'var(--v-text-xs)',
                    color: 'var(--v-muted)',
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {content.trim().length}/{MAX_LEN}
                </div>

                {/* Email */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (không bắt buộc)"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 10,
                    padding: '10px 12px',
                    background: 'var(--v-bg)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-md)',
                    fontFamily: 'inherit',
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink)',
                  }}
                />

                {error && (
                  <p
                    style={{
                      margin: '10px 0 0',
                      fontSize: 'var(--v-text-xs)',
                      color: 'var(--v-red)',
                    }}
                  >
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={submit}
                  disabled={tooShort || submitting}
                  style={{
                    width: '100%',
                    marginTop: 14,
                    padding: '12px 18px',
                    background: tooShort ? 'var(--v-muted)' : 'var(--v-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--v-radius-md)',
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 800,
                    fontSize: 'var(--v-text-base)',
                    cursor: tooShort || submitting ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--v-shadow-sm)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: tooShort || submitting ? 0.7 : 1,
                  }}
                >
                  {submitting && (
                    <Loader2 size={16} style={{ animation: 'v-spin 1s linear infinite' }} />
                  )}
                  {submitting ? 'Đang gửi…' : 'Gửi cho Bún'}
                </button>

                <p
                  style={{
                    margin: '10px 0 0',
                    textAlign: 'center',
                    fontSize: 'var(--v-text-xs)',
                    color: 'var(--v-muted)',
                  }}
                >
                  Mình sẽ đọc tất cả góp ý 🌱
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
