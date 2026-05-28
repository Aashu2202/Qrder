'use client';

import { useEffect, useState } from 'react';
import { animate, useMotionValue, useTransform, motion } from 'framer-motion';

interface Props {
  value: number;
  /** ms */
  duration?: number;
  /** Formatter for display — receives the current integer-or-float tick */
  format?: (n: number) => string;
  className?: string;
}

/**
 * Animates from the previous value to the new value when `value` changes.
 * Defaults to 700ms ease-out. Uses framer-motion's MotionValue to avoid
 * React-rerendering every frame.
 */
export function AnimatedCounter({ value, duration = 700, format, className }: Props) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest) =>
    format ? format(latest) : Math.round(latest).toLocaleString(),
  );
  const [text, setText] = useState<string>(format ? format(0) : '0');

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = display.on('change', (v) => setText(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, duration, motionValue, display]);

  return <motion.span className={className}>{text}</motion.span>;
}
