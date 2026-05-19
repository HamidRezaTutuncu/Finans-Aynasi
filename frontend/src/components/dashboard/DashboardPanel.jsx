import DashboardCards from './DashboardCards'

export default function DashboardPanel({ onNavigate, refreshKey }) {
  return <DashboardCards onNavigate={onNavigate} refreshKey={refreshKey} />
}
