import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-navy-50 flex items-center justify-center mb-4">
        <Icon size={24} className="text-navy-400" />
      </div>
      <h3 className="font-serif text-lg text-navy-900 mb-2">{title}</h3>
      {message && <p className="text-sm text-slate-500 max-w-sm mb-4">{message}</p>}
      {action}
    </div>
  )
}
