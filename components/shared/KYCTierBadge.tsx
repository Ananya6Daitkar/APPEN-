import { cn } from '@/lib/utils'

interface KYCTierBadgeProps {
  tier: 0 | 1 | 2 | 3
  size?: 'sm' | 'md'
}

const tierConfig = {
  0: { label: 'Unverified', color: 'bg-slate-700/50 text-slate-400 border-slate-600/30' },
  1: { label: 'Email Verified', color: 'bg-brand-blue/20 text-brand-blue border-brand-blue/30' },
  2: { label: 'ID Submitted', color: 'bg-brand-amber/20 text-brand-amber border-brand-amber/30' },
  3: { label: 'KYC Verified', color: 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/30' },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
}

export function KYCTierBadge({ tier, size = 'md' }: KYCTierBadgeProps) {
  const { label, color } = tierConfig[tier]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        color,
        sizeClasses[size]
      )}
    >
      Tier {tier} · {label}
    </span>
  )
}
