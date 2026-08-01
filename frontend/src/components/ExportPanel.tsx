type Props = {
  datasetReady: boolean
  onDownloadCsv: () => void
  onDownloadXlsx: () => void
  onDownloadChart: () => void
  chartReady: boolean
}

export default function ExportPanel({ datasetReady, onDownloadCsv, onDownloadXlsx, onDownloadChart, chartReady }: Props) {
  return (
    <section className="panel-card">
      <div className="section-header">
        <p className="eyebrow">Export</p>
        <h2>Download your dataset and visuals</h2>
        <p className="section-copy">
          Export your dataset to CSV or XLSX and capture the current chart as a PNG image. All export actions happen in the browser.
        </p>
      </div>

      {datasetReady ? (
        <div className="export-grid" style={{ marginTop: '24px' }}>
          <div className="summary-card">
            <strong>Download table</strong>
            <span>Export the current dataset as a CSV file.</span>
            <button type="button" className="primary-action" onClick={onDownloadCsv} style={{ marginTop: '16px' }}>
              Export CSV
            </button>
            <button type="button" className="secondary-action" onClick={onDownloadXlsx} style={{ marginTop: '12px' }}>
              Export XLSX
            </button>
          </div>
          <div className="summary-card">
            <strong>Export chart</strong>
            <span>Save the active visualization as a PNG image.</span>
            <button type="button" className="primary-action" onClick={onDownloadChart} disabled={!chartReady} style={{ marginTop: '16px' }}>
              Export PNG
            </button>
            {!chartReady && <p className="warning-text" style={{ marginTop: '12px' }}>Open Visualizations first.</p>}
          </div>
        </div>
      ) : (
        <div className="empty-section" style={{ minHeight: '200px' }}>
          <p>Upload a dataset in the Dashboard to enable exports.</p>
        </div>
      )}
    </section>
  )
}
