type Props = {
  datasetReady: boolean
  rowCount: number
  columnCount: number
  chartLabel: string
  onDownloadCsv: () => void
  onDownloadXlsx: () => void
  onDownloadChart: () => void
  isExporting: boolean
  onGoToCharts: () => void
}

export default function ExportPanel({
  datasetReady,
  rowCount,
  columnCount,
  chartLabel,
  onDownloadCsv,
  onDownloadXlsx,
  onDownloadChart,
  isExporting,
  onGoToCharts,
}: Props) {
  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Export</p>
        <h2>Download your dataset and visuals</h2>
        <p className="section-copy">
          Exports include your edits. Everything is generated in the browser.
        </p>
      </div>

      {datasetReady ? (
        <div className="export-grid">
          <div className="export-card">
            <div className="export-icon" aria-hidden="true">⇩</div>
            <strong>Data table</strong>
            <span>{rowCount.toLocaleString()} rows · {columnCount} columns. Number columns are saved as real numbers in XLSX.</span>
            <div className="export-actions">
              <button type="button" className="primary-action" onClick={onDownloadCsv}>Export CSV</button>
              <button type="button" className="secondary-action" onClick={onDownloadXlsx}>Export XLSX</button>
            </div>
          </div>
          <div className="export-card">
            <div className="export-icon" aria-hidden="true">▤</div>
            <strong>Current chart</strong>
            <span>Saves the {chartLabel} as a PNG image.</span>
            <div className="export-actions">
              <button type="button" className="primary-action" onClick={onDownloadChart} disabled={isExporting}>
                {isExporting ? 'Saving…' : 'Export PNG'}
              </button>
              <button type="button" className="secondary-action" onClick={onGoToCharts}>Change chart</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-section">
          <p>Upload a dataset on the Dashboard to enable exports.</p>
        </div>
      )}
    </section>
  )
}
