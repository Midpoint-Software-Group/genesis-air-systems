export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-end justify-between mb-6 pb-4 border-b border-navy-100">
      <div>
        <h1 className="font-serif text-2xl text-navy-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
