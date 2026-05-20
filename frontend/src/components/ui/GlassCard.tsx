import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  purple?: boolean;
  /** Backward-compatible accent mapping for older call sites. */
  neon?: 'cyan' | 'purple' | 'pink' | 'none';
  intensity?: 'low' | 'medium' | 'high';
  onClick?: () => void;
}

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
} as const;

export function GlassCard({
  children,
  className = '',
  padding = 'md',
  hover = true,
  purple = false,
  neon = 'cyan',
  intensity = 'medium',
  onClick,
  onDrag,
  onDragStart,
  onDragEnd,
  ...restProps
}: GlassCardProps) {
  const useNeon = neon !== 'none';
  const base = useNeon ? 'glass-card glass-card--accent' : 'glass-card';
  const neonClass = useNeon ? `glass-card--${neon}` : '';
  const hoverClass = purple ? 'glass-card--warm' : '';
  const pad = PADDING[padding];
  const clickable = onClick ? 'cursor-pointer' : '';
  const pulseClass = useNeon && intensity === 'high' ? 'animate-glow-pulse' : '';

  return (
    <motion.div
      className={`${base} ${neonClass} ${hover ? hoverClass : ''} ${pad} ${clickable} ${pulseClass} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      whileHover={hover || onClick ? { scale: 1.01, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98, y: 2 } : undefined}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      {...restProps}
    >
      {children}
    </motion.div>
  );
}
