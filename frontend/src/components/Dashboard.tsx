import type { ChangeEvent, DragEvent } from 'react'
import { DatasetSummary } from '../types'

type Props = {
  summary: DatasetSummary
  onUpload: (file: File) => void
  errorMessage: string
}

export default function Dashboard({ summary, onUpload, errorMessage }: Props) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return
    onUpload(event.target.files[0])
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files.length) {
      onUpload(event.dataTransfer.files[0])
    }
  }

  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Dashboard</p>
        <h2>Upload your dataset</h2>
        <p className="section-copy">
          Load CSV or XLSX data directly in the browser. After upload, edit rows, review statistics, create charts, and export without any server.
        </p>
      </div>

      <div className="upload-box" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
        <p>Drop CSV or XLSX here, or choose a file</p>
        <label className="upload-label">
          Select file
          <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} />
        </label>
      </div>

      {errorMessage ? <p className="warning-text">{errorMessage}</p> : null}

      {summary.rows > 0 ? (
        <div className="summary-grid" style={{ marginTop: '24px' }}>
          <div className="summary-card">
            <strong>{summary.rows.toLocaleString()}</strong>
            <span>Rows loaded</span>
          </div>
          <div className="summary-card">
            <strong>{summary.columns}</strong>
            <span>Columns available</span>
          </div>
          <div className="summary-card">
            <strong>{summary.numericColumns}</strong>
            <span>Numeric columns</span>
          </div>
          <div className="summary-card">
            <strong>{summary.missing}</strong>
            <span>Empty cells</span>
          </div>
          <div className="summary-card">
            <strong>{summary.fileName || 'Current dataset'}</strong>
            <span>Filename</span>
          </div>
          <div className="summary-card">
            <strong>{summary.fileSize || 'N/A'}</strong>
            <span>File size</span>
          </div>
        </div>
      ) : (
        <div className="summary-grid" style={{ marginTop: '24px' }}>
          <div className="summary-card" style={{ gridColumn: 'span 2' }}>
            <strong>Ready to explore</strong>
            <span>Upload a file to start editing data, reviewing statistics, generating visualizations, and exporting results.</span>
          </div>
        </div>
      )}
    </section>
  )
}
