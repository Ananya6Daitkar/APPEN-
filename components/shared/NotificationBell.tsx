'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Notification {
  id: string
  message: string
  read: boolean
  createdAt: Date | string
}

interface NotificationBellProps {
  notifications: Notification[]
  onMarkRead: (id: string) => void
}

export function NotificationBell({ notifications, onMarkRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 z-50 rounded-xl border border-[rgba(255,255,255,0.08)] bg-surface-800 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs text-brand-blue">{unreadCount} unread</span>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto divide-y divide-[rgba(255,255,255,0.05)]">
              {notifications.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications</li>
              ) : (
                notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-4 py-3 text-sm cursor-pointer hover:bg-surface-700 transition-colors',
                      !n.read && 'bg-brand-blue/5'
                    )}
                    onClick={() => onMarkRead(n.id)}
                  >
                    <p className={cn('text-slate-200', n.read && 'text-slate-400')}>{n.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
