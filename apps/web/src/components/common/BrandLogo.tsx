export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 36 36"
    >
      <rect fill="#0B1B3A" height="36" rx="10" width="36" />
      <path d="M9 9h8v8H9z" fill="#C8922A" rx="2" />
      <path d="M19 9h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8z" fill="#F7CF6A" />
      <path d="M9 19h8v8H9z" fill="#F7CF6A" rx="2" />
      <path d="M19 19h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8z" fill="#C8922A" />
    </svg>
  )
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`pinpoint-brand ${compact ? "pinpoint-brand-compact" : ""}`}>
      <BrandMark className="pinpoint-brand-mark" />
      {!compact && <span>pinpoint</span>}
    </span>
  )
}
