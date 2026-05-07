'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/shared/GlassCard'

export interface ProofViewerProps {
  fileUrl: string        // presigned URL or API route URL
  mimeType: string       // 'image/jpeg' | 'image/png' | 'application/pdf'
  fileName?: string      // for download attribute
  evidenceHash?: string  // display SHA-256 hash below viewer
}

export function ProofViewer({ fileUrl, mimeType, fileName, evidenceHash }: ProofViewerProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const isImage = mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/svg+xml' || mimeType === 'image/webp'
  const isPDF = mimeType === 'application/pdf'
  const hasFile = Boolean(fileUrl)

  function handleDownload() {
    if (!fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName ?? 'proof-file'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <GlassCard className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Payment Proof</h3>
        {hasFile && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs text-brand-blue hover:text-brand-blue/80 transition-colors px-2.5 py-1 rounded-lg border border-brand-blue/30 hover:border-brand-blue/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        )}
      </div>

      {/* File viewer */}
      {!hasFile ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-3 py-10 rounded-lg border border-dashed border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)]"
        >
          <div className="w-10 h-10 rounded-full bg-brand-violet/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 10c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">File stored securely</p>
            <p className="text-xs text-slate-500 mt-0.5">Encrypted at rest · AES-256</p>
          </div>
        </motion.div>
      ) : isImage ? (
        <div className="relative">
          {/* Loading skeleton */}
          {!imgLoaded && (
            <div className="w-full h-48 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
          )}
          <motion.img
            src={fileUrl}
            alt={fileName ?? 'Payment proof'}
            onLoad={() => setImgLoaded(true)}
            onClick={() => setLightboxOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: imgLoaded ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="w-full rounded-lg object-contain cursor-zoom-in border border-[rgba(255,255,255,0.06)]"
            style={{ maxHeight: '320px' }}
          />
          {imgLoaded && (
            <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-[rgba(15,23,42,0.8)] px-2 py-0.5 rounded">
              Click to zoom
            </div>
          )}
        </div>
      ) : isPDF ? (
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)]">
          <iframe
            src={fileUrl}
            title={fileName ?? 'Payment proof PDF'}
            className="w-full"
            style={{ height: '400px' }}
          >
            <div className="p-4 text-center">
              <p className="text-sm text-slate-400 mb-2">Your browser cannot display this PDF.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-blue hover:underline"
              >
                Open PDF in new tab →
              </a>
            </div>
          </iframe>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-blue hover:underline"
          >
            View file →
          </a>
        </div>
      )}

      {/* Evidence hash */}
      {evidenceHash && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-1 pt-3 border-t border-[rgba(255,255,255,0.06)]"
        >
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Evidence Hash (SHA-256)</p>
          <p className="text-xs font-mono text-slate-400 break-all leading-relaxed">{evidenceHash}</p>
        </motion.div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && isImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          >
            <motion.img
              src={fileUrl}
              alt={fileName ?? 'Payment proof'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[rgba(15,23,42,0.9)] border border-[rgba(255,255,255,0.12)] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
