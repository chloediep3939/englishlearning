'use client';

import { useSearchParams } from 'next/navigation';
import Mascot from '@/components/Mascot';

const ERROR_MESSAGES: Record<string, string> = {
  denied: 'Bạn đã huỷ đăng nhập. Thử lại?',
  not_allowed: 'Email này chưa được phép truy cập. Liên hệ admin.',
  email_unverified: 'Email Google của bạn chưa verify.',
  state_mismatch: 'Phiên đăng nhập hết hạn. Thử lại.',
  oauth_error: 'Lỗi xác thực với Google. Thử lại.',
  oauth_misconfigured: 'Server chưa cấu hình OAuth.',
  token_exchange_failed: 'Lỗi khi trao đổi token. Thử lại.',
  token_verify_failed: 'Không verify được token. Thử lại.',
  db_error: 'Lỗi server. Thử lại sau.',
  aud_mismatch: 'Cấu hình OAuth không khớp.',
  iss_invalid: 'Token không hợp lệ.',
  missing_params: 'Thiếu tham số.',
  no_email: 'Không lấy được email từ Google.',
  no_id_token: 'Không lấy được token từ Google.',
};

export default function LoginInner() {
  const sp = useSearchParams();
  const error = sp.get('error');
  const next = sp.get('next');
  const errorMsg = error ? (ERROR_MESSAGES[error] ?? 'Lỗi không xác định.') : null;

  const signinUrl = '/api/auth/google' + (next ? `?next=${encodeURIComponent(next)}` : '');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
    }}>
      <div style={{
        maxWidth: 380,
        width: '100%',
        background: 'var(--v-surface)',
        border: `1px solid var(--v-border)`,
        borderRadius: 'var(--v-radius-xl)',
        boxShadow: 'var(--v-shadow-lg)',
        padding: '32px 28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Mascot pose="idle" size={88} bob />
        </div>
        <h1 style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 6px',
          textAlign: 'center',
        }}>
          Chào, mình là Bún!
        </h1>
        <p style={{
          fontSize: 'var(--v-text-md)',
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          textAlign: 'center',
        }}>
          Đăng nhập bằng Google để bắt đầu học.
        </p>

        {errorMsg && (
          <div style={{
            padding: '10px 12px',
            background: 'rgba(255,87,87,0.08)',
            border: '1px solid rgba(255,87,87,0.25)',
            borderRadius: 'var(--v-radius-sm)',
            color: 'var(--v-red)',
            fontSize: 'var(--v-text-md)',
            marginBottom: 12,
          }}>
            {errorMsg}
          </div>
        )}

        <a
          href={signinUrl}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '12px 18px',
            background: '#fff',
            color: '#1f1f1f',
            border: '1px solid var(--v-border-med)',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-shadow-sm)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-base)',
            textDecoration: 'none',
            transition: 'box-shadow 120ms var(--v-ease)',
          }}
        >
          <GoogleLogo />
          Đăng nhập với Google
        </a>

        <p style={{
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-muted)',
          margin: '14px 0 0',
          textAlign: 'center',
        }}>
          Chỉ cần tài khoản Google. Không lưu mật khẩu.
        </p>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
