import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { DatasetSummary } from '../types'

type Props = {
  summary: DatasetSummary
  onUpload: (file: File) => Promise<void>
  onLoadSample: () => Promise<void>
  errorMessage: string
  isLoading: boolean
  onGoTo: (section: 'editor' | 'statistics' | 'visualizations' | 'sql') => void
}

export default function Dashboard({ summary, onUpload, onLoadSample, errorMessage, isLoading, onGoTo }: Props) {
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    await onUpload(file)
    // reset so choosing the same file again still fires onChange
    input.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void onUpload(file)
  }

  const missingShare = summary.rows && summary.columns ? (summary.missing / (summary.rows * summary.columns)) * 100 : 0

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Dashboard</p>
        <h2>Upload your dataset</h2>
        <p className="section-copy">
          Load a CSV or Excel file. Everything runs in your browser, so the file is never uploaded anywhere.
        </p>
      </div>

      <div
        className={`upload-box ${dragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragLeave={() => {
          dragDepth.current -= 1
          if (dragDepth.current <= 0) setDragging(false)
        }}
      >
        <div className="upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 20h14" />
          </svg>
        </div>
        {isLoading ? (
          <p className="upload-text">Reading file…</p>
        ) : (
          <p className="upload-text">{dragging ? 'Drop it here' : 'Drag a CSV or XLSX file here'}</p>
        )}
        <div className="upload-actions">
          <label className="upload-label">
            Choose file
            <input type="file" accept=".csv,.xls,.xlsx,text/csv" onChange={handleFileChange} disabled={isLoading} />
          </label>
          <button type="button" className="secondary-action" onClick={() => void onLoadSample()} disabled={isLoading}>
            Try sample data
          </button>
        </div>
      </div>

      {errorMessage ? <p className="warning-text" role="alert">{errorMessage}</p> : null}

      {summary.rows > 0 ? (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <strong>{summary.rows.toLocaleString()}</strong>
              <span>Rows</span>
            </div>
            <div className="summary-card">
              <strong>{summary.columns}</strong>
              <span>Columns</span>
            </div>
            <div className="summary-card">
              <strong>{summary.numericColumns}</strong>
              <span>Number columns</span>
            </div>
            <div className="summary-card">
              <strong>{summary.missing.toLocaleString()}</strong>
              <span>Empty cells ({missingShare.toFixed(1)}%)</span>
            </div>
            <div className="summary-card wide">
              <strong title={summary.fileName}>{summary.fileName || 'Current dataset'}</strong>
              <span>{summary.fileSize || 'File'}</span>
            </div>
          </div>
          <div className="quick-links">
            <span>Next:</span>
            <button type="button" onClick={() => onGoTo('editor')}>Edit rows</button>
            <button type="button" onClick={() => onGoTo('statistics')}>See statistics</button>
            <button type="button" onClick={() => onGoTo('visualizations')}>Make a chart</button>
            <button type="button" onClick={() => onGoTo('sql')}>Write SQL</button>
          </div>
        </>
      ) : (
        <div className="empty-section">
          <p>No dataset yet. Upload a file or try the sample sales data to see how it works.</p>
        </div>
      )}
    </section>
  )
}
