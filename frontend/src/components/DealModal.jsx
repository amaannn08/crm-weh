import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function ScoreRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium text-neutral-50">
        {value != null ? value.toFixed(1) : '-'}
      </span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h3>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 whitespace-pre-wrap">
        {children || <span className="text-neutral-500">No notes yet.</span>}
      </div>
    </section>
  )
}

function DealModal({ deal, scoreData, onClose }) {
  if (!deal) return null
  const MotionDiv = motion.div

  const softScore = scoreData?.softScore ?? null
  const hardScore = scoreData?.hardScore ?? null
  const finalScore = scoreData?.finalScore ?? null

  const weightedScore = finalScore?.final_score ?? deal.founder_final_score ?? null

  return (
    <AnimatePresence>
      <MotionDiv
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <MotionDiv
          className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-800 bg-[#111111] shadow-2xl"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-neutral-800 px-5 py-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                {deal.company}
              </h2>
              <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
                {deal.date && (
                  <span>
                    <span className="text-neutral-500">Date:</span>{' '}
                    {formatDate(deal.date)}
                  </span>
                )}
                {deal.poc && (
                  <span>
                    <span className="text-neutral-500">POC:</span> {deal.poc}
                  </span>
                )}
                {deal.sector && (
                  <span>
                    <span className="text-neutral-500">Sector:</span>{' '}
                    {deal.sector}
                  </span>
                )}
                {deal.status && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-200 ring-1 ring-neutral-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {deal.status}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              Esc
            </button>
          </div>

          <div className="grid max-h-[calc(90vh-5rem)] grid-cols-1 gap-6 overflow-y-auto px-5 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Final founder score
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-white">
                      {weightedScore != null ? weightedScore.toFixed(1) : '--'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      DD: {finalScore?.dd_recommendation || deal.dd_recommendation || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <Section title="Why exciting?">
                {deal.exciting_reason}
              </Section>
              <Section title="Risks">{deal.risks}</Section>
              <Section title="Reasons for pass">{deal.pass_reasons}</Section>
              <Section title="Reasons to watch">{deal.watch_reasons}</Section>
              <Section title="Action required">
                {deal.action_required}
              </Section>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-3">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Soft score breakdown
                </h3>
                <div className="space-y-2">
                  <ScoreRow label="Resilience" value={softScore?.resilience} />
                  <ScoreRow label="Ambition" value={softScore?.ambition} />
                  <ScoreRow
                    label="Self awareness"
                    value={softScore?.self_awareness}
                  />
                  <ScoreRow label="Domain fit" value={softScore?.domain_fit} />
                  <ScoreRow
                    label="Storytelling"
                    value={softScore?.storytelling}
                  />
                </div>
                <div className="mt-4 border-t border-neutral-800 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Archetype
                  </p>
                  <p className="mt-1 text-sm font-medium text-neutral-50">
                    {softScore?.archetype || 'Not scored yet'}
                  </p>
                </div>
              </div>

              {hardScore && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-3">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Hard score breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-200">
                    <div className="space-y-1">
                      <p className="text-neutral-400">Education tier</p>
                      <p className="font-medium">
                        {hardScore.education_tier ?? '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-neutral-400">Domain work experience</p>
                      <p className="font-medium">
                        {hardScore.domain_work_experience ?? '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-neutral-400">Seniority of roles</p>
                      <p className="font-medium">
                        {hardScore.seniority_of_roles ?? '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-neutral-400">Previous startup experience</p>
                      <p className="font-medium">
                        {hardScore.previous_startup_experience ?? '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  )
}

export default DealModal

