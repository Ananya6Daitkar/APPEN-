import { SiweMessage } from 'siwe'

export async function verifySiweMessage(message: string, signature: string): Promise<string> {
  // In DEMO_MODE — extract address from message without verifying signature
  if (process.env.DEMO_MODE === 'true') {
    // Handle both full SIWE format and simple demo format
    try {
      const siweMsg = new SiweMessage(message)
      return siweMsg.address
    } catch {
      // Simple format: second line is the address
      const lines = message.split('\n').map((l) => l.trim()).filter(Boolean)
      const addrLine = lines.find((l) => l.startsWith('0x'))
      if (addrLine) return addrLine
      throw new Error('Could not extract address from demo message')
    }
  }

  const siweMsg = new SiweMessage(message)
  const result = await siweMsg.verify({ signature })
  if (!result.success) {
    throw new Error(result.error?.type ?? 'SIWE verification failed')
  }
  return siweMsg.address
}
