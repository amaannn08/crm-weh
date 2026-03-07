import 'dotenv/config'
import { initSchema } from '../db/neon.js'
import { ingestDocs } from '../services/ingestDocs.js'

async function main() {
  await initSchema()
  const result = await ingestDocs({ dryRun: false })
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

