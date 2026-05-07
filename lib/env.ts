import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis (optional in DEMO_MODE)
  REDIS_URL: z.string().url().optional(),

  // S3 / MinIO (optional in DEMO_MODE)
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().min(1).optional(),
  S3_SECRET_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().default('us-east-1'),

  // JWT
  JWT_SECRET: z.string().min(32).optional().default('dev-secret-min-32-chars-long!!!'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Demo mode
  DEMO_MODE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // Next.js public
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_CHAIN_ID: z.string().default('84532'),

  // Blockchain
  PRIVATE_KEY: z.string().optional(),
  BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
  POLYGON_MUMBAI_RPC_URL: z.string().url().optional(),

  // Node env
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

function parseEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    throw new Error('Invalid environment configuration')
  }
  return result.data
}

// Lazy singleton — only validated when first accessed
let _env: z.infer<typeof envSchema> | undefined

export function getEnv() {
  if (!_env) {
    _env = parseEnv()
  }
  return _env
}

export type Env = z.infer<typeof envSchema>
