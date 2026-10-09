import type { EmailVerification, LeadPriority, Lead } from "@/types"

export function Avatar({ initials, tone }: { initials: string; tone: string }) {
  return <span className={`lead-avatar avatar-${tone}`}>{initials}</span>
}

export function LeadAvatar({ lead }: { lead: Lead }) {
  return (
    <Avatar
      initials={lead.contactName
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")}
      tone={lead.avatarTone}
    />
  )
}

export function ScoreBadge({ score, priority }: { score: number; priority: LeadPriority }) {
  return (
    <span className={`lead-score-badge score-${priority}`}>
      <strong>{score}</strong>
      <small>/100</small>
    </span>
  )
}

export function PriorityPill({ priority }: { priority: LeadPriority }) {
  return (
    <span className={`priority-pill priority-pill-${priority}`}>
      <i />
      {priority}
    </span>
  )
}

export function VerificationPill({ value }: { value: EmailVerification }) {
  const labels: Record<EmailVerification, string> = {
    verified: "Verified",
    risky: "Risky",
    invalid: "Invalid",
    unknown: "Unverified",
  }
  return (
    <span className={`verification-pill verification-${value}`}>
      <i />
      {labels[value]}
    </span>
  )
}

export function ScoreBar({ score, max, label }: { score: number; max: number; label: string }) {
  const percent = max ? Math.max(0, Math.min(100, (score / max) * 100)) : 0
  return (
    <span aria-label={`${label}: ${score} of ${max}`} className="score-bar">
      <i style={{ width: `${percent}%` }} />
    </span>
  )
}
