import express from 'express'
import { sql } from '../db/neon.js'
import {
  saveFounderScore,
  scoreFounderFromTranscript
} from '../services/founderScoring.js'
import { ingestDocs } from '../services/ingestDocs.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const {
      company,
      date,
      poc,
      sector,
      status,
      exciting_reason,
      risks,
      conviction_score,
      pass_reasons,
      watch_reasons,
      action_required
    } = req.body ?? {}

    if (!company) {
      return res.status(400).json({ error: 'company is required' })
    }

    const rows = await sql`
      INSERT INTO deals (
        company,
        date,
        poc,
        sector,
        status,
        exciting_reason,
        risks,
        conviction_score,
        pass_reasons,
        watch_reasons,
        action_required
      )
      VALUES (
        ${company},
        ${date ?? null},
        ${poc ?? null},
        ${sector ?? null},
        ${status ?? null},
        ${exciting_reason ?? null},
        ${risks ?? null},
        ${conviction_score ?? null},
        ${pass_reasons ?? null},
        ${watch_reasons ?? null},
        ${action_required ?? null}
      )
      RETURNING *
    `

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('Error creating deal', err)
    res.status(500).json({ error: 'Failed to create deal' })
  }
})

// List deals (optionally filter later)
router.get('/', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT *
      FROM deals
      ORDER BY created_at DESC
    `
    res.json(rows)
  } catch (err) {
    console.error('Error fetching deals', err)
    res.status(500).json({ error: 'Failed to fetch deals' })
  }
})

// Fetch a single deal with latest founder score, signals and insights
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const dealRows = await sql`
      SELECT *
      FROM deals
      WHERE id = ${id}
      LIMIT 1
    `
    const deal = dealRows[0]
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' })
    }

    const scoreRows = await sql`
      SELECT *
      FROM founder_scores
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const score = scoreRows[0] ?? null

    const signalsRows = await sql`
      SELECT *
      FROM founder_signals
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const signals = signalsRows[0] ?? null

    const insightsRows = await sql`
      SELECT *
      FROM deal_insights
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const insights = insightsRows[0] ?? null

    res.json({ deal, score, signals, insights })
  } catch (err) {
    console.error('Error fetching deal', err)
    res.status(500).json({ error: 'Failed to fetch deal' })
  }
})

// Update deal (partial)
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const allowedFields = [
    'company',
    'date',
    'poc',
    'sector',
    'status',
    'exciting_reason',
    'risks',
    'conviction_score',
    'pass_reasons',
    'watch_reasons',
    'action_required',
    'founder_score'
  ]

  const patch = req.body ?? {}
  const entries = Object.entries(patch).filter(([key]) =>
    allowedFields.includes(key)
  )

  if (entries.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  // Build dynamic SET clause using the sql tagged template
  const setFragments = []
  const values = []
  entries.forEach(([key, value], index) => {
    setFragments.push(`${key} = $${index + 1}`)
    values.push(value)
  })

  // updated_at = now() as final assignment
  const text = `
    UPDATE deals
    SET ${setFragments.join(', ')}, updated_at = now()
    WHERE id = $${values.length + 1}
    RETURNING *
  `

  try {
    const rows = await sql([text], ...values, id)
    const deal = rows[0]
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' })
    }
    res.json(deal)
  } catch (err) {
    console.error('Error updating deal', err)
    res.status(500).json({ error: 'Failed to update deal' })
  }
})

// Latest founder score only (for modal)
router.get('/:id/score', async (req, res) => {
  const { id } = req.params
  try {
    const scoreRows = await sql`
      SELECT *
      FROM founder_scores
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const score = scoreRows[0] ?? null

    const signalsRows = await sql`
      SELECT *
      FROM founder_signals
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const signals = signalsRows[0] ?? null

    if (!score && !signals) {
      return res
        .status(404)
        .json({ error: 'No founder score for this deal yet' })
    }

    res.json({ score, signals })
  } catch (err) {
    console.error('Error fetching deal score', err)
    res.status(500).json({ error: 'Failed to fetch deal score' })
  }
})

// Run founder scoring from a provided transcript and persist results
router.post('/:id/score', async (req, res) => {
  const { id } = req.params
  const { transcript } = req.body ?? {}

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'transcript is required' })
  }

  try {
    const scoring = await scoreFounderFromTranscript({ transcript })

    const result = await saveFounderScore({
      dealId: id,
      scores: scoring.scores,
      weightedScore: scoring.weightedScore,
      archetype: scoring.archetype,
      evidence: scoring.evidence,
      founderSignals: scoring.founderSignals,
      rawPayload: scoring.raw
    })

    res.status(201).json(result)
  } catch (err) {
    console.error('Error scoring founder', err)
    res.status(500).json({ error: 'Failed to score founder for this deal' })
  }
})

// Latest deal insights only
router.get('/:id/insights', async (req, res) => {
  const { id } = req.params
  try {
    const insightsRows = await sql`
      SELECT *
      FROM deal_insights
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const insights = insightsRows[0] ?? null
    if (!insights) {
      return res
        .status(404)
        .json({ error: 'No insights for this deal yet' })
    }
    res.json({ insights })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching deal insights', err)
    res.status(500).json({ error: 'Failed to fetch deal insights' })
  }
})

// Batch-ingest meeting transcripts from backend/docs into meetings, deals and scores
router.post('/ingest-docs', async (req, res) => {
  const { limit, dryRun } = req.body ?? {}
  try {
    const result = await ingestDocs({
      limit: typeof limit === 'number' ? limit : undefined,
      dryRun: Boolean(dryRun)
    })
    res.json(result)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error ingesting docs', err)
    res.status(500).json({ error: 'Failed to ingest docs' })
  }
})

export default router

