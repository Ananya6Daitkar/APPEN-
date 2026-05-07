import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const hash = searchParams.get('hash')
  const chainId = parseInt(searchParams.get('chainId') ?? '84532', 10)

  if (!hash) return NextResponse.json({ error: 'hash required' }, { status: 400 })

  // In DEMO_MODE or mock hashes — return confirmed
  if (process.env.DEMO_MODE === 'true' || hash.startsWith('0x000000')) {
    return NextResponse.json({ status: 'confirmed', confirmations: 3 })
  }

  // Try to check via public RPC
  const rpcUrl = chainId === 84532
    ? (process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org')
    : (process.env.POLYGON_MUMBAI_RPC_URL ?? 'https://rpc-mumbai.maticvigil.com')

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [hash],
        id: 1,
      }),
    })
    const data = await res.json() as { result?: { status: string; blockNumber: string } | null }
    const receipt = data.result

    if (!receipt) return NextResponse.json({ status: 'pending', confirmations: 0 })

    const status = receipt.status === '0x1' ? 'confirmed' : 'failed'
    return NextResponse.json({ status, confirmations: 1 })
  } catch {
    return NextResponse.json({ status: 'pending', confirmations: 0 })
  }
}
