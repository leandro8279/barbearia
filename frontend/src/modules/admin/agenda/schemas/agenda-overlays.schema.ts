import {z} from 'zod'

export const rescheduleAppointmentSchema = z.object({
  barberId: z.string().min(1, 'Selecione um profissional.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
  start: z.string().min(1, 'Selecione um horário sugerido.'),
  reason: z.string().trim().min(3, 'Informe o motivo da remarcação.').max(300, 'Use até 300 caracteres.'),
  notifyCustomer: z.boolean()
})

export type RescheduleAppointmentValues = z.infer<typeof rescheduleAppointmentSchema>

export const cancelAppointmentSchema = z.object({
  type: z.enum(['customer', 'barbershop', 'no_show']),
  reason: z.string().trim().min(3, 'Informe o motivo.').max(300, 'Use até 300 caracteres.'),
  offerReschedule: z.boolean()
})

export type CancelAppointmentValues = z.infer<typeof cancelAppointmentSchema>

export const createTimeBlockSchema = z
  .object({
    allBarbers: z.boolean(),
    barberIds: z.array(z.string()),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
    allDay: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    type: z.enum(['block', 'timeoff']),
    reason: z.string(),
    customReason: z.string().trim(),
    weekly: z.boolean(),
    repeatWeeks: z.string()
  })
  .superRefine((values, context) => {
    if (!values.allBarbers && values.barberIds.length === 0) {
      context.addIssue({code: 'custom', path: ['barberIds'], message: 'Selecione pelo menos um barbeiro.'})
    }
    if (!values.allDay && (!values.startTime || !values.endTime || values.startTime >= values.endTime)) {
      context.addIssue({code: 'custom', path: ['endTime'], message: 'O fim precisa ser depois do início.'})
    }
    if (values.reason === 'Outro' && values.customReason.length < 3) {
      context.addIssue({code: 'custom', path: ['customReason'], message: 'Descreva o motivo do bloqueio.'})
    }
  })

export type CreateTimeBlockValues = z.infer<typeof createTimeBlockSchema>
