import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/landing/HeroSection'
import { ProblemSection } from '@/components/landing/ProblemSection'

// Lazy load below-the-fold components for faster initial load
const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks').then(mod => ({ default: mod.HowItWorks })), {
  loading: () => <div className="h-screen" />,
})
const WhyAPPEN = dynamic(() => import('@/components/landing/WhyAPPEN').then(mod => ({ default: mod.WhyAPPEN })), {
  loading: () => <div className="h-screen" />,
})
const CorridorMap = dynamic(() => import('@/components/landing/CorridorMap').then(mod => ({ default: mod.CorridorMap })), {
  loading: () => <div className="h-screen" />,
})
const CTASection = dynamic(() => import('@/components/landing/CTASection').then(mod => ({ default: mod.CTASection })), {
  loading: () => <div className="h-64" />,
})

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-900">
      <HeroSection />
      <ProblemSection />
      <HowItWorks />
      <WhyAPPEN />
      <CorridorMap />
      <CTASection />
    </div>
  )
}
