import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { websocketService } from './services/websocketService'
import './index.css'

// 保存原始的 console 方法
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
}

// 拦截 console 方法，同步输出到后端服务控制台
const interceptConsole = () => {
  const sendToServer = (level: 'log' | 'error' | 'warn' | 'info' | 'debug', ...args: any[]) => {
    // 先输出到浏览器控制台
    originalConsole[level](...args)
    
    // 如果 WebSocket 已连接，发送到后端
    if (websocketService.isConnected()) {
      websocketService.sendConsoleLog(level, args)
    }
  }

  console.log = (...args: any[]) => sendToServer('log', ...args)
  console.error = (...args: any[]) => sendToServer('error', ...args)
  console.warn = (...args: any[]) => sendToServer('warn', ...args)
  console.info = (...args: any[]) => sendToServer('info', ...args)
  console.debug = (...args: any[]) => sendToServer('debug', ...args)
}

// 初始化 WebSocket 连接（用于日志传输）
websocketService.connect()

// 在应用启动前拦截 console
interceptConsole()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

