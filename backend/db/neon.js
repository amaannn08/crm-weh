import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}
export const sql = neon(connectionString)
export function formatVector(embedding) {
  return '[' + embedding.join(',') + ']'
}
export async function initSchema() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`
    await sql`
      CREATE TABLE IF NOT EXISTS meetings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        drive_file_id TEXT UNIQUE,
        source_file_name TEXT,
        transcript TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        ingested_at TIMESTAMPTZ DEFAULT now()
      )
    `
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS drive_file_id TEXT`
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source_file_name TEXT`
  } catch (err) {
    const isTimeout =
      err.message?.includes('fetch failed') ||
      err.cause?.code === 'ETIMEDOUT' ||
      err.cause?.code === 'ECONNREFUSED'
    if (isTimeout) {
      throw new Error(
        'Could not connect to Neon, Check DATABASE_URL'
      )
    }
    throw err
  }
}
