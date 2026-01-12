import { Injectable } from '@nestjs/common';
import { RouteQueueService } from './route-queue.service';

interface OrderWithDestination {
  id: string;
  destination: { lng: number; lat: number };
  origin?: { lng: number; lat: number };
  logistics?: string;
}

interface RouteInfo {
  points: number[][];
  timeArray: number[];
  estimatedTimeSeconds: number;
}

/**
 * 多点配送路径规划服务
 * 实现订单聚类（R=100km）和最近邻路径规划
 */
@Injectable()
export class MultiRoutePlannerService {
  private readonly CLUSTER_RADIUS_KM = 100; // 预设半径 100km
  private readonly COORDINATE_TOLERANCE = 0.0001; // 坐标匹配容差

  constructor(private routeQueueService: RouteQueueService) {}

  /**
   * 计算两点之间的距离（公里）
   * 使用 Haversine 公式
   */
  private getDistanceBetweenPoints(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // 地球半径（公里）
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * 验证坐标有效性
   */
  private validateCoordinate(coord: { lng: number; lat: number }): boolean {
    if (
      !coord ||
      typeof coord.lng !== 'number' ||
      typeof coord.lat !== 'number' ||
      isNaN(coord.lng) ||
      isNaN(coord.lat) ||
      !isFinite(coord.lng) ||
      !isFinite(coord.lat)
    ) {
      return false;
    }
    // 中国大致范围：经度 73-135，纬度 18-54
    return coord.lng >= 73 && coord.lng <= 135 && coord.lat >= 18 && coord.lat <= 54;
  }

  /**
   * 订单聚类（贪心算法，R=100km）
   */
  clusterOrders(
    orders: OrderWithDestination[],
    origin: { lng: number; lat: number },
  ): OrderWithDestination[][] {
    const clusters: OrderWithDestination[][] = [];
    const unassigned = [...orders];

    while (unassigned.length > 0) {
      // 选择第一个未分配订单作为种子点
      const seed = unassigned.shift()!;
      const cluster: OrderWithDestination[] = [seed];

      // 找出距离种子点 ≤ 100km 的所有未分配订单
      for (let i = unassigned.length - 1; i >= 0; i--) {
        const order = unassigned[i];
        const distance = this.getDistanceBetweenPoints(
          seed.destination.lat,
          seed.destination.lng,
          order.destination.lat,
          order.destination.lng,
        );

        if (distance <= this.CLUSTER_RADIUS_KM) {
          cluster.push(order);
          unassigned.splice(i, 1);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * 簇内路径排序（最近邻算法）
   */
  sortOrdersInCluster(
    cluster: OrderWithDestination[],
    origin: { lng: number; lat: number },
  ): OrderWithDestination[] {
    const path: OrderWithDestination[] = [];
    const unvisited = [...cluster];
    let current = origin;

    while (unvisited.length > 0) {
      let minDistance = Infinity;
      let nearestIndex = -1;

      // 找到距离当前点最近的未访问订单
      for (let i = 0; i < unvisited.length; i++) {
        const order = unvisited[i];
        const distance = this.getDistanceBetweenPoints(
          current.lat,
          current.lng,
          order.destination.lat,
          order.destination.lng,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      if (nearestIndex >= 0) {
        const nearest = unvisited.splice(nearestIndex, 1)[0];
        path.push(nearest);
        current = nearest.destination;
      }
    }

    return path;
  }

  /**
   * 生成连续路径（拼接多段路径）
   */
  async generateMultiRoute(
    sortedOrders: OrderWithDestination[],
    origin: { lng: number; lat: number },
    speed: number,
    factor: number,
  ): Promise<{ points: number[][]; timeArray: number[] }> {
    const allPoints: number[][] = [];
    const allTimeArray: number[] = [];
    let cumulativeTime = 0;

    for (let i = 0; i < sortedOrders.length; i++) {
      const order = sortedOrders[i];
      const segmentOrigin =
        i === 0
          ? origin
          : sortedOrders[i - 1].destination;
      const segmentDestination = order.destination;

      // 获取路径段
      const routeResult = await this.routeQueueService.getRoute(
        [segmentOrigin.lng, segmentOrigin.lat],
        [segmentDestination.lng, segmentDestination.lat],
      );

      // 验证路径结果
      if (
        !routeResult ||
        !Array.isArray(routeResult.points) ||
        routeResult.points.length === 0 ||
        !Array.isArray(routeResult.timeArray) ||
        routeResult.timeArray.length !== routeResult.points.length
      ) {
        throw new Error(
          `路径段无效: 起点=[${segmentOrigin.lng}, ${segmentOrigin.lat}], 终点=[${segmentDestination.lng}, ${segmentDestination.lat}]`,
        );
      }

      // 拼接路径点
      if (i === 0) {
        // 第一段：保留所有点
        allPoints.push(...routeResult.points);
        allTimeArray.push(...routeResult.timeArray);
      } else {
        // 后续段：跳过第一个点（避免重复）
        allPoints.push(...routeResult.points.slice(1));
        // 时间数组累加
        const segmentTimes = routeResult.timeArray.slice(1);
        for (const time of segmentTimes) {
          allTimeArray.push(cumulativeTime + time);
        }
      }

      // 更新累计时间
      const lastTime = routeResult.timeArray[routeResult.timeArray.length - 1];
      cumulativeTime += lastTime;
    }

    // 应用速度系数和随机因子
    const t_esti = allTimeArray.map((t) => t / speed);
    const t_real = t_esti.map((t) => t * factor);

    return { points: allPoints, timeArray: t_real };
  }

  /**
   * 为订单提取从起点到终点的路径段
   */
  extractOrderRoute(
    fullRoute: { points: number[][]; timeArray: number[] },
    orderDestination: { lng: number; lat: number },
  ): RouteInfo {
    const { points, timeArray } = fullRoute;

    // 在完整路径中查找订单 destination 的索引
    let targetIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const distance = this.getDistanceBetweenPoints(
        orderDestination.lat,
        orderDestination.lng,
        point[1],
        point[0],
      );

      if (distance < minDistance) {
        minDistance = distance;
        targetIndex = i;
      }
    }

    if (targetIndex < 0) {
      throw new Error('无法在路径中找到订单终点');
    }

    // 验证最后一个点是否接近订单 destination
    const lastPoint = points[targetIndex];
    const distanceToDestination = this.getDistanceBetweenPoints(
      orderDestination.lat,
      orderDestination.lng,
      lastPoint[1],
      lastPoint[0],
    );

    if (distanceToDestination > this.CLUSTER_RADIUS_KM) {
      // 如果距离太远，使用最近的点，但记录警告
      console.warn(
        `订单终点距离路径点较远: ${distanceToDestination.toFixed(2)}km`,
      );
    }

    // 提取从起点到目标索引的路径
    const orderPoints = points.slice(0, targetIndex + 1);
    const orderTimeArray = timeArray.slice(0, targetIndex + 1);

    return {
      points: orderPoints,
      timeArray: orderTimeArray,
      estimatedTimeSeconds: orderTimeArray[orderTimeArray.length - 1],
    };
  }

  /**
   * 为多个订单规划路径（主方法）
   */
  async planRoutesForOrders(
    orders: Array<{
      id: string;
      origin: any;
      destination: any;
      logistics: string;
    }>,
    logisticsCompaniesService: any,
  ): Promise<Map<string, RouteInfo>> {
    if (orders.length === 0) {
      return new Map();
    }

    // 验证所有订单的坐标
    const validOrders: OrderWithDestination[] = [];
    for (const order of orders) {
      if (
        !this.validateCoordinate(order.origin) ||
        !this.validateCoordinate(order.destination)
      ) {
        throw new Error(
          `订单 ${order.id} 的坐标无效: origin=${JSON.stringify(order.origin)}, destination=${JSON.stringify(order.destination)}`,
        );
      }
      validOrders.push({
        id: order.id,
        origin: order.origin,
        destination: order.destination,
        logistics: order.logistics,
      });
    }

    // 提取统一起点（所有订单起点相同）
    const origin = validOrders[0].origin!;

    // 订单聚类
    const clusters = this.clusterOrders(validOrders, origin);

    // 为每个簇规划路径
    const routeMap = new Map<string, RouteInfo>();

    for (const cluster of clusters) {
      // 簇内路径排序
      const sortedOrders = this.sortOrdersInCluster(cluster, origin);

      // 获取物流公司 speed（使用簇内第一个订单的 logistics）
      const logisticsCompany = await logisticsCompaniesService.findByName(
        sortedOrders[0].logistics || '顺丰速运',
      );
      if (!logisticsCompany) {
        throw new Error(
          `物流公司 ${sortedOrders[0].logistics} 不存在`,
        );
      }
      const speed = logisticsCompany.speed;
      if (!speed || speed <= 0 || speed > 1) {
        throw new Error(
          `物流公司 ${sortedOrders[0].logistics} 的speed系数无效: ${speed}`,
        );
      }

      // 生成随机因子
      const factor = 0.85 + Math.random() * (1.2 - 0.85);

      // 生成完整路径
      const fullRoute = await this.generateMultiRoute(
        sortedOrders,
        origin,
        speed,
        factor,
      );

      // 为每个订单提取路径
      for (const order of sortedOrders) {
        const orderRoute = this.extractOrderRoute(
          fullRoute,
          order.destination,
        );
        routeMap.set(order.id, orderRoute);
      }
    }

    return routeMap;
  }
}
