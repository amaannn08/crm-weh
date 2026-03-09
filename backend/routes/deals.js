import express from 'express'
import { sql, poolRef } from '../db/neon.js'
import {
  clampScore,
  computeWeightedScore,
  computeFinalScore,
  scoreAndSaveFounder,
  getDDRecommendation,
  SOFT_WEIGHTS,
  HARD_WEIGHTS
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
  'founder_soft_score',
  'founder_hard_score',
  'founder_final_score',
  'dd_recommendation'
]

const SOFT_PATCH_FIELDS = [
  'resilience',
  'ambition',
  'self_awareness',
  'domain_fit',
  'storytelling',
  'archetype'
]

const HARD_PATCH_FIELDS = [
  'education_tier',
  'domain_work_experience',
  'seniority_of_roles',
  'previous_startup_experience'
]

const router = express.Router()

async function fetchDealBundle(id) {
  const dealRows = await sql`
    SELECT *
    FROM deals
    WHERE id = ${id}
    LIMIT 1
  `
  const deal = dealRows[0] ?? null
  if (!deal) return null

  const softRows = await sql`
    SELECT *
    FROM founder_soft_scores
    WHERE deal_id = ${id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  const hardRows = await sql`
    SELECT *
    FROM founder_hard_scores
    WHERE deal_id = ${id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  const finalRows = await sql`
    SELECT *
    FROM founder_final_scores
    WHERE deal_id = ${id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  const insightsRows = await sql`
    SELECT *
    FROM deal_insights
    WHERE deal_id = ${id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  return {
    deal,
    softScore: softRows[0] ?? null,
    hardScore: hardRows[0] ?? null,
    finalScore: finalRows[0] ?? null,
    insights: insightsRows[0] ?? null
  }
}

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
    const bundle = await fetchDealBundle(id)
    if (!bundle) {
      return res.status(404).json({ error: 'Deal not found' })
    }
    res.json(bundle)
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
  const softEntries = Object.entries(patch).filter(([key]) =>
    SOFT_PATCH_FIELDS.includes(key)
  )
  const hardEntries = Object.entries(patch).filter(([key]) =>
    HARD_PATCH_FIELDS.includes(key)
  )

  if (dealEntries.length === 0 && softEntries.length === 0 && hardEntries.length === 0) {
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
      const result = await poolRef.query(text, [...values, id])
      const rows = result.rows
      if (!rows[0]) {
        return res.status(404).json({ error: 'Deal not found' })
      }
    }

    const shouldUpdateScore = softEntries.length > 0 || hardEntries.length > 0
    if (shouldUpdateScore) {
      const softRows = await sql`
        SELECT *
        FROM founder_soft_scores
        WHERE deal_id = ${id}
        ORDER BY created_at DESC
        LIMIT 1
      `

      const hardRows = await sql`
        SELECT *
        FROM founder_hard_scores
        WHERE deal_id = ${id}
        ORDER BY created_at DESC
        LIMIT 1
      `

      const finalRows = await sql`
        SELECT *
        FROM founder_final_scores
        WHERE deal_id = ${id}
        ORDER BY created_at DESC
        LIMIT 1
      `

      const existingSoft = softRows[0] ?? null
      const existingHard = hardRows[0] ?? null
      const existingFinal = finalRows[0] ?? null
      const softPatch = Object.fromEntries(softEntries)
      const hardPatch = Object.fromEntries(hardEntries)

      const resilience =
        softPatch.resilience !== undefined
          ? clampScore(softPatch.resilience)
          : Number(existingSoft?.resilience ?? 0)
      const ambition =
        softPatch.ambition !== undefined
          ? clampScore(softPatch.ambition)
          : Number(existingSoft?.ambition ?? 0)
      const self_awareness =
        softPatch.self_awareness !== undefined
          ? clampScore(softPatch.self_awareness)
          : Number(existingSoft?.self_awareness ?? 0)
      const domain_fit =
        softPatch.domain_fit !== undefined
          ? clampScore(softPatch.domain_fit)
          : Number(existingSoft?.domain_fit ?? 0)
      const storytelling =
        softPatch.storytelling !== undefined
          ? clampScore(softPatch.storytelling)
          : Number(existingSoft?.storytelling ?? 0)
      const archetype =
        softPatch.archetype !== undefined
          ? String(softPatch.archetype ?? '').trim() || null
          : existingSoft?.archetype ?? null

      const education_tier =
        hardPatch.education_tier !== undefined
          ? clampScore(hardPatch.education_tier)
          : Number(existingHard?.education_tier ?? 0)
      const domain_work_experience =
        hardPatch.domain_work_experience !== undefined
          ? clampScore(hardPatch.domain_work_experience)
          : Number(existingHard?.domain_work_experience ?? 0)
      const seniority_of_roles =
        hardPatch.seniority_of_roles !== undefined
          ? clampScore(hardPatch.seniority_of_roles)
          : Number(existingHard?.seniority_of_roles ?? 0)
      const previous_startup_experience =
        hardPatch.previous_startup_experience !== undefined
          ? clampScore(hardPatch.previous_startup_experience)
          : Number(existingHard?.previous_startup_experience ?? 0)

      const softWeightedScore = computeWeightedScore(
        {
          resilience,
          ambition,
          self_awareness,
          domain_fit,
          storytelling
        },
        SOFT_WEIGHTS
      )

      const hardWeightedScore = computeWeightedScore(
        {
          education_tier,
          domain_work_experience,
          seniority_of_roles,
          previous_startup_experience
        },
        HARD_WEIGHTS
      )

      const finalScore = computeFinalScore(hardWeightedScore, softWeightedScore)
      const ddResult = getDDRecommendation(finalScore)

      if (existingSoft) {
        await sql`
          UPDATE founder_soft_scores
          SET
            resilience = ${resilience},
            ambition = ${ambition},
            self_awareness = ${self_awareness},
            domain_fit = ${domain_fit},
            storytelling = ${storytelling},
            soft_weighted_score = ${softWeightedScore},
            archetype = ${archetype}
          WHERE id = ${existingSoft.id}
        `
      } else {
        await sql`
          INSERT INTO founder_soft_scores (
            deal_id,
            resilience,
            ambition,
            self_awareness,
            domain_fit,
            storytelling,
            soft_weighted_score,
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
            ${softWeightedScore},
            ${archetype},
            ${JSON.stringify({})}
          )
        `
      }

      if (existingHard) {
        await sql`
          UPDATE founder_hard_scores
          SET
            education_tier = ${education_tier},
            domain_work_experience = ${domain_work_experience},
            seniority_of_roles = ${seniority_of_roles},
            previous_startup_experience = ${previous_startup_experience},
            hard_weighted_score = ${hardWeightedScore}
          WHERE id = ${existingHard.id}
        `
      } else {
        await sql`
          INSERT INTO founder_hard_scores (
            deal_id,
            education_tier,
            domain_work_experience,
            seniority_of_roles,
            previous_startup_experience,
            hard_weighted_score
          )
          VALUES (
            ${id},
            ${education_tier},
            ${domain_work_experience},
            ${seniority_of_roles},
            ${previous_startup_experience},
            ${hardWeightedScore}
          )
        `
      }

      if (existingFinal) {
        await sql`
          UPDATE founder_final_scores
          SET
            hard_weighted_score = ${hardWeightedScore},
            soft_weighted_score = ${softWeightedScore},
            final_score = ${finalScore},
            dd_recommendation = ${ddResult.recommendation},
            scored_at = now()
          WHERE id = ${existingFinal.id}
        `
      } else {
        await sql`
          INSERT INTO founder_final_scores (
            deal_id,
            hard_weighted_score,
            soft_weighted_score,
            final_score,
            dd_recommendation,
            scored_at
          )
          VALUES (
            ${id},
            ${hardWeightedScore},
            ${softWeightedScore},
            ${finalScore},
            ${ddResult.recommendation},
            now()
          )
        `
      }

      await sql`
        UPDATE deals
        SET
          founder_soft_score = ${softWeightedScore},
          founder_hard_score = ${hardWeightedScore},
          founder_final_score = ${finalScore},
          dd_recommendation = ${ddResult.recommendation},
          conviction_score = COALESCE(conviction_score, ${finalScore}),
          updated_at = now()
        WHERE id = ${id}
      `
    }

    const bundle = await fetchDealBundle(id)
    if (!bundle) {
      return res.status(404).json({ error: 'Deal not found' })
    }
    res.json(bundle)
  } catch (err) {
    console.error('Error updating deal', err)
    res.status(500).json({ error: 'Failed to update deal' })
  }
})

router.get('/:id/score', async (req, res) => {
  const { id } = req.params
  try {
    const softRows = await sql`
      SELECT *
      FROM founder_soft_scores
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const softScore = softRows[0] ?? null

    const hardRows = await sql`
      SELECT *
      FROM founder_hard_scores
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const hardScore = hardRows[0] ?? null

    const finalRows = await sql`
      SELECT *
      FROM founder_final_scores
      WHERE deal_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const finalScore = finalRows[0] ?? null

    if (!softScore && !hardScore && !finalScore) {
      return res
        .status(404)
        .json({ error: 'No founder score for this deal yet' })
    }

    res.json({ softScore, hardScore, finalScore })
  } catch (err) {
    console.error('Error fetching deal score', err)
    res.status(500).json({ error: 'Failed to fetch deal score' })
  }
})

router.post('/:id/score', async (req, res) => {
  const { id } = req.params
  const { transcript, hardFacts, extraction } = req.body ?? {}

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'transcript is required' })
  }

  try {
    const result = await scoreAndSaveFounder({
      dealId: id,
      transcript,
      hardFacts,
      extraction
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

