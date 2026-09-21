import * as React from "react"

type ToasterToast = any

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])

  const toast = React.useCallback(
    ({ ...props }: any) => {
      const id = genId()
      const update = (props: ToasterToast) => setToasts((prev) => prev)
      const dismiss = () => setToasts((prev) => prev)
      return { id, dismiss, update }
    },
    []
  )

  return {
    toast,
    dismiss: (toastId?: string) => {},
    toasts,
  }
}
