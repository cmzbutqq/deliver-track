import { Injectable } from '@nestjs/common';
import { AmapService } from './amap.service';

interface RouteRequest {
  origin: [number, number];
  destination: [number, number];
  retryCount: number;
  resolve: (points: number[][]) => void;
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
  ): Promise<number[][]> {
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
        const points = await this.fetchRouteWithRetry(
          request.origin,
          request.destination,
          request.retryCount,
        );
        request.resolve(points);
      } catch (error) {
        // 如果重试次数未达到上限，放回队尾
        if (request.retryCount < this.maxRetries) {
          request.retryCount++;
          this.queue.push(request);
          console.warn(
            `路径获取失败，重试 ${request.retryCount}/${this.maxRetries}: ${error instanceof Error ? error.message : String(error)}`,
          );
        } else {
          // 达到最大重试次数，回退到直线路径
          console.error(
            `路径获取失败，已重试 ${this.maxRetries} 次，回退到直线路径: ${error instanceof Error ? error.message : String(error)}`,
          );
          const fallbackPoints = this.interpolateRoute(
            request.origin,
            request.destination,
          );
          request.resolve(fallbackPoints);
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
  ): Promise<number[][]> {
    try {
      const originStr = `${origin[0]},${origin[1]}`;
      const destinationStr = `${destination[0]},${destination[1]}`;
      return await this.amapService.getRoute(originStr, destinationStr);
    } catch (error) {
      // 如果是最后一次重试，直接抛出错误
      if (retryCount >= this.maxRetries - 1) {
        throw error;
      }
      // 否则重新抛出，让调用者决定是否重试
      throw error;
    }
  }

  /**
   * 直线路径插值（回退方案）
   */
  private interpolateRoute(
    origin: [number, number],
    destination: [number, number],
    steps: number = 20,
  ): number[][] {
    const points: number[][] = [origin];

    for (let i = 1; i < steps - 1; i++) {
      const ratio = i / (steps - 1);
      const lng = origin[0] + (destination[0] - origin[0]) * ratio;
      const lat = origin[1] + (destination[1] - origin[1]) * ratio;
      points.push([lng, lat]);
    }

    points.push(destination);
    return points;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

