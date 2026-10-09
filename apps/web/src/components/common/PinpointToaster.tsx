import { Toaster } from "sonner"

/** Mount once in AppShell. Toasts themselves are rendered by PinpointToast via lib/notify. */
export function PinpointToaster() {
  return (
    <Toaster position="bottom-right" visibleToasts={4} gap={10} offset={16} mobileOffset={12} />
  )
}
