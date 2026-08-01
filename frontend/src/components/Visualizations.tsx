import { RefObject, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  Cell,
} from 'recharts'
import { ChartType, Row } from '../types'

type Props = {
  headers: string[]
  rows: Row[]
  chartType: ChartType
  xAxis: string
  yAxis: string
  color: string
  chartRef: React.RefObject<HTMLDivElement>
  onSetChartType: (type: ChartType) => void
  onSetXAxis: (value: string) => void
  onSetYAxis: (value: string) => void
  onSetColor: (value: string) => void
  chartPreviewReady: boolean
  onGenerateChart: () => void
}

type ChartPoint = {
  name: string
  value: number
  x?: string | number
  y?: number
}

const chartTypes: Array<{ value: ChartType; label: string }> = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'histogram', label: 'Histogram' },
]

export default function Visualizations({
  headers,
  rows,
  chartType,
  xAxis,
  yAxis,
  color,
  chartRef,
  onSetChartType,
  onSetXAxis,
  onSetYAxis,
  onSetColor,
  chartPreviewReady,
  onGenerateChart,
}: Props) {
  const chartData = useMemo(() => {
    if (!xAxis) return [] as ChartPoint[]

    const rawRows = rows.filter((row) => row[xAxis] !== undefined && row[xAxis]?.toString().trim() !== '')

    if (!rawRows.length) return [] as ChartPoint[]

    if (chartType === 'histogram') {
      const values = rawRows
        .map((row) => Number(row[xAxis]))
        .filter((value) => !Number.isNaN(value))
      if (!values.length) return []
      const bucketCount = 8
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min || 1
      const step = range / bucketCount
      const bins = Array.from({ length: bucketCount }, (_, index) => ({
        label: `${(min + step * index).toFixed(1)} - ${(min + step * (index + 1)).toFixed(1)}`,
        count: 0,
      }))
      values.forEach((value) => {
        const index = Math.min(bucketCount - 1, Math.floor((value - min) / step))
        bins[index].count += 1
      })
      return bins.map((bucket) => ({ name: bucket.label, value: bucket.count }))
    }

    const groups = new Map<string, number>()
    rawRows.forEach((row) => {
      const xValue = row[xAxis]?.toString() || 'Unknown'
      const rawY = yAxis && row[yAxis] !== undefined && row[yAxis]?.toString().trim() !== ''
        ? Number(row[yAxis])
        : 1
      const yValue = Number.isFinite(rawY) ? rawY : 1
      groups.set(xValue, (groups.get(xValue) ?? 0) + yValue)
    })

    const entries = Array.from(groups.entries()).map(([name, value]) => ({ name, value }))
    if (chartType === 'pie') {
      const sorted = entries.sort((a, b) => b.value - a.value)
      const top = sorted.slice(0, 8)
      if (sorted.length > 8) {
        const otherValue = sorted.slice(8).reduce((sum, item) => sum + item.value, 0)
        top.push({ name: 'Other', value: otherValue })
      }
      return top
    }

    return entries
  }, [chartType, headers, rows, xAxis, yAxis])

  const chartSupported = headers.length > 0
  const canRenderChart = chartSupported && chartData.length > 0
  const yAxisRequired = chartType !== 'histogram'

  const chartContent = (
    chartType === 'bar' ? (
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="4 4" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill={color} />
      </BarChart>
    ) : chartType === 'line' ? (
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="4 4" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    ) : chartType === 'area' ? (
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.85} />
            <stop offset="95%" stopColor={color} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke={color} fill="url(#areaColor)" />
      </AreaChart>
    ) : chartType === 'pie' ? (
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={80} outerRadius={150} fill={color} label>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${entry.name}-${index}`} fill={color} />
          ))}
        </Pie>
      </PieChart>
    ) : chartType === 'scatter' ? (
      <ScatterChart>
        <CartesianGrid strokeDasharray="4 4" />
        <XAxis dataKey="name" type="category" />
        <YAxis />
        <Tooltip />
        <Scatter data={chartData} fill={color} />
      </ScatterChart>
    ) : (
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="4 4" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill={color} />
      </BarChart>
    )
  )

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Visualizations</p>
        <h2>Build charts from your dataset</h2>
        <p className="section-copy">
          Choose chart type, map columns to axes, and preview your visualization in real time.
        </p>
      </div>

      <div className="chart-toolbar" style={{ marginTop: '20px' }}>
        <label>
          Chart type
          <select value={chartType} onChange={(event) => onSetChartType(event.target.value as ChartType)}>
            {chartTypes.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          X axis
          <select value={xAxis} onChange={(event) => onSetXAxis(event.target.value)}>
            <option value="">Select X</option>
            {headers.map((header) => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </label>
        <label>
          Y axis
          <select value={yAxis} onChange={(event) => onSetYAxis(event.target.value)} disabled={!yAxisRequired}>
            <option value="">Select Y</option>
            {headers.map((header) => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </label>
        <label>
          Accent color
          <input type="color" value={color} onChange={(event) => onSetColor(event.target.value)} />
        </label>
        <button type="button" className="primary-action" onClick={onGenerateChart} style={{ alignSelf: 'end' }}>
          Generate chart
        </button>
      </div>

      <div ref={chartRef} className="chart-wrapper" style={{ marginTop: '24px' }}>
        {canRenderChart && chartPreviewReady ? (
          <div className="chart-preview">
            <ResponsiveContainer width="100%" height={420}>
              {chartContent}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-section" style={{ minHeight: '320px' }}>
            <p>{chartSupported ? 'Pick the columns you want, then click Generate chart to render the visualization.' : 'Upload a dataset to enable chart creation.'}</p>
          </div>
        )}
      </div>
    </section>
  )
}
