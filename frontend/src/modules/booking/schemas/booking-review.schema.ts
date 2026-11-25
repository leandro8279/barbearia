import {z} from 'zod'

export const bookingReviewSchema = z.object({policyAccepted: z.boolean().refine(value => value, 'Confirme que leu a política de cancelamento.')})

export type BookingReviewValues = z.infer<typeof bookingReviewSchema>
