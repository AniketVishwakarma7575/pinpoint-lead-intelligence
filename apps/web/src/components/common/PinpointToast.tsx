import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react"
import "./pinpoint-toast.css"

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading"

export type ToastAction = { label: string; onClick: () => void }

type PinpointToastProps = {
  variant: ToastVariant
  title: ReactNode
  description?: ReactNode
  action?: ToastAction
  /** Milliseconds the toast stays visible. Drives the countdown bar. */
  duration?: number
  onDismiss?: () => void
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
} as const

// Read by screen readers so status never depends on color or icon alone.
const SR_LABEL: Record<ToastVariant, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Notice",
  loading: "In progress",
}

export function PinpointToast({
  variant,
  title,
  description,
  action,
  duration,
  onDismiss,
}: PinpointToastProps) {
  const Icon = ICONS[variant]
  const timed = variant !== "loading" && duration !== undefined && Number.isFinite(duration)

  return (
    <div className="pp-toast" data-variant={variant}>
      <span className="pp-toast__icon" aria-hidden="true">
        <Icon
          size={16}
          strokeWidth={1.75}
          className={variant === "loading" ? "pp-toast__spin" : undefined}
        />
      </span>
      <div className="pp-toast__body">
        <p className="pp-toast__title">
          <span className="sr-only">{SR_LABEL[variant]}: </span>
          {title}
        </p>
        {description ? <p className="pp-toast__desc">{description}</p> : null}
      </div>
      {action ? (
        <button
          type="button"
          className="pp-toast__action"
          onClick={() => {
            action.onClick()
            onDismiss?.()
          }}
        >
          {action.label}
        </button>
      ) : null}
      {variant !== "loading" ? (
        <button
          type="button"
          className="pp-toast__close"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      ) : null}
      {timed ? (
        <span
          className="pp-toast__bar"
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  )
}
