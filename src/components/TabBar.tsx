import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Главная', icon: '◌' },
  { to: '/stats', label: 'Статистика', icon: '▦' },
  { to: '/profile', label: 'Профиль', icon: '⊙' },
  { to: '/settings', label: 'Настройки', icon: '⟡' },
]

export default function TabBar() {
  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tab-bar__link">
          <span className="tab-bar__icon">{tab.icon}</span>
          <span className="tab-bar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
