// 车辆平滑移动动画工具函数
import { createVehicleIcon } from './mapUtils'

export const moveSmoothly = (
  marker: any,
  from: [number, number],
  to: [number, number],
  duration: number = 2000,
  targetAngle?: number,
  AMap?: any
) => {
  // 验证坐标有效性
  const isValidCoordinate = (lng: number, lat: number): boolean => {
    return typeof lng === 'number' && typeof lat === 'number' &&
           !isNaN(lng) && !isNaN(lat) &&
           isFinite(lng) && isFinite(lat)
  }

  const [fromLng, fromLat] = from
  const [toLng, toLat] = to

  // 如果坐标无效，直接设置目标位置，不执行动画
  if (!isValidCoordinate(fromLng, fromLat) || !isValidCoordinate(toLng, toLat)) {
    console.warn('moveSmoothly: 坐标无效，直接设置目标位置', { from, to })
    if (isValidCoordinate(toLng, toLat)) {
      try {
        marker.setPosition([toLng, toLat])
      } catch (error) {
        console.error('moveSmoothly: 设置位置失败', error)
      }
    }
    return
  }

  const startTime = Date.now()
  
  // 计算起始角度（如果提供了目标角度，则从当前位置计算起始角度）
  let startAngle = 0
  if (targetAngle !== undefined && AMap) {
    // 计算从 from 到 to 的角度作为起始角度
    const deltaLng = toLng - fromLng
    const deltaLat = toLat - fromLat
    if (Math.abs(deltaLng) > 0.0001 || Math.abs(deltaLat) > 0.0001) {
      const fromLatRad = (fromLat * Math.PI) / 180
      const toLatRad = (toLat * Math.PI) / 180
      const deltaLngRad = (deltaLng * Math.PI) / 180
      const x = Math.sin(deltaLngRad) * Math.cos(toLatRad)
      const y = Math.cos(fromLatRad) * Math.sin(toLatRad) - 
                Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLngRad)
      const bearingRad = Math.atan2(x, y)
      startAngle = ((bearingRad * 180) / Math.PI + 360) % 360
    } else {
      startAngle = targetAngle
    }
  }

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // ease-in-out 缓动函数
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const currentLng = fromLng + (toLng - fromLng) * ease
    const currentLat = fromLat + (toLat - fromLat) * ease

    // 再次验证计算后的坐标
    if (isValidCoordinate(currentLng, currentLat)) {
      try {
        marker.setPosition([currentLng, currentLat])
        
        // 如果提供了目标角度和 AMap，更新图标角度
        if (targetAngle !== undefined && AMap) {
          // 计算当前角度（从起始角度平滑过渡到目标角度）
          let currentAngle = startAngle
          if (Math.abs(targetAngle - startAngle) > 180) {
            // 处理角度跨越 0/360 度的情况
            if (targetAngle > startAngle) {
              currentAngle = startAngle + (targetAngle - startAngle - 360) * ease
            } else {
              currentAngle = startAngle + (targetAngle - startAngle + 360) * ease
            }
          } else {
            currentAngle = startAngle + (targetAngle - startAngle) * ease
          }
          currentAngle = (currentAngle + 360) % 360
          
          // 更新图标（需要重新创建图标）
          try {
            marker.setIcon(createVehicleIcon(AMap, currentAngle))
          } catch (iconError) {
            console.warn('更新车辆图标角度失败:', iconError)
          }
        }
      } catch (error) {
        console.error('moveSmoothly: 设置动画位置失败', error)
        return
      }
    } else {
      console.warn('moveSmoothly: 计算出的坐标无效，停止动画', { currentLng, currentLat })
      return
    }

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      // 动画结束时，确保角度设置为目标角度
      if (targetAngle !== undefined && AMap) {
        try {
          marker.setIcon(createVehicleIcon(AMap, targetAngle))
        } catch (iconError) {
          console.warn('设置最终车辆图标角度失败:', iconError)
        }
      }
    }
  }

  requestAnimationFrame(animate)
}

