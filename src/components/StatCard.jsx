export function StatCard({ label, value, sub, warning = false, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="stat-label">{label}</div>
        {Icon && <Icon size={14} className="text-slate-400" />}
      </div>
      <div className="stat-value">{value}</div>
      {sub && (
        <div className={warning ? 'stat-delta-warn' : 'stat-delta'}>
          {sub}
        </div>
      )}
    </div>
  )
}
