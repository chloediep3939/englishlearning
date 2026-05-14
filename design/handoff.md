# Học AV · V2 — Handoff cho codebase

Mọi thứ bạn cần để ráp UI từ V2 vào Next.js + portfolio.

---

## 1. File đã export

| File | Vai trò |
| --- | --- |
| `globals-v2.css` | Toàn bộ design tokens (`--v-*`) + keyframes + recipe classes |
| `assets/mascot/*.png` | 7 trạng thái của Ngọc — copy nguyên thư mục `assets/mascot/` vào `public/` |
| (artboards trong canvas) | Tham khảo layout pixel-by-pixel khi build component |

---

## 2. Step 1 — Load fonts

Thêm vào `app/layout.tsx` (head) hoặc `globals.css` (top):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

(Lora đã có sẵn cho portfolio wordmark — không cần load lại.)

---

## 3. Step 2 — Paste tokens

Mở `app/globals.css`, paste nguyên block trong `globals-v2.css` vào dưới `:root` hiện tại của portfolio. Không có collision nào vì tất cả tên đều có prefix `--v-`.

Tokens cũ của bạn (`--bg`, `--text`, ...) cứ để nguyên cho portfolio chính. V2 dùng riêng `--v-*` để không can thiệp.

---

## 4. Mapping nhanh — token cũ → token V2

Nếu muốn LearningEnglish module dùng tokens mới hoàn toàn, override trong scope:

```css
/* app/learning-english/layout.tsx wraps content with [data-module="hoc-av"] */
[data-module="hoc-av"] {
  --bg:       var(--v-bg);
  --text:     var(--v-ink);
  --muted:    var(--v-muted);
  --card-bg:  var(--v-surface);
  --border:   var(--v-border);
  --primary:  var(--v-primary);
  --tag-bg:   var(--v-primary-soft);
  --gradient: linear-gradient(135deg, #ff8956, #ffa872);
  --mono:     var(--v-font-mono);
}
```

Hoặc đơn giản hơn: dùng trực tiếp `var(--v-primary)` trong inline style của module.

---

## 5. Component cookbook — top patterns

### 5.1 Soft chunky card

```tsx
<div style={{
  background: 'var(--v-surface)',
  border: '1px solid var(--v-border)',
  borderRadius: 'var(--v-radius-lg)',
  boxShadow: 'var(--v-shadow-md)',
  padding: 16,
}}>
  ...
</div>
```

### 5.2 Primary button (CTA)

```tsx
<button style={{
  padding: '11px 18px',
  background: 'var(--v-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--v-radius-md)',
  boxShadow: 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
  fontFamily: 'var(--v-font-head)',
  fontWeight: 900,
  fontSize: 14,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8,
}}>
  ÔN NGAY · 46
</button>
```

### 5.3 Top pill (hearts / gems / streak)

```tsx
<div style={{
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 12px 6px 8px',
  background: 'var(--v-surface)',
  border: '1px solid var(--v-border)',
  borderRadius: 'var(--v-radius-pill)',
  boxShadow: 'var(--v-shadow-sm)',
  fontFamily: 'var(--v-font-head)',
  fontWeight: 900,
  fontSize: 16,
}}>
  <Flame size={18} color="var(--v-red)" fill="var(--v-red)" />
  7
</div>
```

### 5.4 Stat tile (4 màu)

```tsx
const tiles = [
  { v: 12,  l: 'Từ mới',    sub: 'chờ học',   c: 'var(--v-blue)',    icon: Sparkles },
  { v: 38,  l: 'Đang học',  sub: 'tuần này',  c: 'var(--v-orange)',  icon: BookOpen },
  { v: 154, l: 'Đang ôn',   sub: 'đã chín',   c: 'var(--v-primary)', icon: RotateCw },
  { v: 73,  l: 'Thuộc rồi', sub: '+5 tuần',   c: 'var(--v-purple)',  icon: Trophy },
];
```

### 5.5 Rating button (Lại / Khó / Tốt / Dễ)

```tsx
const ratings = [
  { key: 1, label: 'LẠI', sub: '< 1 phút', emoji: '😵', bg: 'var(--v-red)' },
  { key: 2, label: 'KHÓ', sub: '10 phút',  emoji: '😬', bg: 'var(--v-orange)' },
  { key: 3, label: 'TỐT', sub: '1 ngày',   emoji: '😊', bg: 'var(--v-primary)' },
  { key: 4, label: 'DỄ',  sub: '4 ngày',   emoji: '🎉', bg: 'var(--v-blue)' },
];
```

### 5.6 Char-diff (typed recall reveal)

```tsx
function charColor(guess: string, answer: string, i: number) {
  const c = guess[i], target = answer[i];
  if (c === target)                return 'var(--v-primary)';  // đúng vị trí
  if (target && answer.includes(c)) return 'var(--v-orange)';   // sai vị trí
  return 'var(--v-red)';                                        // không có
}
```

---

## 6. Lucide-react icons đã dùng

Map sang `lucide-react` (đã có sẵn trong portfolio):

| Trong design | Lucide name |
| --- | --- |
| home | `LayoutGrid` |
| plus | `Plus` |
| book | `BookOpen` |
| refresh | `RotateCcw` |
| library | `Library` |
| folder | `Folder` |
| chart | `BarChart3` |
| settings | `Settings` |
| flame | `Flame` |
| sparkle | `Sparkles` |
| heart | `Heart` |
| gem | `Gem` |
| bolt | `Zap` |
| trophy | `Trophy` |
| target | `Target` |
| speaker | `Volume2` |
| pencil | `Pencil` |
| bell | `Bell` |
| arrow-right | `ArrowRight` |
| quote | `Quote` |
| search | `Search` |
| check | `Check` |

---

## 7. Mascot integration

```tsx
// components/learning-english/Mascot.tsx
import Image from 'next/image';

const MASCOTS = {
  idle:  '/mascot/ngoc-idle.png',
  happy: '/mascot/ngoc-happy.png',
  blink: '/mascot/ngoc-blink.png',
  sleep: '/mascot/ngoc-sleep.png',
  // ...
} as const;

export function Mascot({ pose = 'idle', size = 80, float = false }: Props) {
  return (
    <Image
      src={MASCOTS[pose]}
      alt="Ngọc"
      width={size}
      height={size}
      style={{
        filter: 'drop-shadow(0 4px 8px rgba(40,30,15,0.15))',
        animation: float ? 'v-ngoc-float 3.5s ease-in-out infinite' : undefined,
      }}
      priority={pose === 'happy'}
    />
  );
}
```

---

## 8. Layout shell

```tsx
// app/learning-english/layout.tsx
export default function HocAvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-module="hoc-av" style={{ minHeight: '100vh', background: 'var(--v-bg)' }}>
      {/* portfolio top nav đã sẵn từ root layout */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 54px)' }}>
        <ModuleSidebar />     {/* 196px chunky-icon nav */}
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
```

---

## 9. Lưu ý quan trọng

- **Mascot ngôi xưng**: trong copy, để mascot xưng "**mình**" và gọi user là "**bạn**" — đã consistent trong all V2 mockup.
- **Sleeping ngoc** ở góc sidebar bottom = decorative, có thể swap pose theo trạng thái app (idle khi user active, sleep khi idle > 30s, run khi đang chơi flashcard…).
- **Char-diff colors** ăn khớp với rating button colors: cùng `--v-primary` (xanh = đúng), `--v-orange` (sai vị trí / khó), `--v-red` (không có / lại).
- **Yellow** chỉ dùng cho **Flashcard nhanh** (chế độ tốc độ) — đừng dùng nơi khác để giữ sự nhận diện.
- **Mobile**: chưa export — nếu cần mình export thêm.
