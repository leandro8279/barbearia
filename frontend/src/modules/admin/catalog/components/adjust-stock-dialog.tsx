import {useEffect} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {useAdjustProductStock} from '@/modules/admin/catalog/hooks/use-products'
import {stockAdjustmentSchema, type StockAdjustmentValues} from '@/modules/admin/catalog/schemas/product.schema'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/components/form-field'
import {Button} from '@/shared/ui/button'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/shared/ui/dialog'
import {Input} from '@/shared/ui/input'
import {Textarea} from '@/shared/ui/textarea'

interface AdjustStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: number
  productName: string
  currentStock: number
}

export function AdjustStockDialog({open, onOpenChange, productId, productName, currentStock}: AdjustStockDialogProps) {
  const adjustment = useAdjustProductStock()
  const form = useForm<StockAdjustmentValues>({resolver: zodResolver(stockAdjustmentSchema), defaultValues: {newStock: currentStock, reason: ''}})

  useEffect(() => {
    if (open) form.reset({newStock: currentStock, reason: ''})
  }, [currentStock, form, open])

  async function onSubmit(values: StockAdjustmentValues) {
    const delta = values.newStock - currentStock
    if (delta === 0) {
      form.setError('newStock', {message: 'O novo saldo precisa ser diferente do saldo atual.'})
      return
    }
    try {
      await adjustment.mutateAsync({id: productId, delta, reason: values.reason})
      onOpenChange(false)
    } catch {
      // The mutation reports server errors with a toast; keep the dialog open for correction.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajustar saldo</DialogTitle>
          <DialogDescription>
            {productName} · saldo atual: {currentStock}. Informe o novo saldo e o motivo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newStock"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Novo saldo</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="1" className="min-h-11" onChange={event => field.onChange(Number(event.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Motivo do ajuste</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Ex.: contagem física do estoque" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="min-h-11" disabled={adjustment.isPending}>
                {adjustment.isPending ? 'Salvando...' : 'Registrar ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
