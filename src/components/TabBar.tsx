import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faChartBar, faUser, faGear } from '@fortawesome/free-solid-svg-icons'

const tabs = [
  { to: '/', label: 'Главная', icon: faHome },
  { to: '/stats', label: 'Статистика', icon: faChartBar },
  { to: '/profile', label: 'Профиль', icon: faUser },
  { to: '/settings', label: 'Настройки', icon: faGear },
]

export default function TabBar() {
  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tab-bar__link">
          <span className="tab-bar__icon"><FontAwesomeIcon icon={tab.icon} /></span>
          <span className="tab-bar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
