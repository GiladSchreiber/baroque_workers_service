import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import styles from './AppShell.module.scss'

export function AppShell() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
