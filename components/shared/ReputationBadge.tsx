import { cn } from '@/lib/utils'

interface ReputationBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function getTier(score: number): { label: string; color: string } {
  if (score < 200) return { label: 'Low Trust', color: 'bg-brand-red/20 text-brand-red border-brand-red/30' }
  if (score < 500) return { label: 'Building', color: 'bg-brand-amber/20 text-brand-amber border-brand-amber/30' }
  if (score < 750) return { label: 'Trusted', color: 'bg-brand-blue/20 text-brand-blue border-brand-blue/30' }
  return { label: 'Highly Trusted', color: 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/30' }
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
}

export function ReputationBadge({ score, size = 'md' }: ReputationBadgeProps) {
  const { label, color } = getTier(score)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        color,
        sizeClasses[size]
      )}
    >
      <span className="font-bold">{score}</span>
      <span className="opacity-80">{label}</span>
    </span>
  )
}
