import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AmapService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://restapi.amap.com/v3';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AMAP_KEY');
  }

  async getRoute(origin: string, destination: string): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('高德地图 API Key 未配置');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/direction/driving`, {
        params: {
          key: this.apiKey,
          origin,
          destination,
          extensions: 'all',
        },
      });

      if (response.data.status !== '1') {
        throw new Error(`高德地图 API 错误: ${response.data.info}`);
      }

      const route = response.data.route;
      if (!route || !route.paths || route.paths.length === 0) {
        throw new Error('未找到路径');
      }

      // 提取路径点
      const path = route.paths[0];
      const points: number[][] = [];

      for (const step of path.steps) {
        if (step.polyline) {
          const polylinePoints = step.polyline.split(';');
          for (const point of polylinePoints) {
            const [lng, lat] = point.split(',').map(Number);
            points.push([lng, lat]);
          }
        }
      }

      // 如果点太多，进行采样（保留每 N 个点）
      const sampledPoints = this.samplePoints(points, 50);
      return sampledPoints;
    } catch (error) {
      throw new Error(`获取路径失败: ${error.message}`);
    }
  }

  private samplePoints(points: number[][], maxPoints: number): number[][] {
    if (points.length <= maxPoints) {
      return points;
    }

    const sampledPoints: number[][] = [points[0]]; // 始终保留起点
    const step = Math.floor(points.length / (maxPoints - 1));

    for (let i = step; i < points.length - 1; i += step) {
      sampledPoints.push(points[i]);
    }

    sampledPoints.push(points[points.length - 1]); // 始终保留终点
    return sampledPoints;
  }
}

