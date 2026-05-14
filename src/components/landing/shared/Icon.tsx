'use client';

// Landing-only icon wrapper. Keeps the design source's `name` vocabulary
// (book / refresh / sparkle / arrowRight / …) while routing to lucide-react.
// Add new mappings here as needed — never inline a lucide import inside a
// landing/ component file. See src/doc/results/landing-page-result.md for the
// full design-name → lucide mapping.

import {
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Gem,
  Layers,
  Pencil,
  Play,
  Plus,
  Quote,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  arrowRight: ArrowRight,
  book: BookOpen,
  bolt: Zap,
  cards: Layers,
  check: Check,
  flame: Flame,
  gem: Gem,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  quote: Quote,
  refresh: RefreshCw,
  sparkle: Sparkles,
  speaker: Volume2,
  target: Target,
  trophy: Trophy,
};

export type IconName = keyof typeof ICON_MAP;

interface Props {
  name: string;
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export default function Icon({
  name,
  size = 18,
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 2,
  style,
}: Props) {
  const Cmp = ICON_MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={stroke} fill={fill} strokeWidth={strokeWidth} style={style} />;
}
