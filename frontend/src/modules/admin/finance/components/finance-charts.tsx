import {ArrowDownRight, ArrowUpRight, Minus, Wallet} from 'lucide-react'
import {Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import type {FinanceMetrics, FinanceSummary} from '@/modules/admin/finance/api/finance'
import {EmptyState} from '@/shared/components/empty-state'
import {formatBRL} from '@/shared/lib/format'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/shared/ui/card'

const paymentLabels: Record<FinanceSummary['paymentMethods'][number]['method'], string> = {cash: 'Dinheiro', pix: 'Pix', debit: 'Débito', credit: 'Crédito'}

const paymentColors: Record<FinanceSummary['paymentMethods'][number]['method'], string> = {cash: 'hsl(var(--primary))', pix: 'hsl(153 34% 45%)', debit: 'hsl(202 31% 54%)', credit: 'hsl(28 49% 58%)'}

function currencyAxis(value: number) {
  return new Intl.NumberFormat('pt-BR', {notation: 'compact', style: 'currency', currency: 'BRL', maximumFractionDigits: 1}).format(value / 100)
}

export function FinanceMetricCard({
  title,
  value,
  previousValue,
  description,
  highlight = false,
  inverseTrend = false
}: {
  title: string
  value: number
  previousValue: number
  description: string
  highlight?: boolean
  inverseTrend?: boolean
}) {
  const delta = value - previousValue
  const percent = previousValue === 0 ? null : (delta / Math.abs(previousValue)) * 100
  const isPositive = inverseTrend ? delta < 0 : delta > 0
  const isNegative = inverseTrend ? delta > 0 : delta < 0

  return (
    <Card className={highlight ? 'border-primary/35 bg-primary/[0.06]' : ''}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-[1.65rem] tabular-nums">{formatBRL(value)}</CardTitle>
        </div>
        <span className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
          <Wallet className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
        <p
          className="mt-2 flex items-center gap-1 text-xs"
          aria-label={`Comparação: ${
            percent === null ?
              delta === 0 ?
                'sem variação'
              : 'sem base anterior'
            : `${Math.abs(percent).toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`
          }`}>
          {delta > 0 ?
            <ArrowUpRight className="size-3.5 text-emerald-500" aria-hidden="true" />
          : delta < 0 ?
            <ArrowDownRight className="size-3.5 text-destructive" aria-hidden="true" />
          : <Minus className="size-3.5 text-muted-foreground" aria-hidden="true" />}
          <span
            className={
              isPositive ? 'font-medium text-emerald-500'
              : isNegative ?
                'font-medium text-destructive'
              : 'text-muted-foreground'
            }>
            {percent === null ?
              delta === 0 ?
                'Sem variação'
              : 'Sem base anterior'
            : `${Math.abs(percent).toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`}
          </span>
          <span className="text-muted-foreground">vs. período anterior</span>
        </p>
      </CardContent>
    </Card>
  )
}

export function MonthlyFinanceChart({monthly}: {monthly: FinanceSummary['monthly']}) {
  const data = monthly.map(item => ({...item, label: new Intl.DateTimeFormat('pt-BR', {month: 'short', timeZone: 'UTC'}).format(new Date(`${item.month}-01T12:00:00Z`)).replace('.', '')}))
  const hasValues = data.some(item => item.incomeCents > 0 || item.expensesCents > 0)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Entradas e saídas</CardTitle>
        <CardDescription>Movimentação mês a mês no período selecionado</CardDescription>
      </CardHeader>
      <CardContent>
        {hasValues ?
          <div className="h-[17rem] w-full" role="img" aria-label="Gráfico mensal de receitas e despesas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{top: 8, right: 8, left: 0, bottom: 0}} barGap={5}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                <YAxis width={64} tickFormatter={currencyAxis} tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} />
                <Tooltip
                  cursor={{fill: 'hsl(var(--muted) / 0.55)'}}
                  formatter={value => formatBRL(Number(value))}
                  labelFormatter={(_, payload) => {
                    const month = payload?.[0]?.payload?.month
                    return typeof month === 'string' ? new Intl.DateTimeFormat('pt-BR', {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${month}-01T12:00:00Z`)) : ''
                  }}
                  contentStyle={{borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))'}}
                />
                <Bar dataKey="incomeCents" name="Receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={34} />
                <Bar dataKey="expensesCents" name="Despesas" fill="hsl(12 39% 51%)" radius={[4, 4, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        : <div className="flex min-h-[17rem] items-center justify-center">
            <EmptyState title="Sem movimentação no período" description="Receitas e despesas aparecerão aqui quando houver lançamentos." />
          </div>
        }
      </CardContent>
    </Card>
  )
}

export function PaymentMethodChart({paymentMethods}: {paymentMethods: FinanceSummary['paymentMethods']}) {
  const total = paymentMethods.reduce((sum, item) => sum + item.amountCents, 0)
  const rows = paymentMethods.filter(item => item.amountCents > 0).sort((a, b) => b.amountCents - a.amountCents)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Receita por pagamento</CardTitle>
        <CardDescription>Distribuição dos valores recebidos</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length && total > 0 ?
          <div className="space-y-5">
            <div className="h-40 w-full" role="img" aria-label="Gráfico de receita por forma de pagamento">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{top: 4, right: 8, left: 0, bottom: 4}}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="method" hide />
                  <Tooltip
                    formatter={value => formatBRL(Number(value))}
                    labelFormatter={value => paymentLabels[value as keyof typeof paymentLabels]}
                    contentStyle={{borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))'}}
                  />
                  <Bar dataKey="amountCents" name="Receita" radius={[0, 5, 5, 0]} maxBarSize={22}>
                    {rows.map(item => (
                      <Cell key={item.method} fill={paymentColors[item.method]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-3">
              {rows.map(item => {
                const share = (item.amountCents / total) * 100
                return (
                  <li key={item.method} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{backgroundColor: paymentColors[item.method]}} aria-hidden="true" />
                        {paymentLabels[item.method]}
                      </span>
                      <span className="text-right font-medium tabular-nums">
                        {formatBRL(item.amountCents)} <span className="font-normal text-muted-foreground">· {share.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full transition-[width] duration-300" style={{width: `${share}%`, backgroundColor: paymentColors[item.method]}} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        : <div className="flex min-h-[17rem] items-center justify-center">
            <EmptyState title="Sem recebimentos no período" description="As formas de pagamento aparecerão após o fechamento das comandas." />
          </div>
        }
      </CardContent>
    </Card>
  )
}

export function metricValue(metrics: FinanceMetrics | undefined, key: keyof FinanceMetrics) {
  return metrics?.[key] ?? 0
}
