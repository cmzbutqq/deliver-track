import { useEffect, useRef } from 'react'
import { useAmap } from '@/hooks/useAmap'
import { Alert } from 'antd'

interface MapComponentProps {
  id?: string
  center?: [number, number]
  zoom?: number
  plugins?: string[]
  onMapReady?: (map: any, AMap: any) => void
  className?: string
  style?: React.CSSProperties
}

const MapComponent = ({
  id = 'map-container',
  center,
  zoom,
  plugins,
  onMapReady,
  className,
  style,
}: MapComponentProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { map, AMap, loading, error } = useAmap(id, { center, zoom, plugins })

  useEffect(() => {
    if (map && AMap && onMapReady) {
      onMapReady(map, AMap)
    }
  }, [map, AMap, onMapReady])

  if (error) {
    return (
      <div
        ref={containerRef}
        id={id}
        className={className}
        style={{ width: '100%', height: '100%', ...style }}
      >
        <Alert
          message="地图加载失败"
          description={error.message}
          type="error"
          showIcon
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      id={id}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
    >
      {loading && <div style={{ padding: 20, textAlign: 'center' }}>地图加载中...</div>}
    </div>
  )
}

export default MapComponent

