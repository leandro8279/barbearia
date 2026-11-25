import {Clock3} from 'lucide-react'
import type {PublicService} from '@/modules/site/api/services'
import {formatBRL, formatDuration} from '@/shared/lib/format'
import {Card, CardContent} from '@/shared/ui/card'
import {Checkbox} from '@/shared/ui/checkbox'

interface ServiceOptionProps {
  service: PublicService
  inputId: string
  selected: boolean
  disabled: boolean
  price: number
  priceCaption?: string
  onToggle: () => void
}

export function ServiceOption({service, inputId, selected, disabled, price, priceCaption, onToggle}: ServiceOptionProps) {
  return (
    <label htmlFor={inputId} className={`block ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <Card className={`h-full transition-colors ${selected ? 'border-primary ring-2 ring-primary/30' : ''}`}>
        <CardContent className="flex min-h-28 items-start gap-3">
          <Checkbox id={inputId} checked={selected} disabled={disabled} onCheckedChange={onToggle} className="mt-1 size-5" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{service.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock3 className="size-4" aria-hidden="true" />
              {formatDuration(service.durationMin)}
            </span>
          </div>
          <div className="shrink-0 text-right">
            {priceCaption && <p className="text-xs text-muted-foreground">{priceCaption}</p>}
            <p className="font-medium">{formatBRL(price)}</p>
          </div>
        </CardContent>
      </Card>
    </label>
  )
}
