import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = {
  title: 'English Learning',
  description: 'Học từ vựng tiếng Anh với Bún',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="vi">
      <body>
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
      </body>
    </html>
  );
}
