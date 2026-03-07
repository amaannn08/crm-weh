import pg from 'pg'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const pool = new pg.Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})
export function sql(strings, ...values) {
  let text = strings[0] ?? ''
  for (let i = 0; i < values.length; i += 1) {
    text += `$${i + 1}${strings[i + 1] ?? ''}`
  }
  return pool.query(text, values).then((res) => res.rows)
}

export const poolRef = pool

export function formatVector(embedding) {
  return '[' + embedding.join(',') + ']'
}

export async function initSchema() {
  const client = await pool.connect()
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector')
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        drive_file_id TEXT UNIQUE,
        source_file_name TEXT,
        transcript TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        ingested_at TIMESTAMPTZ DEFAULT now()
      )
    `)
    await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS drive_file_id TEXT')
    await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source_file_name TEXT')
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT DEFAULT 'New session',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `)
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
  } finally {
    client.release()
  }
}
