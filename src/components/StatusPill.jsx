const statusMap = {
  active: { className: 'pill-active', label: 'Active' },
  in_progress: { className: 'pill-active', label: 'In Progress' },
  en_route: { className: 'pill-enroute', label: 'En Route' },
  unassigned: { className: 'pill-unassigned', label: 'Unassigned' },
  scheduled: { className: 'pill-scheduled', label: 'Scheduled' },
  completed: { className: 'pill-done', label: 'Completed' },
  done: { className: 'pill-done', label: 'Done' },
  urgent: { className: 'pill-urgent', label: 'Urgent' },
  cancelled: { className: 'pill-done', label: 'Cancelled' },
  paid: { className: 'pill-active', label: 'Paid' },
  overdue: { className: 'pill-urgent', label: 'Overdue' },
  pending: { className: 'pill-enroute', label: 'Pending' },
  draft: { className: 'pill-unassigned', label: 'Draft' },
  sent: { className: 'pill-scheduled', label: 'Sent' },
  approved: { className: 'pill-active', label: 'Approved' },
  declined: { className: 'pill-urgent', label: 'Declined' },
}

export function StatusPill({ status }) {
  const config = statusMap[status?.toLowerCase()] || { className: 'pill-unassigned', label: status }
  return <span className={`pill ${config.className}`}>{config.label}</span>
}
