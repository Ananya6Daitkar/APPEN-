import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeHash, downloadProof, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/storage'

type Params = { params: Promise<{ tradeId: string }> }

// ─── GET /api/proofs/:tradeId/verify ─────────────────────────────────────────
// Accepts a file upload, recomputes SHA-256, compares to stored evidenceHash.
// Returns { verified: boolean, storedHash, computedHash }
// Req 13.4, 13.5
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { tradeId } = await params
    // Find the most recent proof for this trade
    const proof = await prisma.proof.findFirst({
      where: { tradeId },
      orderBy: { createdAt: 'desc' },
    })

    if (!proof) {
      return NextResponse.json({ error: 'No proof found for this trade' }, { status: 404 })
    }

    // Accept file upload for re-verification
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    let computedHash: string

    if (file) {
      // Verify against uploaded file bytes
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      computedHash = computeHash(buffer)
    } else if (process.env.DEMO_MODE !== 'true') {
      // Re-download from storage and recompute
      const buffer = await downloadProof(proof.storageKey)
      computedHash = computeHash(buffer)
    } else {
      // DEMO_MODE with no file — return stored hash as match
      computedHash = proof.evidenceHash
    }

    const verified = computedHash === proof.evidenceHash

    return NextResponse.json({
      verified,
      proofId: proof.id,
      tradeId,
      storedHash: proof.evidenceHash,
      computedHash,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
