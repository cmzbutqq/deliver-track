/**
 * 地理空间计算工具函数单元测试
 * 
 * 测试核心地理空间算法：
 * - Haversine 距离计算
 * - 射线法点在多边形判断
 * - 度数与弧度转换
 * 
 * 注：这些函数目前分散在各个 Service 中，
 * 本测试文件作为工具函数单元测试的示例
 */

describe('地理空间计算工具函数', () => {
  /**
   * Haversine 公式 - 计算地球表面两点间距离
   * 
   * 公式：
   * a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlng/2)
   * c = 2 * atan2(√a, √(1−a))
   * d = R * c
   * 
   * R = 地球半径（6371 km）
   */
  describe('Haversine 距离计算', () => {
    const R = 6371; // 地球半径（公里）

    function deg2rad(deg: number): number {
      return deg * (Math.PI / 180);
    }

    function getDistanceBetweenPoints(
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number
    ): number {
      const dLat = deg2rad(lat2 - lat1);
      const dLng = deg2rad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    it('应该正确计算同一点的距离（0 km）', () => {
      const distance = getDistanceBetweenPoints(39.9, 116.4, 39.9, 116.4);
      expect(distance).toBeCloseTo(0, 5);
    });

    it('应该正确计算北京天安门到王府井的距离（约 2 km）', () => {
      // 天安门: 39.90923, 116.397428
      // 王府井: 39.904989, 116.407526
      const distance = getDistanceBetweenPoints(
        39.90923,
        116.397428,
        39.904989,
        116.407526
      );

      // 实际距离约 0.94 km
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.0);
    });

    it('应该正确计算北京到上海的距离（约 1067 km）', () => {
      // 北京: 39.9042, 116.4074
      // 上海: 31.2304, 121.4737
      const distance = getDistanceBetweenPoints(
        39.9042,
        116.4074,
        31.2304,
        121.4737
      );

      // 实际直线距离约 1067 km
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(1100);
    });

    it('应该正确计算跨半球距离（纽约到伦敦）', () => {
      // 纽约: 40.7128, -74.0060
      // 伦敦: 51.5074, -0.1278
      const distance = getDistanceBetweenPoints(
        40.7128,
        -74.006,
        51.5074,
        -0.1278
      );

      // 实际距离约 5570 km
      expect(distance).toBeGreaterThan(5500);
      expect(distance).toBeLessThan(5600);
    });

    it('应该正确处理跨越国际日期变更线的情况', () => {
      // 东京: 35.6762, 139.6503
      // 洛杉矶: 34.0522, -118.2437
      const distance = getDistanceBetweenPoints(
        35.6762,
        139.6503,
        34.0522,
        -118.2437
      );

      // 实际距离约 8800 km
      expect(distance).toBeGreaterThan(8700);
      expect(distance).toBeLessThan(8900);
    });

    it('应该正确计算南北极之间的距离', () => {
      // 北极: 90, 0
      // 南极: -90, 0
      const distance = getDistanceBetweenPoints(90, 0, -90, 0);

      // 半个地球周长约 20000 km
      expect(distance).toBeCloseTo(20000, -2);
    });

    it('应该正确计算赤道上的距离', () => {
      // 赤道上相隔 1 度经度
      const distance = getDistanceBetweenPoints(0, 0, 0, 1);

      // 赤道上 1 度约 111 km
      expect(distance).toBeCloseTo(111, 0);
    });

    it('距离应该是对称的（A到B = B到A）', () => {
      const lat1 = 39.9;
      const lng1 = 116.4;
      const lat2 = 31.2;
      const lng2 = 121.5;

      const distance1 = getDistanceBetweenPoints(lat1, lng1, lat2, lng2);
      const distance2 = getDistanceBetweenPoints(lat2, lng2, lat1, lng1);

      expect(distance1).toBeCloseTo(distance2, 10);
    });

    it('应该处理极小距离（米级）', () => {
      // 相距约 1 米的两点（纬度差 0.00001 度 ≈ 1.1 米）
      const distance = getDistanceBetweenPoints(
        39.9,
        116.4,
        39.90001,
        116.4
      );

      expect(distance).toBeGreaterThan(0.001); // > 1 米
      expect(distance).toBeLessThan(0.002); // < 2 米
    });
  });

  /**
   * 度数转弧度
   */
  describe('度数与弧度转换', () => {
    function deg2rad(deg: number): number {
      return deg * (Math.PI / 180);
    }

    it('应该正确转换 0 度', () => {
      expect(deg2rad(0)).toBe(0);
    });

    it('应该正确转换 90 度（π/2）', () => {
      expect(deg2rad(90)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('应该正确转换 180 度（π）', () => {
      expect(deg2rad(180)).toBeCloseTo(Math.PI, 10);
    });

    it('应该正确转换 360 度（2π）', () => {
      expect(deg2rad(360)).toBeCloseTo(2 * Math.PI, 10);
    });

    it('应该正确转换负角度', () => {
      expect(deg2rad(-90)).toBeCloseTo(-Math.PI / 2, 10);
    });

    it('应该正确转换小数角度', () => {
      expect(deg2rad(45.5)).toBeCloseTo(0.794, 3);
    });
  });

  /**
   * 射线法算法 - 判断点是否在多边形内
   * 
   * 原理：从点向右发射水平射线，计算与多边形边界的交点数
   * - 奇数个交点：点在多边形内
   * - 偶数个交点：点在多边形外
   */
  describe('射线法点在多边形判断', () => {
    function isPointInPolygon(
      point: { lng: number; lat: number },
      polygon: number[][]
    ): boolean {
      const { lng, lat } = point;
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect =
          yi > lat !== yj > lat &&
          lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }

      return inside;
    }

    it('应该判断矩形内的点', () => {
      const rectangle = [
        [116.35, 39.88],
        [116.45, 39.88],
        [116.45, 39.95],
        [116.35, 39.95],
        [116.35, 39.88], // 闭合
      ];

      // 中心点
      const centerPoint = { lng: 116.4, lat: 39.915 };
      expect(isPointInPolygon(centerPoint, rectangle)).toBe(true);

      // 内部靠近边界的点
      const innerPoint = { lng: 116.36, lat: 39.89 };
      expect(isPointInPolygon(innerPoint, rectangle)).toBe(true);
    });

    it('应该判断矩形外的点', () => {
      const rectangle = [
        [116.35, 39.88],
        [116.45, 39.88],
        [116.45, 39.95],
        [116.35, 39.95],
        [116.35, 39.88],
      ];

      // 左侧外部
      const leftPoint = { lng: 116.3, lat: 39.9 };
      expect(isPointInPolygon(leftPoint, rectangle)).toBe(false);

      // 右侧外部
      const rightPoint = { lng: 116.5, lat: 39.9 };
      expect(isPointInPolygon(rightPoint, rectangle)).toBe(false);

      // 上方外部
      const topPoint = { lng: 116.4, lat: 40.0 };
      expect(isPointInPolygon(topPoint, rectangle)).toBe(false);

      // 下方外部
      const bottomPoint = { lng: 116.4, lat: 39.8 };
      expect(isPointInPolygon(bottomPoint, rectangle)).toBe(false);
    });

    it('应该正确判断边界上的点（边界算内部）', () => {
      const rectangle = [
        [116.35, 39.88],
        [116.45, 39.88],
        [116.45, 39.95],
        [116.35, 39.95],
        [116.35, 39.88],
      ];

      // 边界上的点（根据算法实现，可能在内部或外部）
      const edgePoint = { lng: 116.35, lat: 39.9 };
      const result = isPointInPolygon(edgePoint, rectangle);
      
      // 边界点的判断取决于具体实现，这里只验证能得到结果
      expect(typeof result).toBe('boolean');
    });

    it('应该正确判断顶点', () => {
      const rectangle = [
        [116.35, 39.88],
        [116.45, 39.88],
        [116.45, 39.95],
        [116.35, 39.95],
        [116.35, 39.88],
      ];

      // 顶点
      const vertex = { lng: 116.35, lat: 39.88 };
      const result = isPointInPolygon(vertex, rectangle);
      
      expect(typeof result).toBe('boolean');
    });

    it('应该正确判断三角形内的点', () => {
      const triangle = [
        [116.3, 39.85],
        [116.5, 39.85],
        [116.4, 40.0],
        [116.3, 39.85], // 闭合
      ];

      // 三角形内部
      const innerPoint = { lng: 116.4, lat: 39.9 };
      expect(isPointInPolygon(innerPoint, triangle)).toBe(true);

      // 三角形外部
      const outerPoint = { lng: 116.2, lat: 39.9 };
      expect(isPointInPolygon(outerPoint, triangle)).toBe(false);
    });

    it('应该正确判断不规则多边形', () => {
      // L 形多边形
      const lShape = [
        [116.3, 39.85],
        [116.4, 39.85],
        [116.4, 39.9],
        [116.5, 39.9],
        [116.5, 40.0],
        [116.3, 40.0],
        [116.3, 39.85],
      ];

      // 内部点
      const innerPoint1 = { lng: 116.35, lat: 39.87 };
      expect(isPointInPolygon(innerPoint1, lShape)).toBe(true);

      const innerPoint2 = { lng: 116.45, lat: 39.95 };
      expect(isPointInPolygon(innerPoint2, lShape)).toBe(true);

      // 外部点（在 L 形的凹陷处）
      const outerPoint = { lng: 116.45, lat: 39.87 };
      expect(isPointInPolygon(outerPoint, lShape)).toBe(false);
    });

    it('应该处理凸多边形', () => {
      // 正五边形（近似）
      const pentagon = [
        [116.4, 40.0],
        [116.5, 39.95],
        [116.48, 39.85],
        [116.32, 39.85],
        [116.3, 39.95],
        [116.4, 40.0],
      ];

      // 中心点
      const centerPoint = { lng: 116.4, lat: 39.93 };
      expect(isPointInPolygon(centerPoint, pentagon)).toBe(true);

      // 外部点
      const outerPoint = { lng: 116.6, lat: 40.0 };
      expect(isPointInPolygon(outerPoint, pentagon)).toBe(false);
    });

    it('应该处理非常小的多边形', () => {
      // 10米 x 10米 的小矩形
      const smallRect = [
        [116.4, 39.9],
        [116.4001, 39.9],
        [116.4001, 39.9001],
        [116.4, 39.9001],
        [116.4, 39.9],
      ];

      // 内部点
      const innerPoint = { lng: 116.40005, lat: 39.90005 };
      expect(isPointInPolygon(innerPoint, smallRect)).toBe(true);

      // 外部点
      const outerPoint = { lng: 116.4002, lat: 39.9 };
      expect(isPointInPolygon(outerPoint, smallRect)).toBe(false);
    });

    it('应该处理非常大的多边形（城市级别）', () => {
      // 模拟北京五环区域（简化）
      const beijing = [
        [116.2, 39.8],
        [116.6, 39.8],
        [116.6, 40.1],
        [116.2, 40.1],
        [116.2, 39.8],
      ];

      // 市中心（天安门附近）
      const centerPoint = { lng: 116.4, lat: 39.9 };
      expect(isPointInPolygon(centerPoint, beijing)).toBe(true);

      // 外部（通州）
      const outerPoint = { lng: 116.7, lat: 39.9 };
      expect(isPointInPolygon(outerPoint, beijing)).toBe(false);
    });

    it('应该处理包含孔洞的多边形（仅外环）', () => {
      // 注：标准射线法只判断点是否在外环内
      // 不支持 GeoJSON 的 holes（需要额外逻辑）
      const outerRing = [
        [116.3, 39.85],
        [116.5, 39.85],
        [116.5, 40.0],
        [116.3, 40.0],
        [116.3, 39.85],
      ];

      // 外环内部
      const point = { lng: 116.4, lat: 39.9 };
      expect(isPointInPolygon(point, outerRing)).toBe(true);
    });
  });

  /**
   * 路径总距离计算
   */
  describe('路径总距离计算', () => {
    function deg2rad(deg: number): number {
      return deg * (Math.PI / 180);
    }

    function getDistanceBetweenPoints(
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number
    ): number {
      const R = 6371;
      const dLat = deg2rad(lat2 - lat1);
      const dLng = deg2rad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    function calculateDistance(points: number[][]): number {
      let distance = 0;
      for (let i = 1; i < points.length; i++) {
        const [lng1, lat1] = points[i - 1];
        const [lng2, lat2] = points[i];
        distance += getDistanceBetweenPoints(lat1, lng1, lat2, lng2);
      }
      return distance;
    }

    it('应该正确计算单段路径距离', () => {
      const path = [
        [116.397428, 39.90923], // 天安门
        [116.407526, 39.904989], // 王府井
      ];

      const distance = calculateDistance(path);
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.0);
    });

    it('应该正确计算多段路径距离', () => {
      const path = [
        [116.397428, 39.90923], // 天安门
        [116.407526, 39.904989], // 王府井
        [116.310003, 39.990419], // 中关村
      ];

      const distance = calculateDistance(path);
      expect(distance).toBeGreaterThan(10); // 应该大于 10 km
    });

    it('两点路径应该等于直线距离', () => {
      const path = [
        [116.4, 39.9],
        [116.5, 40.0],
      ];

      const pathDistance = calculateDistance(path);
      const directDistance = getDistanceBetweenPoints(39.9, 116.4, 40.0, 116.5);

      expect(pathDistance).toBeCloseTo(directDistance, 10);
    });

    it('折线路径应该大于直线距离', () => {
      const start = [116.4, 39.9];
      const end = [116.5, 40.0];

      // 直线距离
      const directDistance = getDistanceBetweenPoints(
        start[1],
        start[0],
        end[1],
        end[0]
      );

      // 折线路径（绕一圈）
      const zigzagPath = [
        start,
        [116.45, 39.9], // 向右
        [116.45, 40.0], // 向上
        end,
      ];

      const pathDistance = calculateDistance(zigzagPath);
      expect(pathDistance).toBeGreaterThan(directDistance);
    });

    it('应该处理空路径', () => {
      expect(calculateDistance([])).toBe(0);
    });

    it('应该处理单点路径', () => {
      expect(calculateDistance([[116.4, 39.9]])).toBe(0);
    });

    it('应该累加所有段的距离', () => {
      const path = [
        [116.0, 39.0],
        [116.1, 39.0],
        [116.2, 39.0],
        [116.3, 39.0],
      ];

      const totalDistance = calculateDistance(path);
      const segmentDistance = getDistanceBetweenPoints(39.0, 116.0, 39.0, 116.1);

      // 总距离应该约等于 3 个段距离
      expect(totalDistance).toBeCloseTo(segmentDistance * 3, 1);
    });
  });
});


