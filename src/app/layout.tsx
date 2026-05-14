import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { getCurrentUser } from '@/lib/current-user';
import { userSettingsDb } from '@/lib/db';
import { ThemeProvider, THEME_PREHYDRATION_SCRIPT } from '@/components/ThemeProvider';
import type { ThemeMode } from '@/lib/types';

export const metadata: Metadata = {
  title: 'English Learning',
  description: 'Học từ vựng tiếng Anh với Bún',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Read theme from settings when logged-in so the provider applies the
  // user's choice. Unauthenticated visitors fall back to the
  // prehydration-script value (which is 'system' by default).
  let theme: ThemeMode = 'system';
  if (user) {
    try {
      const settings = await userSettingsDb.getFlashcardSettings(user.id);
      theme = settings.theme;
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
        </ThemeProvider>
      </body>
    </html>
  );
}
