import type { ReactNode } from "react"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="page-titlebar">
      <div>
        <span className="page-eyebrow"><i />{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-title-actions">{actions}</div>}
    </header>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "navy",
}: {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
  tone?: "navy" | "gold" | "green" | "slate"
}) {
  return (
    <article className="product-metric-card">
      <div className="product-metric-top">
        <span>{label}</span>
        <span className={`product-metric-icon tone-${tone}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

export function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="product-panel loading-panel" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="product-empty-state" role="alert">
      <strong>We couldn't load this section</strong>
      <p>{message}</p>
      <button className="product-button product-button-secondary" onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  )
}
