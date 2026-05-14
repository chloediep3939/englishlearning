'use client';

import { useReveal } from './useReveal';

interface Props {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function Reveal({ children, delay = 0, distance = 28, style, className }: Props) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : `translateY(${distance}px) scale(0.985)`,
        transition: `opacity .7s cubic-bezier(.2,.7,.3,1) ${delay}ms, transform .8s cubic-bezier(.2,.7,.3,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
