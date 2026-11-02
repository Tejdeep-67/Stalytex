import { RefObject, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Row } from '../types'
import { Aggregate, buildChart, ChartType, niceLabel, palette } from '../lib/chartData'

type Props = {
  headers: string[]
  rows: Row[]
  chartType: ChartType
  xAxis: string
  yAxis: string
  aggregate: Aggregate
  color: string
  chartRef: RefObject<HTMLDivElement>
  onSetChartType: (type: ChartType) => void
  onSetXAxis: (value: string) => void
  onSetYAxis: (value: string) => void
  onSetAggregate: (value: Aggregate) => void
  onSetColor: (value: string) => void
  onDownload: () => void
  isExporting: boolean
}

const chartTypes: Array<{ value: ChartType; label: string }> = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'histogram', label: 'Histogram' },
]

const axisTick = { fontSize: 12, fill: '#6d7c99' }
const tickFormatter = (value: unknown) => (typeof value === 'number' ? niceLabel(value) : String(value))
const shortLabel = (value: unknown) => {
  const text = String(value)
  return text.length > 14 ? `${text.slice(0, 13)}…` : text
}

export default function Visualizations({
  headers,
  rows,
  chartType,
  xAxis,
  yAxis,
  aggregate,
  color,
  chartRef,
  onSetChartType,
  onSetXAxis,
  onSetYAxis,
  onSetAggregate,
  onSetColor,
  onDownload,
  isExporting,
}: Props) {
  const result = useMemo(() => buildChart(rows, chartType, xAxis, yAxis, aggregate), [rows, chartType, xAxis, yAxis, aggregate])
  const colors = useMemo(() => palette(color, Math.max(result.points.length, 1)), [color, result.points.length])

  const usesY = chartType !== 'histogram'
  const usesAggregate = chartType === 'bar' || chartType === 'line' || chartType === 'area' || chartType === 'pie'
  const hasData = chartType === 'scatter' ? result.scatter.length > 0 : result.points.length > 0
  const yName = chartType === 'histogram' ? 'Count' : aggregate === 'count' || !yAxis ? 'Rows' : `${aggregate === 'avg' ? 'Average' : 'Sum'} of ${yAxis}`
  const manyLabels = result.points.length > 8

  const xAxisProps = {
    dataKey: 'name',
    tick: axisTick,
    tickFormatter: shortLabel,
    interval: 'preserveStartEnd' as const,
    angle: manyLabels ? -30 : 0,
    textAnchor: manyLabels ? ('end' as const) : ('middle' as const),
    height: manyLabels ? 70 : 30,
  }
  const yAxisProps = { tick: axisTick, tickFormatter, width: 64 }
  const tooltip = <Tooltip formatter={(value: number) => [value.toLocaleString(undefined, { maximumFractionDigits: 2 }), yName]} />

  const chartContent =
    chartType === 'line' ? (
      <LineChart data={result.points}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e7ebf3" />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        {tooltip}
        <Line type="monotone" dataKey="value" name={yName} stroke={color} strokeWidth={2.5} dot={result.points.length < 60} animationDuration={600} />
      </LineChart>
    ) : chartType === 'area' ? (
      <AreaChart data={result.points}>
        <defs>
          <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.7} />
            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e7ebf3" />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        {tooltip}
        <Area type="monotone" dataKey="value" name={yName} stroke={color} strokeWidth={2} fill="url(#areaColor)" animationDuration={600} />
      </AreaChart>
    ) : chartType === 'pie' ? (
      <PieChart>
        {tooltip}
        <Legend verticalAlign="bottom" />
        <Pie data={result.points} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={1} animationDuration={600}>
          {result.points.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index]} stroke="#fff" />
          ))}
        </Pie>
      </PieChart>
    ) : chartType === 'scatter' ? (
      <ScatterChart>
        <CartesianGrid strokeDasharray="4 4" stroke="#e7ebf3" />
        <XAxis type="number" dataKey="x" name={xAxis} tick={axisTick} tickFormatter={tickFormatter} domain={['auto', 'auto']} />
        <YAxis type="number" dataKey="y" name={yAxis} {...yAxisProps} domain={['auto', 'auto']} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={result.scatter} fill={color} fillOpacity={0.6} isAnimationActive={result.scatter.length < 500} />
      </ScatterChart>
    ) : (
      <BarChart data={result.points}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e7ebf3" vertical={false} />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        {tooltip}
        <Bar dataKey="value" name={yName} fill={color} radius={[6, 6, 0, 0]} animationDuration={600} />
      </BarChart>
    )

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Visualizations</p>
        <h2>Build charts from your dataset</h2>
        <p className="section-copy">
          Pick a chart type and the columns to plot. The preview updates as you change the options.
        </p>
      </div>

      {!headers.length ? (
        <div className="empty-section">
          <p>Upload a dataset to start making charts.</p>
        </div>
      ) : (
        <>
          <div className="chart-types" role="tablist" aria-label="Chart type">
            {chartTypes.map((item) => (
              <button
                type="button"
                role="tab"
                aria-selected={chartType === item.value}
                key={item.value}
                className={chartType === item.value ? 'active' : ''}
                onClick={() => onSetChartType(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="chart-toolbar">
            <label className="field">
              {chartType === 'histogram' ? 'Column' : 'X axis'}
              <select value={xAxis} onChange={(event) => onSetXAxis(event.target.value)}>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </label>
            {usesY ? (
              <label className="field">
                Y axis
                <select value={yAxis} onChange={(event) => onSetYAxis(event.target.value)}>
                  {chartType !== 'scatter' ? <option value="">(count rows)</option> : null}
                  {headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {usesAggregate ? (
              <label className="field">
                Combine values
                <select value={aggregate} onChange={(event) => onSetAggregate(event.target.value as Aggregate)} disabled={!yAxis}>
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                </select>
              </label>
            ) : null}
            <label className="field color-field">
              Colour
              <input type="color" value={color} onChange={(event) => onSetColor(event.target.value)} />
            </label>
          </div>

          <div ref={chartRef} className="chart-wrapper">
            {hasData ? (
              <div className="chart-preview fade-in" key={chartType}>
                <p className="chart-title">
                  {chartType === 'histogram' ? `Distribution of ${xAxis}` : chartType === 'scatter' ? `${yAxis} vs ${xAxis}` : `${yName} by ${xAxis}`}
                </p>
                <ResponsiveContainer width="100%" height={380}>
                  {chartContent}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-section">
                <p>{result.note || 'Nothing to plot for these columns yet. Try a different X / Y.'}</p>
              </div>
            )}
          </div>

          <div className="chart-footer">
            <small className="hint">{hasData ? result.note : ''}</small>
            <button type="button" className="secondary-action" onClick={onDownload} disabled={!hasData || isExporting}>
              {isExporting ? 'Saving…' : 'Download PNG'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
