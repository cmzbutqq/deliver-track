import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppRoutes from './router'
import ErrorBoundary from './components/common/ErrorBoundary'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <AntApp>
          <AppRoutes />
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App

