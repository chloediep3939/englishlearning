'use client';

import { useEffect } from 'react';

interface Props {
  /** Gọi khi user bấm X hoặc Esc. Bên gọi tự quyết có hỏi lưu hay không. */
  onRequestClose: () => void;
  /** Tắt Esc khi đang có hộp xác nhận chồng lên (hộp đó tự xử Esc). */
  escDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Khung popup cho bài tự kiểm tra. Theo đúng khuôn các popup khác trong app
 * (WordReviewModal, DeleteDeckDialog) — lớp phủ tối + thẻ giữa màn — trừ một
 * điểm cố ý khác: BẤM RA NGOÀI KHÔNG ĐÓNG. Đang làm dở 30 từ mà lỡ tay bấm ra
 * ngoài là mất sạch; chỉ nút X / Esc mới đóng, và đều qua bước hỏi lưu.
 */
export default function TestModal({ onRequestClose, escDisabled = false, children }: Props) {
  // Khoá cuộn trang nền khi popup mở.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (escDisabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onRequestClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRequestClose, escDisabled]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(20,20,30,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0px, 3vw, 24px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          maxHeight: '100%',
          overflowY: 'auto',
          background: 'var(--v-bg)',
          borderRadius: 'clamp(0px, 3vw, 24px)',
          boxShadow: 'var(--v-shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
