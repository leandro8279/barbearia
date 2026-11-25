import {z} from 'zod'

export const bookingSchema = z.object({
  slotGranularityMin: z.union([z.literal(15), z.literal(30)]),
  minAdvanceMin: z.number().int().min(0).max(10080),
  maxDays: z.number().int().min(1).max(365),
  defaultBufferMin: z.number().int().min(0).max(120).multipleOf(5),
  cancelBeforeHours: z.number().int().min(0).max(720),
  rescheduleBeforeHours: z.number().int().min(0).max(720),
  maxReschedules: z.number().int().min(0).max(20),
  autoConfirm: z.boolean(),
  maxFutureAppointments: z.number().int().min(1).max(50)
})

export type BookingFormValues = z.infer<typeof bookingSchema>
