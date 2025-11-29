// 车辆平滑移动动画工具函数

export const moveSmoothly = (
  marker: any,
  from: [number, number],
  to: [number, number],
  duration: number = 2000
) => {
  const startTime = Date.now()
  const [fromLng, fromLat] = from
  const [toLng, toLat] = to

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // ease-in-out 缓动函数
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const currentLng = fromLng + (toLng - fromLng) * ease
    const currentLat = fromLat + (toLat - fromLat) * ease

    marker.setPosition([currentLng, currentLat])

    // 自动旋转朝向移动方向
    if (progress < 1) {
      const angle = Math.atan2(toLat - fromLat, toLng - fromLng) * 180 / Math.PI
      marker.setAngle(angle)
    }

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}

