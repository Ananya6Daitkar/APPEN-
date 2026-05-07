'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'blue' | 'emerald' | 'violet' | 'none'
  style?: React.CSSProperties
  onClick?: () => void
}

export function GlassCard({
  children,
  className,
  hover = false,
  glow = 'none',
  style,
  onClick,
}: GlassCardProps) {
  const glowClass = {
    blue: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.18),0_8px_32px_rgba(0,0,0,0.4)]',
    emerald: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.18),0_8px_32px_rgba(0,0,0,0.4)]',
    violet: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.18),0_8px_32px_rgba(0,0,0,0.4)]',
    none: 'hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
  }[glow]

  if (hover) {
    return (
      <motion.div
        style={style}
        onClick={onClick}
        whileHover={{ y: -3, scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={cn(
          'rounded-xl border backdrop-blur-md cursor-default',
          'bg-[rgba(15,23,42,0.7)] border-[rgba(255,255,255,0.08)]',
          'transition-[border-color,box-shadow] duration-300',
          'hover:border-[rgba(255,255,255,0.14)]',
          glowClass,
          className
        )}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      style={style}
      onClick={onClick}
      className={cn(
        'rounded-xl border backdrop-blur-md',
        'bg-[rgba(15,23,42,0.7)] border-[rgba(255,255,255,0.08)]',
        className
      )}
    >
      {children}
    </div>
  )
}
