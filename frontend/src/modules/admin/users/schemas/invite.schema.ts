import {z} from 'zod'

export const inviteSchema = z.object({email: z.email('Informe um e-mail válido.'), role: z.enum(['barber', 'reception', 'manager', 'admin'])})

export type InviteValues = z.infer<typeof inviteSchema>
