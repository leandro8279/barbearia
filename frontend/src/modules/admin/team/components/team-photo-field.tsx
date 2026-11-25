import {useId} from 'react'
import {ImagePlus} from 'lucide-react'
import {Button} from '@/shared/ui/button'
import {Label} from '@/shared/ui/label'

const MAX_PHOTO_BYTES = 90 * 1024

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler a foto.')))
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'))
    reader.readAsDataURL(blob)
  })
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a foto.'))), 'image/jpeg', quality)
  })
}

async function compressPhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  const bitmap = await createImageBitmap(file)
  try {
    for (const maxEdge of [900, 720, 560, 420, 320]) {
      const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Não foi possível processar a foto.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.86, 0.74, 0.62, 0.5]) {
        const blob = await canvasBlob(canvas, quality)
        if (blob.size <= MAX_PHOTO_BYTES) return readAsDataUrl(blob)
      }
    }
  } finally {
    bitmap.close()
  }
  throw new Error('Não foi possível reduzir esta foto para até 90 KB. Tente outra imagem.')
}

interface TeamPhotoFieldProps {
  value: string
  onChange: (value: string) => void
  onError: (message: string | null) => void
}

export function TeamPhotoField({value, onChange, onError}: TeamPhotoFieldProps) {
  const inputId = useId()

  async function handleFile(file?: File) {
    if (!file) return
    try {
      const photo = await compressPhoto(file)
      onChange(photo)
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível processar a foto.')
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Foto do profissional</Label>
      <div className="flex flex-wrap items-center gap-3">
        {value ?
          <img src={value} alt="Prévia da foto do profissional" width={64} height={64} loading="lazy" decoding="async" className="size-16 rounded-full border border-border object-cover" />
        : <span className="flex size-16 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
        }
        <div className="flex flex-wrap gap-2">
          <label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">
            <ImagePlus className="size-4" aria-hidden="true" />
            Enviar foto
          </label>
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => void handleFile(event.target.files?.[0])} />
          {value && (
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => onChange('')}>
              Remover
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG ou WebP; a foto é reduzida para até 90 KB antes de salvar.</p>
    </div>
  )
}
