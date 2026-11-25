import {z} from 'zod'

export const staffLoginSchema = z.object({email: z.string().trim().email('Informe um e-mail válido.'), password: z.string().min(1, 'Informe sua senha.'), rememberOnDevice: z.boolean()})

export type StaffLoginValues = z.infer<typeof staffLoginSchema>
