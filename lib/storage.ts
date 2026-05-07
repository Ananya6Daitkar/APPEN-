import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE }

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT
  const region = process.env.S3_REGION ?? 'us-east-1'

  return new S3Client({
    region,
    ...(endpoint && { endpoint, forcePathStyle: true }),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'demo',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'demo',
    },
  })
}

/**
 * Compute SHA-256 hash of raw file bytes (before any transform).
 */
export function computeHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Upload a file buffer to S3/MinIO.
 * Storage key format: proofs/{tradeId}/{timestamp}-{filename}
 */
export async function uploadProof(
  tradeId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const bucket = process.env.S3_BUCKET ?? 'appen-proofs'
  const key = `proofs/${tradeId}/${Date.now()}-${filename}`

  const client = getS3Client()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // AES-256 server-side encryption
      ServerSideEncryption: 'AES256',
    })
  )

  return key
}

/**
 * Download a file from S3/MinIO and return its buffer.
 */
export async function downloadProof(storageKey: string): Promise<Buffer> {
  const bucket = process.env.S3_BUCKET ?? 'appen-proofs'
  const client = getS3Client()

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: storageKey })
  )

  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
