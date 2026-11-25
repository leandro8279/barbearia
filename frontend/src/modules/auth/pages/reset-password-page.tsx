import {useEffect, useState} from 'react'
import {useMutation} from '@tanstack/react-query'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {Link, useLocation, useRoute} from 'wouter'
import {resetPassword} from '@/modules/auth/api/auth'
import {resetPasswordSchema, type ResetPasswordValues} from '@/modules/auth/schemas/reset-password.schema'
import {HttpError} from '@/shared/lib/http'
import {useSessionStore} from '@/shared/stores/session-store'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/shared/ui/card'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {toast} from 'sonner'

function getPasswordStrength(password: string) {
  if (!password) return 0
  return [password.length >= 8, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)].filter(Boolean).length
}

export default function ResetPasswordPage() {
  const [, params] = useRoute('/redefinir-senha/:token')
  const [, setLocation] = useLocation()
  const clearSession = useSessionStore(state => state.clearSession)
  const [invalidToken, setInvalidToken] = useState(false)
  const mutation = useMutation({mutationFn: resetPassword})
  const form = useForm<ResetPasswordValues>({resolver: zodResolver(resetPasswordSchema), defaultValues: {password: '', confirmPassword: ''}})
  const password = form.watch('password')
  const passwordStrength = getPasswordStrength(password)
  const strengthLabel = ['', 'Fraca', 'Média', 'Boa', 'Forte'][passwordStrength]
  const strengthColor =
    passwordStrength === 1 ? 'bg-destructive'
    : passwordStrength === 2 ? 'bg-orange-500'
    : passwordStrength === 3 ? 'bg-amber-400'
    : 'bg-emerald-500'

  useEffect(() => {
    document.title = 'Redefinir senha | Barbearia'
  }, [])

  async function onSubmit(values: ResetPasswordValues) {
    form.clearErrors('root.server')
    setInvalidToken(false)
    try {
      await mutation.mutateAsync({token: params?.token || '', password: values.password})
      clearSession()
      toast.success('Senha redefinida. Entre com sua nova senha.')
      setLocation('/entrar')
    } catch (error) {
      if (error instanceof HttpError && error.status === 400) {
        setInvalidToken(true)
        return
      }
      form.setError('root.server', {type: 'server', message: 'Não foi possível redefinir sua senha agora. Tente novamente.'})
    }
  }

  if (invalidToken) {
    return (
      <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso seguro</p>
          <CardTitle className="text-3xl font-semibold">Link inválido ou expirado</CardTitle>
          <CardDescription>Solicite um novo link para criar outra senha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="h-11 w-full">
            <Link href="/entrar?recuperar=1">Pedir outro link</Link>
          </Button>
          <Button asChild className="h-11 w-full" variant="outline">
            <Link href="/entrar">Voltar para entrar</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isSubmitting = form.formState.isSubmitting || mutation.isPending

  return (
    <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso seguro</p>
        <CardTitle className="text-3xl font-semibold">Criar nova senha</CardTitle>
        <CardDescription>Escolha uma senha nova para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <input autoComplete="username" aria-hidden="true" className="sr-only" name="username" tabIndex={-1} type="text" />
            <FormField
              control={form.control}
              name="password"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" autoFocus className="h-11" type="password" placeholder="Mínimo de 8 caracteres" />
                  </FormControl>
                  <div
                    className="space-y-1.5"
                    role="meter"
                    aria-label="Força da senha"
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-valuenow={passwordStrength}
                    aria-valuetext={strengthLabel || 'Sem senha'}>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map(segment => (
                        <span key={segment} className={`h-1.5 flex-1 rounded-full ${segment < passwordStrength ? strengthColor : 'bg-muted'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{password ? `Força da senha: ${strengthLabel.toLowerCase()}` : 'Use letras, números e símbolos para uma senha mais forte.'}</p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" className="h-11" type="password" placeholder="Digite a senha novamente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.server && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {form.formState.errors.root.server.message}
              </p>
            )}
            <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
