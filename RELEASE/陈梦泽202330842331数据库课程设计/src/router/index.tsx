import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/merchant/LoginPage'
import MerchantLayout from '@/components/layout/MerchantLayout'
import DashboardPage from '@/pages/merchant/DashboardPage'
import OrdersPage from '@/pages/merchant/OrdersPage'
import CreateOrderPage from '@/pages/merchant/CreateOrderPage'
import ZonesPage from '@/pages/merchant/ZonesPage'
import TrackQueryPage from '@/pages/track/TrackQueryPage'
import TrackingPage from '@/pages/track/TrackingPage'

// 路由守卫组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/merchant/login" replace />
  }
  
  return <>{children}</>
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* 商家端路由 */}
      <Route path="/merchant/login" element={<LoginPage />} />
      
      <Route
        path="/merchant"
        element={
          <ProtectedRoute>
            <MerchantLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<CreateOrderPage />} />
        <Route path="zones" element={<ZonesPage />} />
        <Route index element={<Navigate to="/merchant/dashboard" replace />} />
      </Route>

      {/* 用户端路由（公开访问） */}
      <Route path="/track" element={<TrackQueryPage />} />
      <Route path="/track/:orderNo" element={<TrackingPage />} />

      {/* 默认重定向 */}
      <Route path="/" element={<Navigate to="/merchant/login" replace />} />
      <Route path="*" element={<Navigate to="/merchant/login" replace />} />
    </Routes>
  )
}

export default AppRoutes

