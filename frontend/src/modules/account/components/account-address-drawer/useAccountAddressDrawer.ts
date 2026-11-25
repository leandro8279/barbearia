import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { AccountAddress } from '@/modules/account/api/profile';
import { accountAddressSchema, AccountAddressValues } from '@/modules/account/schemas/account-profile.schema';

interface Props {
  address?: AccountAddress;
  onOpenChange: (open: boolean) => void;
  onSave: (values: AccountAddressValues) => void;
}

const emptyAddress: AccountAddressValues = { label: 'Casa', zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', reference: '' };

export const useAccountAddressDrawer = ({ onOpenChange, onSave, address }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<AccountAddressValues>({ resolver: zodResolver(accountAddressSchema), defaultValues: emptyAddress });

  useEffect(() => {
    form.reset(
      address ?
        {
          label: address.label,
          zip: address.zip,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          reference: address.reference,
        }
      : emptyAddress,
    );
  }, [address, form, open]);

  async function submit(values: AccountAddressValues) {
    setSubmitting(true);
    form.clearErrors('root.server');
    try {
      await onSave(values);
      form.reset(values);
    } catch (error) {
      form.setError('root.server', { type: 'server', message: error instanceof Error ? error.message : 'Não foi possível salvar o endereço.' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && form.formState.isDirty && !submitting && !window.confirm('Descartar as alterações deste endereço?')) return;
    onOpenChange(nextOpen);
  }

  return { form, action: { submit, handleOpenChange } };
};
