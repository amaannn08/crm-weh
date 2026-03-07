import express from 'express'
import { sql } from '../db/neon.js'
import {
  clampScore,
  computeWeightedScore,
  saveFounderScore,
  scoreFounderFromTranscript
} from '../services/founderScoring.js'
import { ingestDocs } from '../services/ingestDocs.js'

const DEAL_PATCH_FIELDS = [
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

const SCORE_PATCH_FIELDS = [
  'resilience',
  'ambition',
  'self_awareness',
  'domain_fit',
  'storytelling',
  'weighted_score',
  'archetype'
]

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

router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const patch = req.body ?? {}
  const dealEntries = Object.entries(patch).filter(([key]) =>
    DEAL_PATCH_FIELDS.includes(key)
  )
  const scoreEntries = Object.entries(patch).filter(([key]) =>
    SCORE_PATCH_FIELDS.includes(key)
  )

  if (dealEntries.length === 0 && scoreEntries.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  try {
    if (dealEntries.length > 0) {
      const setFragments = []
      const values = []
      dealEntries.forEach(([key, value], index) => {
        setFragments.push(`${key} = $${index + 1}`)
        values.push(value)
      })
      const text = `
        UPDATE deals
        SET ${setFragments.join(', ')}, updated_at = now()
        WHERE id = $${values.length + 1}
        RETURNING *
      `
      const rows = await sql([text], ...values, id)
      if (!rows[0]) {
        return res.status(404).json({ error: 'Deal not found' })
      }
    }

    if (scoreEntries.length > 0) {
      const scoreRows = await sql`
        SELECT *
        FROM founder_scores
        WHERE deal_id = ${id}
        ORDER BY created_at DESC
        LIMIT 1
      `
      const existing = scoreRows[0] ?? null
      const scorePatch = Object.fromEntries(scoreEntries)
      const resilience =
        scorePatch.resilience !== undefined
          ? clampScore(scorePatch.resilience)
          : existing?.resilience ?? 0
      const ambition =
        scorePatch.ambition !== undefined
          ? clampScore(scorePatch.ambition)
          : existing?.ambition ?? 0
      const self_awareness =
        scorePatch.self_awareness !== undefined
          ? clampScore(scorePatch.self_awareness)
          : existing?.self_awareness ?? 0
      const domain_fit =
        scorePatch.domain_fit !== undefined
          ? clampScore(scorePatch.domain_fit)
          : existing?.domain_fit ?? 0
      const storytelling =
        scorePatch.storytelling !== undefined
          ? clampScore(scorePatch.storytelling)
          : existing?.storytelling ?? 0
      const weightedScore =
        scorePatch.weighted_score !== undefined &&
        scorePatch.weighted_score !== null &&
        scorePatch.weighted_score !== ''
          ? clampScore(scorePatch.weighted_score)
          : computeWeightedScore({
              resilience,
              ambition,
              self_awareness,
              domain_fit,
              storytelling
            })
      const archetype =
        scorePatch.archetype !== undefined && scorePatch.archetype !== null
          ? String(scorePatch.archetype).trim() || null
          : existing?.archetype ?? null

      if (existing) {
        await sql`
          UPDATE founder_scores
          SET
            resilience = ${resilience},
            ambition = ${ambition},
            self_awareness = ${self_awareness},
            domain_fit = ${domain_fit},
            storytelling = ${storytelling},
            weighted_score = ${weightedScore},
            archetype = ${archetype}
          WHERE id = ${existing.id}
        `
      } else {
        await sql`
          INSERT INTO founder_scores (
            deal_id,
            resilience,
            ambition,
            self_awareness,
            domain_fit,
            storytelling,
            weighted_score,
            archetype,
            evidence_json
          )
          VALUES (
            ${id},
            ${resilience},
            ${ambition},
            ${self_awareness},
            ${domain_fit},
            ${storytelling},
            ${weightedScore},
            ${archetype},
            ${JSON.stringify({})}
          )
        `
      }

      await sql`
        UPDATE deals
        SET founder_score = ${weightedScore}, updated_at = now()
        WHERE id = ${id}
      `
    }

    const dealRows = await sql`
      SELECT * FROM deals WHERE id = ${id} LIMIT 1
    `
    const deal = dealRows[0]
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' })
    }

    const scoreRows = await sql`
      SELECT * FROM founder_scores
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const score = scoreRows[0] ?? null
    const signalsRows = await sql`
      SELECT * FROM founder_signals
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const signals = signalsRows[0] ?? null

    res.json({ deal, score, signals })
  } catch (err) {
    console.error('Error updating deal', err)
    res.status(500).json({ error: 'Failed to update deal' })
  }
})

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
    console.error('Error fetching deal insights', err)
    res.status(500).json({ error: 'Failed to fetch deal insights' })
  }
})

router.post('/ingest-docs', async (req, res) => {
  const { limit, dryRun } = req.body ?? {}
  try {
    const result = await ingestDocs({
      limit: typeof limit === 'number' ? limit : undefined,
      dryRun: Boolean(dryRun)
    })
    res.json(result)
  } catch (err) {
    console.error('Error ingesting docs', err)
    res.status(500).json({ error: 'Failed to ingest docs' })
  }
})

export default router

