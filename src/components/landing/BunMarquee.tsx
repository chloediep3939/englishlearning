'use client';

import Icon from './shared/Icon';

// Scrolling aphorism ticker. English in italic serif (Lora), then an em-dash,
// then the Vietnamese parallel proverb in the same italic serif. Tripled so
// the visible span stays full as the track slides off-screen. Pauses on
// hover (.bun-marquee CSS in globals.css).

const APHORISMS: ReadonlyArray<readonly [en: string, vi: string]> = [
  ['Practice makes perfect',                                   'Có công mài sắt có ngày nên kim'],
  ["Where there's a will, there's a way",                      'Có chí thì nên'],
  ['Knowledge is power',                                       'Tri thức là sức mạnh'],
  ['Slow and steady wins the race',                            'Chậm mà chắc'],
  ['Actions speak louder than words',                          'Hành động hơn lời nói'],
  ['A journey of a thousand miles begins with a single step',  'Vạn sự khởi đầu nan'],
  ["Rome wasn't built in a day",                               'Việc lớn cần thời gian'],
  ['The early bird catches the worm',                          'Đi sớm bắt được giun'],
  ['No pain, no gain',                                         'Không vào hang cọp sao bắt được cọp con'],
  ['Little strokes fell great oaks',                           'Kiến tha lâu cũng đầy tổ'],
  ['Failure is the mother of success',                         'Thất bại là mẹ thành công'],
  ['Better late than never',                                   'Muộn còn hơn không'],
  ['Easy come, easy go',                                       'Của thiên trả địa'],
  ['Time is gold',                                             'Thời gian là vàng bạc'],
  ['Learn as if you will live forever',                        'Học, học nữa, học mãi'],
  ['Every cloud has a silver lining',                          'Trong cái rủi có cái may'],
  ['A good beginning makes a good ending',                     'Đầu xuôi đuôi lọt'],
  ['If at first you don\'t succeed, try, try again',           'Có chí làm quan, có gan làm giàu'],
  ['Many a little makes a mickle',                             'Năng nhặt chặt bị'],
  ['Strike while the iron is hot',                             'Cờ đến tay phải phất'],
];

export default function BunMarquee() {
  const track = [...APHORISMS, ...APHORISMS, ...APHORISMS];
  return (
    <div
      className="bun-marquee"
      style={{
        background: 'var(--v-panel)',
        borderTop: '1px solid var(--v-border)',
        borderBottom: '1px solid var(--v-border)',
        padding: '14px 0',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--v-surface)',
          padding: '4px 10px',
          borderRadius: 999,
          border: '1px solid var(--v-border)',
          fontFamily: 'var(--v-font-body)',
          fontSize: 11,
          fontWeight: 900,
          color: 'var(--v-brand)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 2,
          boxShadow: 'var(--v-shadow-sm)',
        }}
      >
        <Icon name="sparkle" size={12} stroke="var(--v-brand)" fill="var(--v-brand)" /> Tiếp thêm động lực →
      </div>
      <div
        className="bun-marquee-track"
        style={{
          display: 'flex',
          gap: 36,
          whiteSpace: 'nowrap',
        }}
      >
        {track.map(([en, vi], i) => (
          <span
            key={i}
            style={{
              fontFamily: 'var(--v-font-serif)',
              fontStyle: 'italic',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--v-ink-soft)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--v-brand)', marginRight: 8 }}>✦</span>
            {en}{' '}
            <span style={{ color: 'var(--v-muted)', margin: '0 4px' }}>—</span>{' '}
            <span style={{ color: 'var(--v-ink)' }}>{vi}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
