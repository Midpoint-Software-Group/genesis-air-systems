import { PageHeader } from '../components/PageHeader'
import { BarChart3, TrendingUp, DollarSign, Users, Wrench } from 'lucide-react'

const reports = [
  { icon: DollarSign, title: 'Revenue Report', desc: 'Track monthly revenue, paid vs outstanding, by service type' },
  { icon: TrendingUp, title: 'Job Performance', desc: 'Completion times, on-time rate, average ticket value' },
  { icon: Users, title: 'Customer Analytics', desc: 'New vs repeat customers, lifetime value, retention rate' },
  { icon: Wrench, title: 'Tech Productivity', desc: 'Jobs per tech, completion times, customer ratings' },
  { icon: BarChart3, title: 'Service Mix', desc: 'Breakdown by service type and customer segment' },
]

export function Reports() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Business intelligence and performance analytics" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map(r => (
          <div key={r.title} className="card p-5 hover:shadow-elevated transition-shadow cursor-pointer">
            <div className="w-10 h-10 rounded bg-navy-50 text-navy-700 flex items-center justify-center mb-3">
              <r.icon size={18} />
            </div>
            <h3 className="font-serif text-base text-navy-900 mb-1">{r.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
            <div className="mt-3 text-[10px] uppercase tracking-wider text-ember-600 font-medium">Coming soon →</div>
          </div>
        ))}
      </div>
    </div>
  )
}
