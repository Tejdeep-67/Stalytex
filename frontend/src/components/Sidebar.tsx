type SectionKey = 'dashboard' | 'editor' | 'statistics' | 'visualizations' | 'sql' | 'export'

type NavItem = {
  key: SectionKey
  title: string
  description: string
}

const navItems: NavItem[] = [
  { key: 'dashboard', title: 'Dashboard', description: 'Upload and summary' },
  { key: 'editor', title: 'Dataset Editor', description: 'Inspect and edit rows' },
  { key: 'statistics', title: 'Statistics', description: 'Column metrics' },
  { key: 'visualizations', title: 'Visualizations', description: 'Build charts' },
  { key: 'sql', title: 'SQL', description: 'Online compiler' },
  { key: 'export', title: 'Export', description: 'Download your work' },
]

type Props = {
  activeSection: SectionKey
  onSelectSection: (section: SectionKey) => void
}

export default function Sidebar({ activeSection, onSelectSection }: Props) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-circle">S</div>
        <div className="logo-title">
          <strong>Stalytex</strong>
          <span>Analytics Workspace</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === activeSection ? 'active' : ''}
            onClick={() => onSelectSection(item.key)}
          >
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>
          <p className="eyebrow">Workspace</p>
          <p>Modern, browser-only analytics for CSV and XLSX data.</p>
        </div>
      </div>
    </aside>
  )
}
