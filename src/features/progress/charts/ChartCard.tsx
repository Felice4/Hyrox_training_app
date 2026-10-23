import { useState, type ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

export interface ChartTable {
  columns: readonly string[]
  rows: readonly (readonly (string | number)[])[]
}

/**
 * Rahmen für ein Diagramm mit Titel und umschaltbarer Tabellenansicht – jeder Wert ist
 * so auch ohne Antippen des Diagramms lesbar.
 */
export function ChartCard({
  title,
  subtitle,
  table,
  legend,
  children,
}: {
  title: string
  subtitle?: ReactNode
  table: ChartTable
  legend?: ReactNode
  children: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Card className="flex flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-fg-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="min-h-9 shrink-0 rounded-lg px-2 text-xs text-fg-muted hover:bg-surface-raised hover:text-fg"
        >
          {showTable ? 'Diagramm' : 'Tabelle'}
        </button>
      </header>
      {legend}
      {showTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-surface text-left text-xs text-fg-muted">
              <tr>
                {table.columns.map((column, i) => (
                  <th key={column} className={i === 0 ? 'py-1.5 pr-2' : 'py-1.5 text-right'}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} className={i === 0 ? 'py-1.5 pr-2' : 'py-1.5 text-right'}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  )
}

/** Legende: Markierung in Serienfarbe, Text in Textfarbe. */
export function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <span className={`size-2.5 rounded-sm ${swatch}`} aria-hidden="true" />
      {label}
    </span>
  )
}
