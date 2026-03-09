import 'dotenv/config'
import { initSchema } from '../db/neon.js'
import { ingestDocs } from '../services/ingestDocs.js'

async function main() {
  await initSchema()
  const result = await ingestDocs({ dryRun: false })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

