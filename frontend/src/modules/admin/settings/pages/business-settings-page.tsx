import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Plus, Save, Trash2, Upload } from 'lucide-react';
import type { BusinessFormValues } from '@/modules/admin/settings/api/settings';
import { useBusinessSettings, useSaveBusinessSettings } from '@/modules/admin/settings/hooks/use-settings';
import { SettingsField } from '@/modules/admin/settings/components/settings-form-fields';
import { SettingsNavigation } from '@/modules/admin/settings/components/settings-navigation';
import { businessSchema } from '@/modules/admin/settings/schemas/business.schema';
import { useCan } from '@/shared/hooks/use-can';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatPhone } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

const emptyValues: BusinessFormValues = {
  name: '',
  cnpj: '',
  phone: '',
  whatsapp: '',
  email: '',
  logo: '',
  addressDetails: { zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', reference: '' },
  socials: { instagram: '', facebook: '', tiktok: '', website: '' },
  amenities: [],
  photos: [],
};

const MAX_LOGO_DATA_URL_BYTES = 200 * 1024;
const MAX_MEDIA_DATA_URL_BYTES = 750 * 1024;

function fileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler a imagem.')));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

function imageDataUrlBytes(value: string) {
  return value.startsWith('data:image/') ? new TextEncoder().encode(value).length : 0;
}

async function imageDataUrlWithinLimit(file: File, maxBytes: number) {
  const original = await fileAsDataUrl(file);
  if (imageDataUrlBytes(original) <= maxBytes) return original;

  const image = new Image();
  image.src = original;
  await image.decode();
  let scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  let quality = 0.9;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível otimizar a imagem.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) throw new Error('Não foi possível otimizar a imagem.');
    const compressed = await fileAsDataUrl(blob);
    if (imageDataUrlBytes(compressed) <= maxBytes) return compressed;
    if (quality > 0.55) quality -= 0.1;
    else {
      scale *= 0.8;
      quality = 0.82;
    }
  }
  throw new Error('Não foi possível reduzir a imagem para o limite permitido.');
}

function mediaDataUrlBytes(logo: string, photos: string[]) {
  return imageDataUrlBytes(logo) + photos.reduce((total, photo) => total + imageDataUrlBytes(photo), 0);
}

function displayPhone(value: string) {
  return value ? formatPhone(value) : '';
}

function legacyAddress(value: string) {
  const [streetPart = '', locality = ''] = value.split(/\s+—\s+|\s+-\s+/);
  const streetMatch = /^(.*?)(?:,\s*([^,]+))?$/.exec(streetPart.trim());
  const [city = '', state = ''] = locality.split(',').map((item) => item.trim());
  return { ...emptyValues.addressDetails, street: streetMatch?.[1]?.trim() || streetPart, number: streetMatch?.[2]?.trim() || '', city, state };
}

export default function BusinessSettingsPage() {
  const query = useBusinessSettings();
  const saveMutation = useSaveBusinessSettings();
  const canWrite = useCan('settings.write');
  const [amenityDraft, setAmenityDraft] = useState('');
  const form = useForm<BusinessFormValues>({ resolver: zodResolver(businessSchema), defaultValues: emptyValues });

  useEffect(() => {
    document.title = 'Dados do negócio | Configurações';
  }, []);

  useEffect(() => {
    const data = query.data;
    const unit = data?.unit;
    if (!data || !unit) return;
    form.reset({
      ...emptyValues,
      name: data.business.name || unit.name || '',
      cnpj: data.business.cnpj || '',
      phone: displayPhone(unit.phone || ''),
      whatsapp: displayPhone(unit.whatsapp || ''),
      email: data.business.email || '',
      logo: unit.logo || '',
      addressDetails: unit.addressDetails || legacyAddress(unit.address || ''),
      socials: { ...emptyValues.socials, ...(data.business.socials || {}) },
      amenities: unit.amenities || [],
      photos: unit.photos || [],
    });
  }, [form, query.data]);

  function addAmenity() {
    const value = amenityDraft.trim();
    const current = form.getValues('amenities');
    if (!value || current.some((item) => item.toLocaleLowerCase('pt-BR') === value.toLocaleLowerCase('pt-BR'))) return;
    form.setValue('amenities', [...current, value], { shouldDirty: true, shouldValidate: true });
    setAmenityDraft('');
  }

  async function setLogo(file?: File) {
    if (!file) return;
    if (file.size > 200 * 1024) {
      form.setError('logo', { type: 'manual', message: 'A logo deve ter no máximo 200 KB.' });
      return;
    }
    try {
      const photos = form.getValues('photos');
      const availableBytes = MAX_MEDIA_DATA_URL_BYTES - mediaDataUrlBytes('', photos);
      if (availableBytes <= 0) throw new Error('Remova algumas fotos antes de enviar uma logo.');
      const dataUrl = await imageDataUrlWithinLimit(file, Math.min(MAX_LOGO_DATA_URL_BYTES, availableBytes));
      form.clearErrors('logo');
      form.setValue('logo', dataUrl, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      form.setError('logo', { type: 'manual', message: error instanceof Error ? error.message : 'Não foi possível carregar a imagem.' });
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const tooLarge = selected.find((file) => file.size > 200 * 1024);
    if (tooLarge) {
      form.setError('photos', { type: 'manual', message: `${tooLarge.name} excede o limite de 200 KB.` });
      return;
    }
    const current = form.getValues('photos');
    if (current.length + selected.length > 8) {
      form.setError('photos', { type: 'manual', message: 'Cadastre no máximo oito fotos.' });
      return;
    }
    try {
      const nextPhotos: string[] = [];
      let remainingBytes = MAX_MEDIA_DATA_URL_BYTES - mediaDataUrlBytes(form.getValues('logo'), current);
      for (let index = 0; index < selected.length; index += 1) {
        const perPhotoLimit = Math.floor(remainingBytes / (selected.length - index));
        if (perPhotoLimit <= 0) throw new Error('Remova ou substitua algumas imagens para caber no limite de envio.');
        const photo = await imageDataUrlWithinLimit(selected[index], perPhotoLimit);
        nextPhotos.push(photo);
        remainingBytes -= imageDataUrlBytes(photo);
      }
      form.clearErrors('photos');
      form.setValue('photos', [...current, ...nextPhotos], { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      form.setError('photos', { type: 'manual', message: error instanceof Error ? error.message : 'Não foi possível carregar as fotos.' });
    }
  }

  if (query.isPending)
    return (
      <div className="space-y-5">
        <Skeleton className="h-14" />
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    );
  if (query.isError || !query.data) return <ErrorState title="Não foi possível carregar os dados do negócio" description="Confira a conexão e tente novamente." onRetry={() => void query.refetch()} />;

  function save(values: BusinessFormValues) {
    if (imageDataUrlBytes(values.logo) > MAX_LOGO_DATA_URL_BYTES) {
      form.setError('logo', { type: 'manual', message: 'A logo deve gerar um data URL de no máximo 200 KB.' });
      return;
    }
    if (mediaDataUrlBytes(values.logo, values.photos) > MAX_MEDIA_DATA_URL_BYTES) {
      form.setError('photos', { type: 'manual', message: 'Otimize ou remova algumas imagens antes de salvar.' });
      return;
    }
    if (new TextEncoder().encode(JSON.stringify(values)).length > 950 * 1024) {
      form.setError('photos', { type: 'manual', message: 'O envio excede o limite seguro. Reduza a quantidade de fotos e tente novamente.' });
      return;
    }
    saveMutation.mutate(values);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configurações" title="Dados do negócio" description="Mantenha os dados públicos da unidade atualizados." />
      <SettingsNavigation active="/admin/config" />
      {!canWrite && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Seu acesso permite consultar estes dados, mas não alterá-los.</p>}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Identificação e contato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SettingsField control={form.control} name="name" label="Nome do negócio" disabled={!canWrite} />
              <SettingsField control={form.control} name="cnpj" label="CNPJ" placeholder="00.000.000/0000-00" disabled={!canWrite} />
              <SettingsField control={form.control} name="phone" label="Telefone" placeholder="(11) 3333-1212" disabled={!canWrite} />
              <SettingsField control={form.control} name="whatsapp" label="WhatsApp" placeholder="(11) 99999-1212" disabled={!canWrite} />
              <SettingsField control={form.control} name="email" label="E-mail" type="email" disabled={!canWrite} />
              <div className="space-y-2">
                <label htmlFor="business-logo" className="text-sm font-medium">
                  Logo
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {form.watch('logo') ?
                    <img
                      src={form.watch('logo')}
                      alt="Prévia da logo"
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="size-16 rounded-lg border border-border bg-card object-contain p-1"
                    />
                  : <div className="grid size-16 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                      <ImagePlus className="size-5" />
                    </div>
                  }
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted">
                    <Upload className="size-4" /> Enviar imagem
                    <input
                      id="business-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="sr-only"
                      disabled={!canWrite}
                      onChange={(event) => {
                        void setLogo(event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {form.watch('logo') && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11"
                      disabled={!canWrite}
                      onClick={() => {
                        form.clearErrors('logo');
                        form.setValue('logo', '', { shouldDirty: true });
                      }}
                    >
                      Remover logo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Data URL com limite de 200 KB. As imagens são otimizadas para caber no limite de envio.</p>
                {form.formState.errors.logo?.message && (
                  <p role="alert" className="text-sm text-destructive">
                    {form.formState.errors.logo.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SettingsField control={form.control} name="addressDetails.zip" label="CEP" placeholder="00000-000" disabled={!canWrite} />
              <div className="sm:col-span-2">
                <SettingsField control={form.control} name="addressDetails.street" label="Logradouro" disabled={!canWrite} />
              </div>
              <SettingsField control={form.control} name="addressDetails.number" label="Número" disabled={!canWrite} />
              <SettingsField control={form.control} name="addressDetails.complement" label="Complemento" disabled={!canWrite} />
              <SettingsField control={form.control} name="addressDetails.neighborhood" label="Bairro" disabled={!canWrite} />
              <SettingsField control={form.control} name="addressDetails.city" label="Cidade" disabled={!canWrite} />
              <SettingsField control={form.control} name="addressDetails.state" label="UF" placeholder="SP" disabled={!canWrite} />
              <div className="sm:col-span-2 lg:col-span-4">
                <SettingsField control={form.control} name="addressDetails.reference" label="Ponto de referência" disabled={!canWrite} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Redes sociais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SettingsField control={form.control} name="socials.instagram" label="Instagram" placeholder="https://instagram.com/..." disabled={!canWrite} />
              <SettingsField control={form.control} name="socials.facebook" label="Facebook" placeholder="https://facebook.com/..." disabled={!canWrite} />
              <SettingsField control={form.control} name="socials.tiktok" label="TikTok" placeholder="https://tiktok.com/..." disabled={!canWrite} />
              <SettingsField control={form.control} name="socials.website" label="Site" placeholder="https://..." disabled={!canWrite} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comodidades e fotos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-medium">Comodidades</p>
                <div className="flex flex-wrap gap-2">
                  {form.watch('amenities').map((amenity, index) => (
                    <span key={`${amenity}-${index}`} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3 text-sm">
                      {amenity}
                      <button
                        type="button"
                        className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Remover ${amenity}`}
                        disabled={!canWrite}
                        onClick={() =>
                          form.setValue(
                            'amenities',
                            form.getValues('amenities').filter((_, itemIndex) => itemIndex !== index),
                            { shouldDirty: true },
                          )
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  ))}
                  {!form.watch('amenities').length && <p className="text-sm text-muted-foreground">Nenhuma comodidade cadastrada.</p>}
                </div>
                <div className="flex max-w-lg gap-2">
                  <Input
                    value={amenityDraft}
                    onChange={(event) => setAmenityDraft(event.target.value)}
                    placeholder="Ex.: Wi-Fi"
                    disabled={!canWrite}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addAmenity();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={!canWrite} onClick={addAmenity}>
                    <Plus className="size-4" /> Adicionar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Fotos da unidade</p>
                  <p className="mt-1 text-xs text-muted-foreground">Até oito imagens; envie arquivos de até 200 KB cada.</p>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted">
                  <ImagePlus className="size-4" /> Adicionar fotos
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    disabled={!canWrite}
                    onChange={(event) => {
                      void addPhotos(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                {form.formState.errors.photos?.message && (
                  <p role="alert" className="text-sm text-destructive">
                    {form.formState.errors.photos.message}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.watch('photos').map((photo, index) => (
                    <div key={`${photo.slice(0, 40)}-${index}`} className="relative overflow-hidden rounded-lg border border-border">
                      <img src={photo} alt={`Foto da unidade ${index + 1}`} width={240} height={240} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 size-9"
                        aria-label={`Remover foto ${index + 1}`}
                        disabled={!canWrite}
                        onClick={() => {
                          form.clearErrors('photos');
                          form.setValue(
                            'photos',
                            form.getValues('photos').filter((_, itemIndex) => itemIndex !== index),
                            { shouldDirty: true },
                          );
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!canWrite || saveMutation.isPending}>
              <Save className="size-4" /> {saveMutation.isPending ? 'Salvando…' : 'Salvar dados'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
