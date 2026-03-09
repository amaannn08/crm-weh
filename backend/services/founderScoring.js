import { sql } from '../db/neon.js'
import { extractDealFromTranscript } from './dealExtraction.js'

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

export function clampScore(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return 0
  if (num < 0) return 0
  if (num > 10) return 10
  return Math.round(num * 10) / 10
}

/**
 * Accepts a scores object and a weights object.
 * Skips dimensions with score = 0 and re-normalises weights across active ones.
 */
export function computeWeightedScore(scores, weights) {
  const entries = Object.entries(weights).map(([key, weight]) => ({
    key,
    weight,
    value: clampScore(scores[key] ?? 0)
  }))

  const active = entries.filter((entry) => entry.value > 0)
  if (!active.length) return 0

  const totalWeight = active.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) return 0

  const score = active.reduce((sum, entry) => {
    return sum + entry.value * (entry.weight / totalWeight)
  }, 0)

  return Math.round(score * 10) / 10
}

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SOFT WEIGHTS — behavioural signals from transcript / pitch
 * Source: image reference (Resilience 25, Ambition 20, Self-Awareness 20,
 *         Domain Fit 20, Storytelling 15)
 */
export const SOFT_WEIGHTS = {
  resilience: 0.25,
  ambition: 0.2,
  self_awareness: 0.2,
  domain_fit: 0.2,
  storytelling: 0.15
}

/**
 * HARD WEIGHTS — verifiable facts: education, work history, roles
 */
export const HARD_WEIGHTS = {
  education_tier: 0.2,
  domain_work_experience: 0.35,
  seniority_of_roles: 0.25,
  previous_startup_experience: 0.2
}

/**
 * FINAL WEIGHTS — how hard and soft combine into the gate score
 */
export const FINAL_WEIGHTS = {
  hard: 0.4,
  soft: 0.6
}

// ─────────────────────────────────────────────────────────────────────────────
// DUE DILIGENCE GATE
// ─────────────────────────────────────────────────────────────────────────────

export function getDDRecommendation(finalScore) {
  if (finalScore >= 8.0) {
    return {
      recommendation: 'GO',
      label: 'Proceed to full due diligence',
      reason:
        'Founder clears the bar on both verifiable credentials and behavioural signals.'
    }
  }
  if (finalScore >= 6.5) {
    return {
      recommendation: 'CONDITIONAL',
      label: 'One more call - probe identified gaps',
      reason:
        'Promising signals but specific gaps need validation before committing to DD.'
    }
  }
  return {
    recommendation: 'PASS',
    label: 'Archive with scoring rationale',
    reason:
      'Score does not meet threshold. Document gaps for future re-engagement if circumstances change.'
  }
}

export function computeFinalScore(hardWeightedScore, softWeightedScore) {
  const final =
    hardWeightedScore * FINAL_WEIGHTS.hard +
    softWeightedScore * FINAL_WEIGHTS.soft
  return Math.round(final * 10) / 10
}

export async function scoreFounderFromTranscript({ transcript, extraction }) {
  if (!extraction) {
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      throw new Error('Transcript is required for founder scoring')
    }

    const MAX_CHARS = 20000
    const trimmed =
      transcript.length > MAX_CHARS
        ? `${transcript.slice(0, MAX_CHARS)}\n\n[TRUNCATED FOR SCORING]`
        : transcript

    extraction = await extractDealFromTranscript({ transcript: trimmed })
  }

  const archetype = extraction.founder_archetype ?? {}

  const softScores = {
    resilience: clampScore(archetype.resilience),
    ambition: clampScore(archetype.ambition),
    self_awareness: clampScore(archetype.self_awareness),
    domain_fit: clampScore(archetype.domain_fit),
    storytelling: clampScore(archetype.storytelling)
  }

  const softWeightedScore = computeWeightedScore(softScores, SOFT_WEIGHTS)

  const qualitySignals = extraction.founder_quality_signals ?? {}

  const hardScores = {
    education_tier: clampScore(qualitySignals.education_tier),
    domain_work_experience: clampScore(qualitySignals.domain_work_experience),
    seniority_of_roles: clampScore(qualitySignals.seniority_of_roles),
    previous_startup_experience: clampScore(
      qualitySignals.previous_startup_experience
    )
  }

  const hardWeightedScore = computeWeightedScore(hardScores, HARD_WEIGHTS)

  const finalScore = computeFinalScore(hardWeightedScore, softWeightedScore)
  const ddRecommendation = getDDRecommendation(finalScore)

  return {
    softScores,
    softWeightedScore,
    archetype: archetype.label ?? null,
    evidence: archetype.evidence ?? {},
    hardScores,
    hardWeightedScore,
    finalScore,
    ddRecommendation: ddRecommendation.recommendation,
    ddLabel: ddRecommendation.label,
    ddReason: ddRecommendation.reason,
    raw: extraction
  }
}

/**
 * Call this separately when you have verified CV / LinkedIn data.
 * Input: plain object with the four hard dimensions already scored 0–10.
 */
export function computeHardScoreFromFacts(facts) {
  const hardScores = {
    education_tier: clampScore(facts.education_tier),
    domain_work_experience: clampScore(facts.domain_work_experience),
    seniority_of_roles: clampScore(facts.seniority_of_roles),
    previous_startup_experience: clampScore(
      facts.previous_startup_experience
    )
  }

  const hardWeightedScore = computeWeightedScore(hardScores, HARD_WEIGHTS)
  return { hardScores, hardWeightedScore }
}

export async function saveFounderScore({
  dealId,
  softScores,
  softWeightedScore,
  hardScores,
  hardWeightedScore,
  finalScore,
  ddRecommendation,
  archetype,
  evidence,
  rawPayload
}) {
  const dealCheck = await sql`
    SELECT id
    FROM deals
    WHERE id = ${dealId}
    LIMIT 1
  `

  if (!dealCheck[0]) throw new Error('Deal not found')

  const softRows = await sql`
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
      ${dealId},
      ${softScores.resilience},
      ${softScores.ambition},
      ${softScores.self_awareness},
      ${softScores.domain_fit},
      ${softScores.storytelling},
      ${softWeightedScore},
      ${archetype},
      ${JSON.stringify({
        evidence,
        raw: rawPayload
      })}
    )
    RETURNING *
  `

  const hardRows = await sql`
    INSERT INTO founder_hard_scores (
      deal_id,
      education_tier,
      domain_work_experience,
      seniority_of_roles,
      previous_startup_experience,
      hard_weighted_score
    )
    VALUES (
      ${dealId},
      ${hardScores.education_tier},
      ${hardScores.domain_work_experience},
      ${hardScores.seniority_of_roles},
      ${hardScores.previous_startup_experience},
      ${hardWeightedScore}
    )
    RETURNING *
  `

  const finalRows = await sql`
    INSERT INTO founder_final_scores (
      deal_id,
      hard_weighted_score,
      soft_weighted_score,
      final_score,
      dd_recommendation,
      scored_at
    )
    VALUES (
      ${dealId},
      ${hardWeightedScore},
      ${softWeightedScore},
      ${finalScore},
      ${ddRecommendation},
      now()
    )
    RETURNING *
  `

  const dealRows = await sql`
    UPDATE deals
    SET
      founder_soft_score = ${softWeightedScore},
      founder_hard_score = ${hardWeightedScore},
      founder_final_score = ${finalScore},
      dd_recommendation = ${ddRecommendation},
      conviction_score = COALESCE(conviction_score, ${finalScore}),
      updated_at = now()
    WHERE id = ${dealId}
    RETURNING *
  `

  return {
    deal: dealRows[0],
    softScore: softRows[0],
    hardScore: hardRows[0],
    finalScore: finalRows[0]
  }
}

export async function scoreAndSaveFounder({
  dealId,
  transcript,
  hardFacts,
  extraction
}) {
  const transcriptResult = await scoreFounderFromTranscript({
    transcript,
    extraction
  })

  let hardScores = transcriptResult.hardScores
  let hardWeightedScore = transcriptResult.hardWeightedScore

  if (hardFacts) {
    const verified = computeHardScoreFromFacts(hardFacts)
    hardScores = verified.hardScores
    hardWeightedScore = verified.hardWeightedScore
  }

  const finalScore = computeFinalScore(
    hardWeightedScore,
    transcriptResult.softWeightedScore
  )
  const ddResult = getDDRecommendation(finalScore)

  const saved = await saveFounderScore({
    dealId,
    softScores: transcriptResult.softScores,
    softWeightedScore: transcriptResult.softWeightedScore,
    hardScores,
    hardWeightedScore,
    finalScore,
    ddRecommendation: ddResult.recommendation,
    archetype: transcriptResult.archetype,
    evidence: transcriptResult.evidence,
    rawPayload: transcriptResult.raw
  })

  return {
    ...saved,
    softScores: transcriptResult.softScores,
    softWeightedScore: transcriptResult.softWeightedScore,
    hardScores,
    hardWeightedScore,
    finalScore,
    ddRecommendation: ddResult.recommendation,
    ddLabel: ddResult.label,
    ddReason: ddResult.reason,
    archetype: transcriptResult.archetype,
    evidence: transcriptResult.evidence
  }
}
