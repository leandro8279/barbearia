import {apiRequest, buildQuery} from '@/shared/lib/http'

export interface DashboardMetrics {
  revenueTodayCents: number
  revenueMonthCents: number
  appointmentsToday: number
  occupancyPct: number | null
  averageTicketCents: number
  newCustomers: number
  noShows: number
  periodRevenueCents: number
}

export interface DashboardRevenueDay {
  date: string
  revenueCents: number
}

export interface DashboardBarberRanking {
  barberId: number
  name: string
  revenueCents: number
  appointmentsCount: number
}

export interface DashboardUpcomingAppointment {
  id: number
  code: string
  start: string
  status: string
  customerName: string
  barberName: string
  serviceNames: string[]
  totalCents: number
}

export interface DashboardInventoryAlert {
  id: number
  name: string
  sku: string
  stock: number
  minStock: number
}

export interface AdminDashboardData {
  from: string
  to: string
  metrics: DashboardMetrics
  revenueByDay: DashboardRevenueDay[]
  barberRanking: DashboardBarberRanking[]
  upcomingAppointments: DashboardUpcomingAppointment[]
  inventoryAlerts: DashboardInventoryAlert[]
}

export async function getAdminDashboard(from: string, to: string): Promise<AdminDashboardData> {
  return apiRequest<AdminDashboardData>(`/admin/dashboard${buildQuery({from, to})}`)
}
