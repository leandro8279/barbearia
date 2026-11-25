import {useRef} from 'react'
import type {KeyboardEvent, PointerEvent} from 'react'
import {Clock3, Plus, Trash2} from 'lucide-react'
import type {TeamScheduleRange} from '@/modules/admin/team/api/team-management'
import {Button} from '@/shared/ui/button'

function toMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function toTime(value: number) {
  const safe = Math.max(0, Math.min(1439, value))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

interface DragState {
  index: number
  edge: 'move' | 'start' | 'end'
  clientX: number
  trackWidth: number
  original: TeamScheduleRange
}

interface ScheduleRangeEditorProps {
  label: string
  kind: 'work' | 'break'
  ranges: TeamScheduleRange[]
  onChange: (ranges: TeamScheduleRange[]) => void
  timelineStart: number
  timelineEnd: number
  addRange?: TeamScheduleRange
}

export function ScheduleRangeEditor({label, kind, ranges, onChange, timelineStart, timelineEnd, addRange}: ScheduleRangeEditorProps) {
  const dragRef = useRef<DragState | null>(null)
  const span = Math.max(60, timelineEnd - timelineStart)

  function update(index: number, edge: DragState['edge'], delta: number) {
    const current = ranges[index]
    if (!current) return
    const start = toMinutes(current.start)
    const end = toMinutes(current.end)
    const next = [...ranges]
    if (edge === 'move') {
      const duration = end - start
      const nextStart = clamp(start + delta, timelineStart, timelineEnd - duration)
      next[index] = {start: toTime(nextStart), end: toTime(nextStart + duration)}
    } else if (edge === 'start') {
      next[index] = {start: toTime(clamp(start + delta, timelineStart, end - 15)), end: current.end}
    } else {
      next[index] = {start: current.start, end: toTime(clamp(end + delta, start + 15, timelineEnd))}
    }
    onChange(next)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>, index: number) {
    const track = event.currentTarget.closest<HTMLElement>('[data-range-track]')
    const current = ranges[index]
    if (!track || !current) return
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-edge]') : null
    const edge = target?.dataset.edge === 'start' || target?.dataset.edge === 'end' ? target.dataset.edge : 'move'
    const rect = track.getBoundingClientRect()
    dragRef.current = {index, edge, clientX: event.clientX, trackWidth: rect.width, original: current}
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.trackWidth <= 0) return
    const rawMinutes = ((event.clientX - drag.clientX) / drag.trackWidth) * span
    const delta = Math.round(rawMinutes / 15) * 15
    const start = toMinutes(drag.original.start)
    const end = toMinutes(drag.original.end)
    const current = ranges[drag.index]
    if (!current || (current.start === drag.original.start && current.end === drag.original.end && delta === 0)) return
    const next = [...ranges]
    if (drag.edge === 'move') {
      const duration = end - start
      const nextStart = clamp(start + delta, timelineStart, timelineEnd - duration)
      next[drag.index] = {start: toTime(nextStart), end: toTime(nextStart + duration)}
    } else if (drag.edge === 'start') {
      next[drag.index] = {start: toTime(clamp(start + delta, timelineStart, end - 15)), end: drag.original.end}
    } else {
      next[drag.index] = {start: drag.original.start, end: toTime(clamp(end + delta, start + 15, timelineEnd))}
    }
    onChange(next)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-edge]') : null
    const edge = target?.dataset.edge === 'start' || target?.dataset.edge === 'end' ? target.dataset.edge : 'move'
    update(index, edge, event.key === 'ArrowLeft' ? -15 : 15)
  }

  return (
    <section className="space-y-3" aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock3 className={`size-4 ${kind === 'work' ? 'text-primary' : 'text-amber-600 dark:text-amber-400'}`} aria-hidden="true" />
          {label}
        </div>
        {addRange && (
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => onChange([...ranges, addRange])}>
            <Plus className="size-4" aria-hidden="true" /> Adicionar faixa
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {ranges.map((range, index) => {
          const start = toMinutes(range.start)
          const end = toMinutes(range.end)
          const left = clamp(((start - timelineStart) / span) * 100, 0, 100)
          const width = clamp(((end - start) / span) * 100, 2, 100 - left)
          return (
            <div key={`${range.start}-${range.end}-${index}`} className="flex items-center gap-2">
              <div
                data-range-track="true"
                className="relative h-12 min-w-0 flex-1 rounded-md border border-border bg-muted/50"
                aria-label={`${label} entre ${toTime(timelineStart)} e ${toTime(timelineEnd)}`}>
                <div className="absolute inset-y-0 flex items-center border-x border-border/70" style={{left: `${((start - timelineStart) / span) * 100}%`, width: `${width}%`}}>
                  <div
                    role="group"
                    tabIndex={0}
                    aria-label={`${label}: ${range.start} até ${range.end}. Arraste para mover; use as alças para ajustar.`}
                    className={`relative flex h-9 w-full touch-none items-center justify-center rounded px-3 text-xs font-semibold tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      kind === 'work' ? 'bg-primary/25' : 'bg-amber-500/25'
                    }`}
                    onPointerDown={event => onPointerDown(event, index)}
                    onPointerMove={onPointerMove}
                    onPointerUp={() => {
                      dragRef.current = null
                    }}
                    onPointerCancel={() => {
                      dragRef.current = null
                    }}
                    onKeyDown={event => onKeyDown(event, index)}>
                    <span className="truncate">
                      {range.start}–{range.end}
                    </span>
                    <span
                      data-edge="start"
                      role="slider"
                      tabIndex={0}
                      aria-label={`Início ${label.toLowerCase()} ${range.start}`}
                      aria-valuemin={timelineStart}
                      aria-valuemax={end - 15}
                      aria-valuenow={start}
                      className="absolute inset-y-0 left-0 w-3 cursor-ew-resize rounded-l bg-foreground/20"
                    />
                    <span
                      data-edge="end"
                      role="slider"
                      tabIndex={0}
                      aria-label={`Fim ${label.toLowerCase()} ${range.end}`}
                      aria-valuemin={start + 15}
                      aria-valuemax={timelineEnd}
                      aria-valuenow={end}
                      className="absolute inset-y-0 right-0 w-3 cursor-ew-resize rounded-r bg-foreground/20"
                    />
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Remover faixa ${range.start} a ${range.end}`}
                onClick={() => onChange(ranges.filter((_, currentIndex) => currentIndex !== index))}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )
        })}
        {!ranges.length && <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">Nenhuma faixa cadastrada neste dia.</p>}
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{toTime(timelineStart)}</span>
        <span>{toTime(timelineEnd)}</span>
      </div>
    </section>
  )
}
