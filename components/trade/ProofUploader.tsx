'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/shared/GlassCard'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

interface ProofUploaderProps {
  tradeId: string
  onUploaded?: (result: { proofId: string; evidenceHash: string; tradeState: string }) => void
  disabled?: boolean
}

type UploadState = 'idle' | 'dragging' | 'validating' | 'uploading' | 'done' | 'error'

function ProgressRing({ progress, size = 64 }: { progress: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  )
}

export function ProofUploader({ tradeId, onUploaded, disabled = false }: ProofUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [evidenceHash, setEvidenceHash] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: JPEG, PNG, PDF`
    }
    if (file.size > MAX_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB`
    }
    return null
  }

  const upload = useCallback(async (file: File) => {
    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      setUploadState('error')
      return
    }

    setFileName(file.name)
    setUploadState('uploading')
    setProgress(0)
    setError(null)

    // Simulate progress while uploading via XHR for real progress events
    const formData = new FormData()
    formData.append('file', file)

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `/api/trades/${tradeId}/proof`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 90))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 201) {
            const data = JSON.parse(xhr.responseText)
            setProgress(100)
            setEvidenceHash(data.evidenceHash)
            setUploadState('done')
            onUploaded?.({
              proofId: data.proofId,
              evidenceHash: data.evidenceHash,
              tradeState: data.tradeState,
            })
            resolve()
          } else {
            const data = JSON.parse(xhr.responseText)
            reject(new Error(data.error ?? 'Upload failed'))
          }
        }

        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('error')
    }
  }, [tradeId, onUploaded])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setUploadState('idle')
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [upload])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadState === 'idle') setUploadState('dragging')
  }

  const onDragLeave = () => {
    if (uploadState === 'dragging') setUploadState('idle')
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const reset = () => {
    setUploadState('idle')
    setProgress(0)
    setError(null)
    setEvidenceHash(null)
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Upload Payment Proof</h3>

      <AnimatePresence mode="wait">
        {uploadState === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-emerald/10 border border-brand-emerald/30">
              <div className="w-8 h-8 rounded-full bg-brand-emerald/20 border border-brand-emerald/40 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-brand-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-emerald">Proof uploaded</p>
                <p className="text-xs text-slate-400 truncate">{fileName}</p>
              </div>
            </div>

            {evidenceHash && (
              <div className="p-3 rounded-lg bg-surface-800 border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-slate-500 mb-1">Evidence Hash (SHA-256)</p>
                <p className="text-xs font-mono text-slate-300 break-all">{evidenceHash}</p>
              </div>
            )}

            <button
              onClick={reset}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-left"
            >
              Upload another proof
            </button>
          </motion.div>
        ) : uploadState === 'uploading' ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <ProgressRing progress={progress} size={72} />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-200">{progress}%</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{fileName}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div
              onDrop={disabled ? undefined : onDrop}
              onDragOver={disabled ? undefined : onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !disabled && inputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all duration-200 cursor-pointer',
                disabled
                  ? 'border-slate-700 opacity-50 cursor-not-allowed'
                  : uploadState === 'dragging'
                  ? 'border-brand-blue bg-brand-blue/10 scale-[1.01]'
                  : uploadState === 'error'
                  ? 'border-brand-red/50 bg-brand-red/5'
                  : 'border-slate-700 hover:border-slate-500 hover:bg-surface-800/50'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={onFileChange}
                disabled={disabled}
              />

              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                uploadState === 'dragging' ? 'bg-brand-blue/20' : 'bg-surface-700'
              )}>
                <svg className={cn('w-6 h-6', uploadState === 'dragging' ? 'text-brand-blue' : 'text-slate-400')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-slate-300">
                  {uploadState === 'dragging' ? 'Drop to upload' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-slate-500 mt-1">JPEG, PNG, PDF · Max 10 MB</p>
              </div>
            </div>

            {uploadState === 'error' && error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-brand-red"
              >
                {error}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
