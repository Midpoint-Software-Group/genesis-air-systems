import { NavLink } from 'react-router-dom'

export function SectionNav({ items }) {
  return (
    <div className="flex items-center gap-1 mb-5 border-b border-navy-100 pb-0">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-ember-500 text-ember-600'
                : 'border-transparent text-slate-500 hover:text-navy-900 hover:border-navy-200'
            }`
          }
        >
          {item.icon && <item.icon size={13} />}
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
