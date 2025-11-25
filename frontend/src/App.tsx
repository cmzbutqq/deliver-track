import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';

// 商家端页面
import LoginPage from './pages/merchant/LoginPage';
import DashboardPage from './pages/merchant/DashboardPage';
import OrdersPage from './pages/merchant/OrdersPage';
import CreateOrderPage from './pages/merchant/CreateOrderPage';
import ZonesPage from './pages/merchant/ZonesPage';
import Layout from './components/Layout';

// 用户端页面
import TrackPage from './pages/track/TrackPage';
import TrackingPage from './pages/track/TrackingPage';

// 路由守卫
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/merchant/login" replace />;
};

function App() {
  const { theme: currentTheme } = useThemeStore();

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
          {/* 商家端路由 */}
          <Route path="/merchant/login" element={<LoginPage />} />
          <Route
            path="/merchant/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchant/orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrdersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchant/orders/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateOrderPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchant/zones"
            element={
              <ProtectedRoute>
                <Layout>
                  <ZonesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* 用户端路由 */}
          <Route path="/track" element={<TrackPage />} />
          <Route path="/track/:orderNo" element={<TrackingPage />} />

          {/* 默认重定向 */}
          <Route path="/" element={<Navigate to="/merchant/login" replace />} />
          <Route path="*" element={<Navigate to="/merchant/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
