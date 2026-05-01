import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from './store/authStore'

export default function App() {
  const refreshCurrentUser = useAuthStore(s => s.refreshCurrentUser)
  useEffect(() => { refreshCurrentUser() }, [])
  return <RouterProvider router={router} />
}
