import { AccountAddress } from '@/modules/account/api/profile';
import { AccountAddressValues } from '@/modules/account/schemas/account-profile.schema';

import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';

import { useAccountAddressDrawer } from './useAccountAddressDrawer';

interface AccountAddressDrawerProps {
  open: boolean;
  address?: AccountAddress;
  onOpenChange: (open: boolean) => void;
  onSave: (values: AccountAddressValues) => void;
  isPending: boolean;
}

export function AccountAddressDrawer({ open, address, onOpenChange, onSave, isPending }: AccountAddressDrawerProps) {
  const { form, action } = useAccountAddressDrawer({ onOpenChange, onSave });

  return (
    <Sheet open={open} onOpenChange={action.handleOpenChange}>
      <SheetContent side="right" className="w-[min(94vw,34rem)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{address ? 'Editar endereço' : 'Adicionar endereço'}</SheetTitle>
          <SheetDescription>Salve um endereço para facilitar seus próximos agendamentos.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form className="space-y-4 px-4 pb-5" onSubmit={form.handleSubmit(action.submit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificação</FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus autoComplete="off" placeholder="Casa, trabalho..." className="min-h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={9}
                        placeholder="00000-000"
                        className="min-h-11"
                        onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 8))}
                        value={field.value.replace(/^(\d{5})(\d)/, '$1-$2')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua ou avenida</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="address-line1" placeholder="Nome da rua" className="min-h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" placeholder="123" className="min-h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="complement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="address-line2" placeholder="Apartamento, bloco..." className="min-h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="address-level3" className="min-h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="address-level2" className="min-h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="address-level1" maxLength={2} className="min-h-11 uppercase" onChange={(event) => field.onChange(event.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ponto de referência (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Próximo a..." className="min-h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.formState.errors.root?.server && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.server.message}
              </p>
            )}
            <SheetFooter className="px-0">
              <Button type="submit" disabled={isPending} className="min-h-11 w-full">
                {isPending ? 'Salvando...' : 'Salvar endereço'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
