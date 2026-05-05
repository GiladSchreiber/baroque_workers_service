import { createHashRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { MyShiftsPage } from '../pages/employee/MyShiftsPage'
import { ReportShiftPage } from '../pages/employee/ReportShiftPage'
import { EditShiftPage } from '../pages/employee/EditShiftPage'
import { DashboardPage } from '../pages/manager/DashboardPage'
import { AllShiftsPage } from '../pages/manager/AllShiftsPage'
import { EmployeesPage } from '../pages/manager/EmployeesPage'
import { EmployeeFormPage } from '../pages/manager/EmployeeFormPage'
import { EmployeeDetailPage } from '../pages/manager/EmployeeDetailPage'
import { ManagerShiftFormPage } from '../pages/manager/ManagerShiftFormPage'
import { IncomePage } from '../pages/manager/IncomePage'
import { SubmitClosurePage } from '../pages/shared/SubmitClosurePage'
import { ShiftTemplatesPage } from '../pages/manager/scheduling/ShiftTemplatesPage'
import { AvailabilityPage } from '../pages/employee/AvailabilityPage'
function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'employee' | 'manager' }) {
  const currentUser = useAuthStore(s => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  if (role && currentUser.role !== role) {
    return <Navigate to={currentUser.role === 'manager' ? '/manager/dashboard' : '/employee/report'} replace />
  }
  return <>{children}</>
}

function RootRedirect() {
  const currentUser = useAuthStore(s => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={currentUser.role === 'manager' ? '/manager/dashboard' : '/employee/report'} replace />
}

export const router = createHashRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/employee',
    element: <RequireAuth role="employee"><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="report" replace /> },
      { path: 'report', element: <ReportShiftPage /> },
      { path: 'closure', element: <SubmitClosurePage /> },
      { path: 'shifts', element: <MyShiftsPage /> },
      { path: 'shifts/:id/edit', element: <EditShiftPage /> },
      { path: 'scheduling', element: <AvailabilityPage /> },
    ],
  },
  {
    path: '/manager',
    element: <RequireAuth role="manager"><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'shifts', element: <AllShiftsPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/:id', element: <EmployeeDetailPage /> },
      { path: 'employees/:id/edit', element: <EmployeeFormPage /> },
      { path: 'shifts/new', element: <ManagerShiftFormPage /> },
      { path: 'shifts/:id/edit', element: <ManagerShiftFormPage /> },
      { path: 'income', element: <IncomePage /> },
      { path: 'scheduling/templates', element: <ShiftTemplatesPage /> },
    ],
  },
])
