import { startChallengeWindowExpiryJob } from './challengeWindowExpiry'
import { startFundedTimeoutJob } from './fundedTimeout'

let started = false

/**
 * Start all background jobs. Idempotent — safe to call multiple times.
 */
export function startBackgroundJobs(): void {
  if (started) return
  started = true

  startChallengeWindowExpiryJob()
  startFundedTimeoutJob()
}
