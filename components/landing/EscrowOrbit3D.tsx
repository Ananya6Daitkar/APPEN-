'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type AnimationStep = 'upload' | 'scanning' | 'verified' | 'transfer'

export function EscrowOrbit3D() {
  const [step, setStep] = useState<AnimationStep>('upload')

  useEffect(() => {
    const sequence = async () => {
      // Upload phase
      await new Promise(resolve => setTimeout(resolve, 2000))
      setStep('scanning')
      
      // Scanning phase
      await new Promise(resolve => setTimeout(resolve, 2500))
      setStep('verified')
      
      // Verified phase
      await new Promise(resolve => setTimeout(resolve, 2000))
      setStep('transfer')
      
      // Transfer phase
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      // Loop back
      setStep('upload')
    }

    sequence()
    const interval = setInterval(sequence, 9000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-emerald-500/10 rounded-3xl blur-3xl" />
      
      {/* Main card container */}
      <motion.div
        className="relative w-80 h-96 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated gradient border */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-emerald-500/20 to-blue-500/20 opacity-50 animate-pulse" />
        
        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-8 space-y-6">
          
          {/* Step 1: Upload Receipt */}
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center space-y-4"
              >
                <motion.div
                  className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center"
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(59, 130, 246, 0.3)',
                      '0 0 40px rgba(59, 130, 246, 0.5)',
                      '0 0 20px rgba(59, 130, 246, 0.3)',
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-100 mb-1">Upload Receipt</h3>
                  <p className="text-sm text-slate-400">Drag & drop payment proof</p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Scanning */}
            {step === 'scanning' && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="relative w-24 h-24">
                  {/* Document icon */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 flex items-center justify-center"
                  >
                    <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </motion.div>
                  
                  {/* Scanning beam */}
                  <motion.div
                    className="absolute inset-0 overflow-hidden rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                      animate={{ y: [0, 96, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      style={{ boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' }}
                    />
                  </motion.div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-100 mb-1">AI Scanning</h3>
                  <p className="text-sm text-slate-400">Analyzing payment details...</p>
                </div>
                
                {/* Scanning progress dots */}
                <div className="flex space-x-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-blue-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Verified */}
            {step === 'verified' && (
              <motion.div
                key="verified"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center space-y-4"
              >
                <motion.div
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-2 border-emerald-500/50 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {/* Success checkmark */}
                  <motion.svg
                    className="w-12 h-12 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <motion.path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                  
                  {/* Glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-400/30"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-emerald-400 mb-1">AI Verified ✓</h3>
                  <p className="text-sm text-slate-400">Payment confirmed</p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Transfer */}
            {step === 'transfer' && (
              <motion.div
                key="transfer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center space-y-6"
              >
                {/* Lock opening animation */}
                <div className="relative w-24 h-24">
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ y: 0 }}
                    animate={{ y: -10 }}
                    transition={{ duration: 0.5 }}
                  >
                    <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </motion.div>
                </div>

                {/* Funds transfer animation */}
                <div className="relative w-full h-20 flex items-center justify-center">
                  <div className="absolute left-8 w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-400">$</span>
                  </div>
                  
                  {/* Animated coins */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500"
                      initial={{ x: -60, opacity: 0 }}
                      animate={{ 
                        x: 60, 
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        delay: i * 0.3,
                        repeat: Infinity,
                        repeatDelay: 0.5
                      }}
                      style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)' }}
                    />
                  ))}
                  
                  <div className="absolute right-8 w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-400">✓</span>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-100 mb-1">Funds Released</h3>
                  <p className="text-sm text-slate-400">Transfer complete</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
            {(['upload', 'scanning', 'verified', 'transfer'] as AnimationStep[]).map((s, i) => (
              <motion.div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  step === s ? 'bg-blue-400' : 'bg-slate-600'
                }`}
                animate={{
                  scale: step === s ? 1.2 : 1,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
