'use client';

// Tilting speech bubble used by hero, FAQ aside, and CTA. The tail can point
// in any cardinal direction — set via the `tail` prop. Color defaults to white
// surface but accepts a custom `bg` (e.g. the gradient CTA uses white-on-blue).

interface Props {
  children: React.ReactNode;
  tail?: 'left' | 'right' | 'top' | 'bottom';
  tailOffset?: number; // px from the corresponding edge of the bubble
  bg?: string;
  borderColor?: string;
  shadow?: string;
  font?: 'body' | 'serif';
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  color?: string;
  padding?: string;
  borderRadius?: number;
  tilt?: boolean; // tilt-loop animation on the whole bubble
  tiltDuration?: number; // seconds
  style?: React.CSSProperties;
}

export default function SpeechBubble({
  children,
  tail = 'left',
  tailOffset = 14,
  bg = 'var(--v-surface)',
  borderColor = 'var(--v-border)',
  shadow = 'var(--v-shadow-md)',
  font = 'body',
  fontSize = 12,
  fontWeight = 700,
  fontStyle = 'normal',
  color = 'var(--v-ink)',
  padding = '9px 14px',
  borderRadius = 16,
  tilt = true,
  tiltDuration = 4,
  style,
}: Props) {
  // Tail is rendered as a small rotated square that picks up the bubble's
  // borders along two edges, so it visually merges with the bubble.
  const tailSize = 12;
  const half = tailSize / 2;

  // Position of the tail's center relative to the bubble. The two borders
  // shown depend on direction: tail-left exposes the bubble's left+bottom of
  // the square (the rotated square's bottom-left points outward).
  const tailStyle: React.CSSProperties = {
    position: 'absolute',
    width: tailSize,
    height: tailSize,
    background: bg,
    transform: 'rotate(45deg)',
  };
  if (tail === 'left') {
    tailStyle.left = -half + 1;
    tailStyle.top = tailOffset;
    tailStyle.borderLeft = `1px solid ${borderColor}`;
    tailStyle.borderBottom = `1px solid ${borderColor}`;
  } else if (tail === 'right') {
    tailStyle.right = -half + 1;
    tailStyle.top = tailOffset;
    tailStyle.borderRight = `1px solid ${borderColor}`;
    tailStyle.borderTop = `1px solid ${borderColor}`;
  } else if (tail === 'top') {
    tailStyle.top = -half + 1;
    tailStyle.left = tailOffset;
    tailStyle.borderLeft = `1px solid ${borderColor}`;
    tailStyle.borderTop = `1px solid ${borderColor}`;
  } else {
    // bottom
    tailStyle.bottom = -half + 1;
    tailStyle.left = tailOffset;
    tailStyle.borderRight = `1px solid ${borderColor}`;
    tailStyle.borderBottom = `1px solid ${borderColor}`;
  }

  const fontFamily = font === 'serif' ? 'var(--v-font-serif)' : 'var(--v-font-body)';

  return (
    <div
      style={{
        position: 'absolute',
        background: bg,
        padding,
        border: `1px solid ${borderColor}`,
        boxShadow: shadow,
        borderRadius,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        color,
        whiteSpace: 'nowrap',
        animation: tilt ? `v-bun-tilt-loop ${tiltDuration}s ease-in-out infinite` : undefined,
        ...style,
      }}
    >
      {children}
      <div style={tailStyle} />
    </div>
  );
}
