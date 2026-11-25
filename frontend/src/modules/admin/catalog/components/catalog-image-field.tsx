import {useId} from 'react'
import {ImagePlus} from 'lucide-react'
import {Input} from '@/shared/ui/input'
import {Label} from '@/shared/ui/label'

interface CatalogImageFieldProps {
  label: string
  value: string
  maxBytes: number
  onChange: (value: string) => void
  onError: (message: string | null) => void
}

export function CatalogImageField({label, value, maxBytes, onChange, onError}: CatalogImageFieldProps) {
  const id = useId()

  function readFile(file?: File) {
    if (!file) return
    if (file.size > maxBytes) {
      onError(`A imagem deve ter no máximo ${Math.floor(maxBytes / 1024)} KB.`)
      return
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      onError('Use uma imagem PNG, JPG ou WebP.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onError(null)
      onChange(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => onError('Não foi possível ler a imagem.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-url`}>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input id={`${id}-url`} value={value} onChange={event => onChange(event.target.value)} placeholder="URL da imagem ou envie um arquivo" className="min-h-11" />
        <label htmlFor={`${id}-file`} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">
          <ImagePlus className="size-4" aria-hidden="true" />
          Enviar imagem
        </label>
        <input id={`${id}-file`} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => readFile(event.target.files?.[0])} />
      </div>
      {value ?
        <div className="flex items-center gap-3 rounded-lg border border-border p-2">
          <img src={value} alt="Prévia da imagem" width={64} height={64} loading="lazy" decoding="async" className="size-16 rounded-md object-cover" />
          <button type="button" className="min-h-11 px-3 text-sm text-muted-foreground underline" onClick={() => onChange('')}>
            Remover imagem
          </button>
        </div>
      : <p className="text-xs text-muted-foreground">PNG, JPG ou WebP. O envio será convertido para data URL.</p>}
    </div>
  )
}
