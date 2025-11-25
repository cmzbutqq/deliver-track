import { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { Location } from '../types';

interface MapComponentProps {
  center?: Location;
  zoom?: number;
  markers?: Array<{
    position: Location;
    title?: string;
    icon?: string;
    color?: string;
  }>;
  polylines?: Array<{
    path: number[][];
    color?: string;
    strokeWeight?: number;
  }>;
  polygons?: Array<{
    path: number[][][];
    color?: string;
  }>;
  onMapReady?: (map: any) => void;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    AMap: any;
  }
}

export default function MapComponent({
  center = { lng: 116.397428, lat: 39.90923 },
  zoom = 10,
  markers = [],
  polylines = [],
  polygons = [],
  onMapReady,
  style = { width: '100%', height: '400px' },
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        const AMap = await AMapLoader.load({
          key: import.meta.env.VITE_AMAP_KEY || '',
          securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JSCODE || '',
          version: '2.0',
          plugins: ['AMap.Polyline', 'AMap.Polygon', 'AMap.Marker', 'AMap.ToolBar', 'AMap.Scale', 'AMap.Geolocation', 'AMap.Heatmap'],
          AMapUI: {
            version: '1.1',
          },
        });

        const map = new AMap.Map(mapRef.current, {
          zoom,
          center: [center.lng, center.lat],
          viewMode: '3D',
        });

        // 添加控件
        map.addControl(new AMap.ToolBar());
        map.addControl(new AMap.Scale());

        mapInstanceRef.current = map;
        setLoading(false);

        if (onMapReady) {
          onMapReady(map);
        }
      } catch (error) {
        console.error('地图加载失败:', error);
        setLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时初始化一次，center 和 zoom 的变化由单独的 useEffect 处理

  // 更新标记
  useEffect(() => {
    if (!mapInstanceRef.current || !window.AMap) return;

    // 清除旧标记
    markersRef.current.forEach((marker) => {
      mapInstanceRef.current.remove(marker);
    });
    markersRef.current = [];

    // 添加新标记
    markers.forEach((markerConfig) => {
      const marker = new window.AMap.Marker({
        position: [markerConfig.position.lng, markerConfig.position.lat],
        title: markerConfig.title,
        icon: markerConfig.icon || new window.AMap.Icon({
          size: new window.AMap.Size(32, 32),
          image: markerConfig.color === 'red'
            ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
            : markerConfig.color === 'green'
            ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_g.png'
            : 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
          imageOffset: new window.AMap.Pixel(0, 0),
          imageSize: new window.AMap.Size(32, 32),
        }),
      });
      mapInstanceRef.current.add(marker);
      markersRef.current.push(marker);
    });
  }, [markers]);

  // 更新路径线
  useEffect(() => {
    if (!mapInstanceRef.current || !window.AMap) return;

    // 清除旧路径
    polylinesRef.current.forEach((polyline) => {
      mapInstanceRef.current.remove(polyline);
    });
    polylinesRef.current = [];

    // 添加新路径
    polylines.forEach((polylineConfig) => {
      const polyline = new window.AMap.Polyline({
        path: polylineConfig.path,
        strokeColor: polylineConfig.color || '#3366FF',
        strokeWeight: polylineConfig.strokeWeight || 3,
        strokeOpacity: 0.8,
      });
      mapInstanceRef.current.add(polyline);
      polylinesRef.current.push(polyline);
    });
  }, [polylines]);

  // 更新多边形
  useEffect(() => {
    if (!mapInstanceRef.current || !window.AMap) return;

    // 清除旧多边形
    polygonsRef.current.forEach((polygon) => {
      mapInstanceRef.current.remove(polygon);
    });
    polygonsRef.current = [];

    // 添加新多边形
    polygons.forEach((polygonConfig) => {
      const polygon = new window.AMap.Polygon({
        path: polygonConfig.path,
        strokeColor: polygonConfig.color || '#FF33FF',
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillColor: polygonConfig.color || '#FF33FF',
        fillOpacity: 0.2,
      });
      mapInstanceRef.current.add(polygon);
      polygonsRef.current.push(polygon);
    });
  }, [polygons]);

  // 更新地图中心
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter([center.lng, center.lat]);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  if (loading) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <div ref={mapRef} style={style} />;
}

