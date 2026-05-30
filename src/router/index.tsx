import { createHashRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getPrimaryPath, type Role } from '../types'
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
import { ArrangementPage } from '../pages/manager/scheduling/ArrangementPage'
import { AvailabilityPage } from '../pages/employee/AvailabilityPage'
import { ScheduleViewPage } from '../pages/employee/ScheduleViewPage'
import { FillInventoryPage } from '../pages/inventory/FillInventoryPage'
import { DefineInventoryPage } from '../pages/inventory/DefineInventoryPage'
import { OrdersPage } from '../pages/inventory/OrdersPage'
import { PreparationsPage } from '../pages/inventory/PreparationsPage'

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const currentUser = useAuthStore(s => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  if (roles && !roles.some(r => (currentUser.roles ?? []).includes(r))) {
    return <Navigate to={getPrimaryPath(currentUser.roles ?? ['employee'])} replace />
  }
  return <>{children}</>
}

function RootRedirect() {
  const currentUser = useAuthStore(s => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={getPrimaryPath(currentUser.roles ?? ['employee'])} replace />
}

// Shared scheduling children (used by both manager and scheduler)
const schedulingChildren = [
  { path: 'scheduling/arrangement', element: <ArrangementPage /> },
  { path: 'scheduling/templates', element: <ShiftTemplatesPage /> },
  { path: 'scheduling/submit', element: <AvailabilityPage /> },
  { path: 'scheduling/view', element: <ScheduleViewPage /> },
]

export const router = createHashRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/employee',
    element: <RequireAuth roles={['employee', 'duty']}><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="report" replace /> },
      { path: 'report', element: <ReportShiftPage /> },
      { path: 'closure', element: <SubmitClosurePage /> },
      { path: 'shifts', element: <MyShiftsPage /> },
      { path: 'shifts/:id/edit', element: <EditShiftPage /> },
      { path: 'scheduling', element: <AvailabilityPage /> },
      { path: 'scheduling/view', element: <ScheduleViewPage /> },
      { path: 'inventory', element: <Navigate to="/employee/inventory/fill" replace /> },
      { path: 'inventory/fill', element: <FillInventoryPage /> },
      { path: 'inventory/preparations', element: <PreparationsPage /> },
    ],
  },
  {
    path: '/kitchen',
    element: <RequireAuth roles={['kitchen']}><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="report" replace /> },
      { path: 'report', element: <ReportShiftPage /> },
      { path: 'closure', element: <SubmitClosurePage /> },
      { path: 'shifts', element: <MyShiftsPage /> },
      { path: 'shifts/:id/edit', element: <EditShiftPage /> },
      { path: 'scheduling', element: <AvailabilityPage /> },
      { path: 'scheduling/view', element: <ScheduleViewPage /> },
      { path: 'inventory', element: <Navigate to="/kitchen/inventory/fill" replace /> },
      { path: 'inventory/fill', element: <FillInventoryPage isKitchen /> },
      { path: 'inventory/preparations', element: <PreparationsPage isKitchen /> },
      { path: 'inventory/define', element: <DefineInventoryPage /> },
      { path: 'inventory/orders', element: <OrdersPage /> },
    ],
  },
  {
    path: '/scheduler',
    element: <RequireAuth roles={['scheduler']}><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/scheduler/scheduling/arrangement" replace /> },
      { path: 'scheduling', element: <Navigate to="/scheduler/scheduling/arrangement" replace /> },
      { path: 'report', element: <ReportShiftPage /> },
      { path: 'closure', element: <SubmitClosurePage /> },
      { path: 'shifts', element: <MyShiftsPage /> },
      { path: 'shifts/:id/edit', element: <EditShiftPage /> },
      { path: 'inventory', element: <Navigate to="/scheduler/inventory/fill" replace /> },
      { path: 'inventory/fill', element: <FillInventoryPage /> },
      { path: 'inventory/preparations', element: <PreparationsPage /> },
      ...schedulingChildren,
    ],
  },
  {
    path: '/manager',
    element: <RequireAuth roles={['manager']}><AppShell /></RequireAuth>,
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
      { path: 'scheduling', element: <Navigate to="/manager/scheduling/arrangement" replace /> },
      ...schedulingChildren,
    ],
  },
])
