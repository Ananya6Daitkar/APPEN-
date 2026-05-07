'use client'

import Link from 'next/link'
import { WalletConnectButton } from './WalletConnectButton'
import { NotificationBell, type Notification } from './NotificationBell'
import { useState } from 'react'

const navLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/create-offer', label: 'Create Offer' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/analytics', label: 'Analytics' },
]

export function Navbar() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(255,255,255,0.08)] backdrop-blur-md bg-[rgba(15,23,42,0.8)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-brand-blue via-brand-violet to-brand-emerald bg-clip-text text-transparent">
          APPEN
        </Link>

        {/* Nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <WalletConnectButton />
          <NotificationBell notifications={notifications} onMarkRead={handleMarkRead} />
        </div>
      </div>
    </nav>
  )
}
