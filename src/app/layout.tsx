import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import DemoBanner from '@/components/demo/demo-banner';
import { getCurrentUser } from '@/lib/current-user';
import { userSettingsDb } from '@/lib/db';
import { ThemeProvider, THEME_PREHYDRATION_SCRIPT } from '@/components/ThemeProvider';
import PomodoroProvider from '@/components/pomodoro/pomodoro-provider';
import type { ThemeMode } from '@/lib/types';

export const metadata: Metadata = {
  title: 'English Learning',
  description: 'Học từ vựng tiếng Anh với Bún',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Read theme + Pomodoro lengths from settings when logged-in. Unauthenticated
  // visitors fall back to the prehydration-script value (theme = 'system') and
  // standard Pomodoro defaults.
  let theme: ThemeMode = 'system';
  let pomodoroWorkMinutes = 25;
  let pomodoroBreakMinutes = 5;
  if (user) {
    try {
      const settings = await userSettingsDb.getFlashcardSettings(user.id);
      theme = settings.theme;
      pomodoroWorkMinutes = settings.pomodoro_work_minutes;
      pomodoroBreakMinutes = settings.pomodoro_break_minutes;
    } catch {
      /* ignore — keep default */
    }
  }

  // Render `data-theme` directly on <html> in SSR so the DOM and the
  // server-rendered HTML agree before the prehydration script runs.
  // 'system' has no SSR-resolvable value (no access to prefers-color-scheme
  // on the server), so we default to 'light' and let the script flip to
  // 'dark' on dark-OS clients. That one residual mismatch is silenced by
  // suppressHydrationWarning.
  const serverTheme: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light';

  return (
    <html lang="vi" data-theme={serverTheme} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_PREHYDRATION_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <PomodoroProvider
            workMinutes={pomodoroWorkMinutes}
            breakMinutes={pomodoroBreakMinutes}
          >
            {user ? (
              <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--v-bg)' }}>
                <div className="hidden md:block">
                  <Sidebar
                    userEmail={user.email}
                    userName={user.name}
                    userPicture={user.picture_url}
                    isDemo={user.is_demo}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  {user.is_demo && user.demo_expires_at != null && (
                    <DemoBanner expiresAtSec={user.demo_expires_at} />
                  )}
                  <main
                    className="flex-1 overflow-auto md:pt-5 md:px-8 md:pb-6"
                    style={{ flex: 1, overflow: 'auto' }}
                  >
                    {children}
                  </main>
                </div>
              </div>
            ) : (
              <div style={{ minHeight: '100vh', background: 'var(--v-bg)' }}>
                {children}
              </div>
            )}
          </PomodoroProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
