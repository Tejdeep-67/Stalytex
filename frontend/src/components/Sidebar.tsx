import { useEffect, useRef } from 'react'

export type SectionKey = 'dashboard' | 'editor' | 'statistics' | 'visualizations' | 'sql' | 'export'

type NavItem = {
  key: SectionKey
  title: string
  description: string
}

export const navItems: NavItem[] = [
  { key: 'dashboard', title: 'Dashboard', description: 'Upload and summary' },
  { key: 'editor', title: 'Dataset Editor', description: 'Inspect and edit rows' },
  { key: 'statistics', title: 'Statistics', description: 'Column metrics' },
  { key: 'visualizations', title: 'Visualizations', description: 'Build charts' },
  { key: 'sql', title: 'SQL', description: 'Query with SQLite' },
  { key: 'export', title: 'Export', description: 'Download your work' },
]

type Props = {
  activeSection: SectionKey
  onSelectSection: (section: SectionKey) => void
  open: boolean
  onClose: () => void
  datasetName: string
}

export default function Sidebar({ activeSection, onSelectSection, open, onClose, datasetName }: Props) {
  const panelRef = useRef<HTMLElement>(null)

  // drawer behaviour on small screens: Esc closes it, focus moves into it
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    panelRef.current?.querySelector<HTMLButtonElement>('.sidebar-nav button.active')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [open, onClose])

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside id="sidebar" ref={panelRef} className={`sidebar ${open ? 'open' : ''}`} aria-label="Sections">
        <div className="logo">
          <img className="logo-mark" src="/favicon.svg" width={42} height={42} alt="" />
          <div className="logo-title">
            <strong>Stalytex</strong>
            <span>Analytics Workspace</span>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close menu">×</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeSection ? 'active' : ''}
              aria-current={item.key === activeSection ? 'page' : undefined}
              onClick={() => onSelectSection(item.key)}
            >
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="eyebrow">Workspace</p>
          <p>{datasetName ? <>Working on <b>{datasetName}</b></> : 'Browser-only analytics for CSV and XLSX data.'}</p>
          <small>Your file never leaves this browser.</small>
        </div>
      </aside>
    </>
  )
}
