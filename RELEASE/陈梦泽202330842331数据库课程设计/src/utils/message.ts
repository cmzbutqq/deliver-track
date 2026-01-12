// 全局 message 实例，用于非组件环境（如 API 拦截器）
import { message } from 'antd'

// 导出 message 实例，在 App 组件外也可以使用
// 虽然会有警告，但功能正常
export { message }

