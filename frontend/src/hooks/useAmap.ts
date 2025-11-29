import { useEffect, useState, useRef } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

interface UseAmapOptions {
  center?: [number, number]
  zoom?: number
  plugins?: string[]
}

export const useAmap = (containerId: string, options: UseAmapOptions = {}) => {
  const [map, setMap] = useState<any>(null)
  const [AMap, setAMap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    // 延迟初始化，确保 DOM 已渲染
    const initTimer = setTimeout(() => {
      const initMap = async () => {
        if (!isMountedRef.current) return

        const container = document.getElementById(containerId)
        if (!container) {
          const err = new Error(`地图容器不存在: #${containerId}. 请确保组件已挂载且容器ID正确。当前 DOM 中所有 ID: ${Array.from(document.querySelectorAll('[id]')).map(el => el.id).join(', ')}`)
          console.error(err.message)
          if (isMountedRef.current) {
            setError(err)
            setLoading(false)
          }
          throw err
        }

        if (!import.meta.env.VITE_AMAP_KEY) {
          const err = new Error('缺少高德地图 API Key: 请在 .env 文件中配置 VITE_AMAP_KEY')
          console.error(err.message)
          if (isMountedRef.current) {
            setError(err)
            setLoading(false)
          }
          throw err
        }

        // 配置高德地图安全密钥（必须在加载 API 之前配置）
        // 自 2021年12月2日起，高德地图要求所有新申请的 API Key 必须配置安全密钥
        if (import.meta.env.VITE_AMAP_SECURITY_JSCODE) {
          (window as any)._AMapSecurityConfig = {
            securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JSCODE,
          }
        } else {
          console.warn('未配置高德地图安全密钥 (VITE_AMAP_SECURITY_JSCODE)，可能导致逆地理编码等服务失败')
        }

        try {
          const AMapInstance = await AMapLoader.load({
            key: import.meta.env.VITE_AMAP_KEY,
            version: '2.0',
            plugins: options.plugins || [],
            AMapUI: {
              version: '1.1',
            },
            Loca: {
              version: '2.0',
            },
          })

          if (!isMountedRef.current) {
            return
          }

          // 再次检查容器是否存在
          const containerCheck = document.getElementById(containerId)
          if (!containerCheck) {
            const err = new Error(`地图容器在初始化过程中被移除: #${containerId}`)
            console.error(err.message)
            if (isMountedRef.current) {
              setError(err)
              setLoading(false)
            }
            throw err
          }

          const mapInstance = new AMapInstance.Map(containerId, {
            viewMode: '3D',
            zoom: options.zoom || 10,
            center: options.center || [116.397428, 39.90923],
            mapStyle: 'amap://styles/normal',
          })

          if (isMountedRef.current) {
            mapInstanceRef.current = mapInstance
            setMap(mapInstance)
            setAMap(AMapInstance)
            setLoading(false)
            setError(null)
          } else {
            // 组件已卸载，清理地图
            mapInstance.destroy()
          }
        } catch (loadError: any) {
          const errorMessage = loadError?.message || String(loadError) || '未知错误'
          const errorStack = loadError?.stack || ''
          const fullError = new Error(`高德地图加载失败: ${errorMessage}${errorStack ? `\n堆栈: ${errorStack}` : ''}`)
          console.error(fullError.message)
          if (isMountedRef.current) {
            setError(fullError)
            setLoading(false)
          }
          throw fullError
        }
      }

      initMap()
    }, 100) // 延迟 100ms 确保 DOM 已渲染

    return () => {
      isMountedRef.current = false
      clearTimeout(initTimer)
      
      if (mapInstanceRef.current) {
        // 先清理所有覆盖物
        mapInstanceRef.current.clearMap()
        
        // 检查容器是否还在 DOM 中
        const container = document.getElementById(containerId)
        if (container && container.parentNode) {
          // 容器还在，安全销毁
          mapInstanceRef.current.destroy()
        } else {
          // 容器已不在 DOM 中，只清理引用，不调用 destroy
          console.warn(`地图容器 #${containerId} 已不在 DOM 中，跳过 destroy 调用`)
        }
        mapInstanceRef.current = null
      }
    }
  }, [containerId])

  return { map, AMap, loading, error }
}

