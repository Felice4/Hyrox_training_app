import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AXIS_TICK, CHART } from './theme'

export interface TrendPoint {
  label: string
  value: number
  /** Zusatzzeile im Tooltip, z. B. der beste Satz */
  detail?: string
}

/**
 * Verlauf einer Kennzahl über die Trainings (eine Reihe, 2 px Linie, Punkte mit Ring).
 * Antippen zeigt Wert und Detail des nächstgelegenen Trainings.
 */
export function TrendChart({
  data,
  format,
  height = 220,
}: {
  data: readonly TrendPoint[]
  format: (value: number) => string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={[...data]} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={56}
          domain={['auto', 'auto']}
          tickFormatter={(v: number) => format(v)}
        />
        <Tooltip
          cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as TrendPoint | undefined
            return active && point ? (
              <div className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs shadow-lg">
                <p className="text-fg-muted">{point.label}</p>
                <p className="font-semibold text-fg">{format(point.value)}</p>
                {point.detail && <p className="text-fg-muted">{point.detail}</p>}
              </div>
            ) : null
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{ r: 4, fill: CHART.accent, stroke: CHART.surface, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: CHART.accent, stroke: CHART.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
