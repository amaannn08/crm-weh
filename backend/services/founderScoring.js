import { sql } from '../db/neon.js'
import { extractDealFromTranscript } from './dealExtraction.js'

export function clampScore(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return 0
  if (num < 0) return 0
  if (num > 10) return 10
  return Math.round(num * 10) / 10
}

const BASE_WEIGHTS = {
  resilience: 0.25,
  ambition: 0.2,
  self_awareness: 0.2,
  domain_fit: 0.2,
  storytelling: 0.15
}

export function computeWeightedScore(scores) {
  const entries = Object.entries(BASE_WEIGHTS).map(([key, weight]) => {
    const value = clampScore(scores[key])
    return { key, weight, value }
  })

  const active = entries.filter((entry) => entry.value > 0)
  if (!active.length) return 0

  const totalWeight = active.reduce(
    (sum, entry) => sum + entry.weight,
    0
  )

  if (totalWeight <= 0) return 0

  const score = active.reduce((sum, entry) => {
    const effectiveWeight = entry.weight / totalWeight
    return sum + entry.value * effectiveWeight
  }, 0)

  return Math.round(score * 10) / 10
}

export async function scoreFounderFromTranscript({ transcript, extraction }) {
  if (!extraction) {
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      throw new Error('Transcript is required for founder scoring')
    }

    const MAX_CHARS = 12000
    const trimmed =
      transcript.length > MAX_CHARS
        ? `${transcript.slice(0, MAX_CHARS)}\n\n[TRUNCATED FOR SCORING]`
        : transcript

    extraction = await extractDealFromTranscript({ transcript: trimmed })
  }

  const archetype = extraction.founder_archetype ?? {}

  const scores = {
    resilience: clampScore(archetype.resilience),
    ambition: clampScore(archetype.ambition),
    self_awareness: clampScore(archetype.self_awareness),
    domain_fit: clampScore(archetype.domain_fit),
    storytelling: clampScore(archetype.storytelling)
  }

  const weightedScore = computeWeightedScore(scores)

  const qualitySignals = extraction.founder_quality_signals ?? {}

  return {
    scores,
    weightedScore,
    archetype: archetype.label ?? null,
    evidence: archetype.evidence ?? {},
    founderSignals: {
      education_tier: clampScore(qualitySignals.education_tier),
      previous_startup_experience: clampScore(
        qualitySignals.previous_startup_experience
      ),
      technical_background: clampScore(qualitySignals.technical_background),
      network_strength: clampScore(qualitySignals.network_strength),
      social_credibility: clampScore(qualitySignals.social_credibility)
    },
    raw: extraction
  }
}

export async function saveFounderScore({
  dealId,
  scores,
  weightedScore,
  archetype,
  evidence,
  founderSignals,
  rawPayload
}) {
  const client = await sql`
    SELECT id
    FROM deals
    WHERE id = ${dealId}
    LIMIT 1
  `

  if (!client[0]) {
    throw new Error('Deal not found')
  }

  const scoreRows = await sql`
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
      ${dealId},
      ${scores.resilience},
      ${scores.ambition},
      ${scores.self_awareness},
      ${scores.domain_fit},
      ${scores.storytelling},
      ${weightedScore},
      ${archetype},
      ${JSON.stringify({
        evidence: evidence,
        raw: rawPayload
      })}
    )
    RETURNING *
  `

  const score = scoreRows[0]

  const signalsRows = await sql`
    INSERT INTO founder_signals (
      deal_id,
      education_tier,
      previous_startup_experience,
      technical_background,
      network_strength,
      social_credibility
    )
    VALUES (
      ${dealId},
      ${founderSignals.education_tier},
      ${founderSignals.previous_startup_experience},
      ${founderSignals.technical_background},
      ${founderSignals.network_strength},
      ${founderSignals.social_credibility}
    )
    RETURNING *
  `

  const signals = signalsRows[0]

  const dealRows = await sql`
    UPDATE deals
    SET
      founder_score = ${weightedScore},
      conviction_score = COALESCE(conviction_score, ${weightedScore}),
      updated_at = now()
    WHERE id = ${dealId}
    RETURNING *
  `

  const deal = dealRows[0]

  return { deal, score, signals }
}

