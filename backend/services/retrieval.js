import { sql, formatVector } from '../db/neon.js';
export async function retrieveByVector(queryEmbedding, limit = 5) {
  const vectorStr = formatVector(queryEmbedding)
  const rows = await sql`
    SELECT id, transcript, source_file_name
    FROM meetings
    ORDER BY embedding <-> ${vectorStr}::vector
    LIMIT ${limit}
  `
  return rows
}
