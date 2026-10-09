import type { ReactNode } from "react"
import { toast as sonner } from "sonner"
import {
  PinpointToast,
  type ToastAction,
  type ToastVariant,
} from "@/components/common/PinpointToast"

export type NotifyOptions = {
  description?: ReactNode
  action?: ToastAction
  duration?: number
  id?: string | number
}

// Errors stay longer because they explain what to fix. Toasts with an action (Undo) stay at least 6s.
const DURATION: Record<ToastVariant, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 6000,
  loading: Infinity,
}
const ACTION_MIN_DURATION = 6000

function show(variant: ToastVariant, title: ReactNode, options: NotifyOptions = {}) {
  const base = options.duration ?? DURATION[variant]
  const duration = options.action ? Math.max(base, ACTION_MIN_DURATION) : base
  return sonner.custom(
    (id) => (
      <PinpointToast
        variant={variant}
        title={title}
        description={options.description}
        action={options.action}
        duration={duration}
        onDismiss={() => sonner.dismiss(id)}
      />
    ),
    { id: options.id, duration },
  )
}

type PromiseMessages<T> = {
  loading: ReactNode
  success: ReactNode | ((data: T) => ReactNode)
  error: ReactNode | ((error: unknown) => ReactNode)
  description?: ReactNode
}

function resolve<A, R>(value: R | ((arg: A) => R), arg: A): R {
  return typeof value === "function" ? (value as (arg: A) => R)(arg) : value
}

function promise<T>(work: Promise<T>, messages: PromiseMessages<T>) {
  const id = show("loading", messages.loading, { description: messages.description })
  work.then(
    (data) => show("success", resolve(messages.success, data), { id }),
    (error) => show("error", resolve(messages.error, error), { id }),
  )
  return work
}

/** Drop-in replacement for sonner's `toast`: same call shape, Pinpoint look. */
export const toast = Object.assign(
  (title: ReactNode, options?: NotifyOptions) => show("info", title, options),
  {
    success: (title: ReactNode, options?: NotifyOptions) => show("success", title, options),
    error: (title: ReactNode, options?: NotifyOptions) => show("error", title, options),
    warning: (title: ReactNode, options?: NotifyOptions) => show("warning", title, options),
    info: (title: ReactNode, options?: NotifyOptions) => show("info", title, options),
    message: (title: ReactNode, options?: NotifyOptions) => show("info", title, options),
    loading: (title: ReactNode, options?: NotifyOptions) => show("loading", title, options),
    promise,
    dismiss: (id?: string | number) => sonner.dismiss(id),
  },
)
