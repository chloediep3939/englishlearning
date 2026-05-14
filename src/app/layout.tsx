import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
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

  return (
    <html lang="vi">
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
                <Sidebar
                  userEmail={user.email}
                  userName={user.name}
                  userPicture={user.picture_url}
                />
                <main style={{ flex: 1, padding: '20px 32px 24px', overflow: 'auto' }}>
                  {children}
                </main>
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
