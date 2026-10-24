import type React from 'react'
import { useId, useRef } from 'react'

export type SheetState = 'minimized' | 'mid' | 'expanded'

export type HandaBottomSheetProps = {
  state: SheetState
  onStateChange: (state: SheetState) => void
  title: string
  subtitle: string
  children: React.ReactNode
}

export const SNAP_TRANSLATE_Y: Record<SheetState, string> = {
  minimized: '78%',
  mid: '42%',
  expanded: '0%',
}

export function getNextState(deltaY: number, current: SheetState): SheetState {
  if (deltaY < -80) return current === 'minimized' ? 'mid' : 'expanded'
  if (deltaY > 80) return current === 'expanded' ? 'mid' : 'minimized'
  return current
}

export function HandaBottomSheet({ state, onStateChange, title, subtitle, children }: HandaBottomSheetProps) {
  const titleId = useId()
  const pointerState = useRef<{ pointerId: number; startY: number } | null>(null)

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerState.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointerState.current || pointerState.current.pointerId !== event.pointerId) return
    const deltaY = event.clientY - pointerState.current.startY
    pointerState.current = null
    onStateChange(getNextState(deltaY, state))
  }

  return (
    <section
      aria-labelledby={titleId}
      className="handa-sheet"
      style={{ transform: `translate(-50%, ${SNAP_TRANSLATE_Y[state]})` }}
    >
      <div
        className="handa-sheet__handle"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <span className="handa-sheet__grabber" aria-hidden="true" />
        <div className="handa-sheet__eyebrow">eHANDA</div>
        <h2 id={titleId} className="handa-sheet__title">{title}</h2>
        <p className="handa-sheet__subtitle">{subtitle}</p>
      </div>

      <div className="handa-sheet__controls">
        <button type="button" onClick={() => onStateChange('minimized')}>Minimize</button>
        <button type="button" onClick={() => onStateChange('mid')}>Summary</button>
        <button type="button" onClick={() => onStateChange('expanded')}>Expand</button>
      </div>

      <div className="handa-sheet__content">{children}</div>
    </section>
  )
}
