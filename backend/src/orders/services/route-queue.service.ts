import { Injectable } from '@nestjs/common';
import { AmapService } from './amap.service';

interface RouteRequest {
  origin: [number, number];
  destination: [number, number];
  retryCount: number;
  resolve: (result: { points: number[][]; timeArray: number[] }) => void;
  reject: (error: Error) => void;
}

/**
 * 路径生成队列服务
 * 实现高德 API 并发限制：半秒查一单
 * 错误重试：最多3次，失败后回退到直线路径
 */
@Injectable()
export class RouteQueueService {
  private queue: RouteRequest[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly intervalMs = 500; // 半秒

  constructor(private amapService: AmapService) {}

  /**
   * 获取路径（带队列和重试）
   */
  async getRoute(
    origin: [number, number],
    destination: [number, number],
  ): Promise<{ points: number[][]; timeArray: number[] }> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        origin,
        destination,
        retryCount: 0,
        resolve,
        reject,
      });

      this.processQueue();
    });
  }

  /**
   * 处理队列
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) {
        break;
      }

      try {
        const result = await this.fetchRouteWithRetry(
          request.origin,
          request.destination,
          request.retryCount,
        );
        request.resolve(result);
      } catch (error) {
        // 如果重试次数未达到上限，放回队尾
        if (request.retryCount < this.maxRetries) {
          request.retryCount++;
          this.queue.push(request);
        } else {
          // 达到最大重试次数，回退到直线路径
          const fallbackResult = this.interpolateRoute(
            request.origin,
            request.destination,
          );
          request.resolve(fallbackResult);
        }
      }

      // 半秒间隔
      if (this.queue.length > 0) {
        await this.sleep(this.intervalMs);
      }
    }

    this.processing = false;
  }

  /**
   * 获取路径（带重试）
   */
  private async fetchRouteWithRetry(
    origin: [number, number],
    destination: [number, number],
    retryCount: number,
  ): Promise<{ points: number[][]; timeArray: number[] }> {
    const originStr = `${origin[0]},${origin[1]}`;
    const destinationStr = `${destination[0]},${destination[1]}`;
    return await this.amapService.getRoute(originStr, destinationStr);
  }

  /**
   * 直线路径插值（回退方案）
   * 生成直线路径和简单的时间数组（假设平均速度）
   */
  private interpolateRoute(
    origin: [number, number],
    destination: [number, number],
    steps: number = 20,
  ): { points: number[][]; timeArray: number[] } {
    const points: number[][] = [origin];
    const timeArray: number[] = [0];

    // 计算直线距离（公里）
    const R = 6371; // 地球半径
    const dLat = ((destination[1] - origin[1]) * Math.PI) / 180;
    const dLng = ((destination[0] - origin[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin[1] * Math.PI) / 180) *
        Math.cos((destination[1] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // 距离（公里）

    // 假设平均速度60km/h，计算总耗时（秒）
    const avgSpeed = 60; // km/h
    const totalTime = (distance / avgSpeed) * 3600; // 秒

    for (let i = 1; i < steps - 1; i++) {
      const ratio = i / (steps - 1);
      const lng = origin[0] + (destination[0] - origin[0]) * ratio;
      const lat = origin[1] + (destination[1] - origin[1]) * ratio;
      points.push([lng, lat]);
      timeArray.push((totalTime * ratio));
    }

    points.push(destination);
    timeArray.push(totalTime);

    return { points, timeArray };
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

