import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import styles from './BottomNav.module.scss'

const EMPLOYEE_LINKS = [
  { to: '/employee/profile', label: 'פרופיל', icon: <ProfileIcon /> },
  { to: '/employee/shifts', label: 'שעות', icon: <ShiftsIcon /> },
  { to: '/employee/report', label: 'דיווח', icon: <PlusIcon /> },
]

const MANAGER_LINKS = [
  { to: '/manager/profile', label: 'פרופיל', icon: <ProfileIcon /> },
  { to: '/manager/employees', label: 'צוות', icon: <TeamIcon /> },
  { to: '/manager/shifts', label: 'שעות', icon: <ShiftsIcon /> },
  { to: '/manager/income', label: 'הכנסות', icon: <ClosureIcon /> },
  { to: '/manager/dashboard', label: 'דשבורד', icon: <DashboardIcon /> },
]

export function BottomNav() {
  const role = useAuthStore(s => s.currentUser?.role)
  const links = role === 'manager' ? MANAGER_LINKS : EMPLOYEE_LINKS

  return (
    <nav className={styles.nav}>
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            [styles.link, isActive ? styles.active : ''].join(' ')
          }
        >
          <span className={styles.icon}>{link.icon}</span>
          <span className={styles.label}>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function ShiftsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M7 3v4M15 3v4M3 9h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M11 7v8M7 11h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M4 18c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="12" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function ClosureIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="8" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M7 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="11" cy="13.5" r="1.5" fill="currentColor"/>
    </svg>
  )
}

function TeamIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M2 18c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M15 6a3 3 0 010 6M18 18c0-2.761-2-5-4.5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}
