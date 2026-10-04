import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n/context'

/**
 * Modal built on the native <dialog>: the browser traps focus and handles Escape.
 * The parent closes it by unmounting; focus then returns to the element that opened it.
 */
export function Dialog({ title, onClose, children, wide, variant }: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /** `drawer` slides in from the side like a menu, `lightbox` shows a photo on a dark background. */
  variant?: 'drawer' | 'lightbox'
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  // Forms keep what was typed: only the menu and the photo viewer close on a click outside
  const closeOnBackdrop = useRef(Boolean(variant))

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement as HTMLElement | null
    if (!dialog.open) dialog.showModal()
    // Escape: let React decide, instead of the browser closing the dialog behind its back
    const onCancel = (e: Event) => {
      e.preventDefault()
      onCloseRef.current()
    }
    // A click on the backdrop lands on the <dialog> itself
    const onClick = (e: MouseEvent) => {
      if (closeOnBackdrop.current && e.target === dialog) onCloseRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('click', onClick)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('click', onClick)
      if (dialog.open) dialog.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const className = ['dialog', wide && 'wide', variant].filter(Boolean).join(' ')
  return (
    <dialog ref={ref} className={className} aria-labelledby="dialog-title">
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-btn" onClick={() => onCloseRef.current()} aria-label={t.close}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  )
}
