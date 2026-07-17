import Link from 'next/link';
import { Plus, ScrollText, FileText, ChevronRight } from 'lucide-react';
import { requireUserId } from '@/lib/current-user';
import { pteTemplatesDb } from '@/lib/templates/db';
import { extractSlots } from '@/lib/templates/slots';
import Mascot from '@/components/common/Mascot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const userId = await requireUserId();
  const templates = await pteTemplatesDb.listByUser(userId);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <h1
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            letterSpacing: 'var(--v-tracking-tight)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--v-ink)',
          }}
        >
          <ScrollText size={24} style={{ color: 'var(--v-purple)' }} /> Template PTE
        </h1>
        <Link
          href="/templates/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            borderRadius: 'var(--v-radius-md)',
            border: 'none',
            background: 'var(--v-purple)',
            color: '#fff',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 800,
            fontSize: 'var(--v-text-md)',
            boxShadow: 'var(--v-shadow-sm)',
            textDecoration: 'none',
          }}
        >
          <Plus size={15} /> Tạo template
        </Link>
      </div>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 18px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Học thuộc khung nói PTE: mình đọc từng cụm cho bạn nhắc lại, rồi ẩn dần
        chữ đến khi bạn thuộc lòng.
      </p>

      {templates.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Mascot pose="sleep" size={88} />
          <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 800, color: 'var(--v-ink)' }}>
            Chưa có template nào
          </div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>
            Tạo template đầu tiên để bắt đầu học thuộc nhé! Dán khung có chỗ trống
            dạng [topic], [N1]… và dấu / để ngắt cụm.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map((t) => {
            const slotCount = extractSlots(t.frame_text).length;
            return (
              <Link
                key={t.id}
                href={`/templates/${t.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'var(--v-surface)',
                  border: '1px solid var(--v-border)',
                  borderRadius: 'var(--v-radius-md)',
                  boxShadow: 'var(--v-shadow-sm)',
                  textDecoration: 'none',
                  color: 'var(--v-ink)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--v-purple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={17} color="#fff" strokeWidth={2.4} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontWeight: 800,
                      fontSize: 'var(--v-text-md)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 'var(--v-text-xs)',
                      color: 'var(--v-muted)',
                      marginTop: 2,
                    }}
                  >
                    {slotCount} chỗ trống · {t.fill_count ?? 0} bài mẫu
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--v-muted)', flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
