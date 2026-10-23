import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AXIS_TICK, BAR_PROPS, CHART } from './theme'

export interface ColumnSeries {
  key: string
  label: string
  color: string
  /** Wert für den Tooltip formatieren */
  format?: (value: number) => string
}

/**
 * Säulendiagramm für Werte je Woche/Monat (eine oder zwei Reihen nebeneinander).
 * Antippen einer Säule zeigt alle Werte dieses Abschnitts.
 */
export function ColumnChart<T extends { label: string }>({
  data,
  series,
  height = 200,
  allowDecimals = false,
}: {
  data: readonly T[]
  series: readonly ColumnSeries[]
  height?: number
  allowDecimals?: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={[...data]} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          interval="preserveStartEnd"
          minTickGap={8}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          allowDecimals={allowDecimals}
          width={44}
        />
        <Tooltip
          cursor={{ fill: CHART.cursor }}
          content={({ active, payload, label }) =>
            active && payload && payload.length > 0 ? (
              <div className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 text-fg-muted">{label}</p>
                {series.map((s) => {
                  const entry = payload.find((p) => p.dataKey === s.key)
                  const value = typeof entry?.value === 'number' ? entry.value : 0
                  return (
                    <p key={s.key} className="flex items-center gap-2">
                      <span
                        className="h-0.5 w-3 rounded"
                        style={{ background: s.color }}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-fg">
                        {s.format ? s.format(value) : value}
                      </span>
                      <span className="text-fg-muted">{s.label}</span>
                    </p>
                  )
                })}
              </div>
            ) : null
          }
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} {...BAR_PROPS} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
