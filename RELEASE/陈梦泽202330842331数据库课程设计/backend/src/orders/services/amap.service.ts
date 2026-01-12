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

  async getRoute(origin: string, destination: string): Promise<{ points: number[][]; timeArray: number[] }> {
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

      // 提取路径点和时间信息
      const path = route.paths[0];
      const points: number[][] = [];
      const timeArray: number[] = [0]; // t0[0] = 0
      let cumulativeTime = 0; // 累计耗时（秒）

      for (const step of path.steps) {
        // 获取当前步骤的耗时（秒）
        const stepDuration = step.duration ? Number(step.duration) : 0;
        
        if (step.polyline) {
          const polylinePoints = step.polyline.split(';');
          const pointsInStep = polylinePoints.length;
          
          // 如果步骤有多个点，将耗时平均分配到每个点
          const timePerPoint = pointsInStep > 0 ? stepDuration / pointsInStep : 0;
          
          for (let i = 0; i < polylinePoints.length; i++) {
            const point = polylinePoints[i];
            if (!point || point.trim() === '') {
              continue; // 跳过空字符串
            }
            const parts = point.split(',');
            if (parts.length !== 2) {
              throw new Error(`路径点格式错误: "${point}". 期望格式: "lng,lat"`);
            }
            const lng = Number(parts[0]);
            const lat = Number(parts[1]);
            
            // 验证坐标有效性
            if (isNaN(lng) || isNaN(lat) || !isFinite(lng) || !isFinite(lat)) {
              throw new Error(`路径点坐标无效: "${point}". 解析结果: lng=${lng}, lat=${lat}`);
            }
            
            // 验证坐标范围（中国大致范围：经度 73-135，纬度 18-54）
            if (lng < 73 || lng > 135 || lat < 18 || lat > 54) {
              throw new Error(`路径点坐标超出中国范围: lng=${lng}, lat=${lat}. 原始点: "${point}"`);
            }
            
            points.push([lng, lat]);
            // 累计时间：每个点的时间是累计到该点的总耗时
            cumulativeTime += timePerPoint;
            timeArray.push(cumulativeTime);
          }
        } else if (stepDuration > 0) {
          // 如果步骤没有路径点但有耗时，将时间累加到最后一个点
          if (timeArray.length > 0) {
            timeArray[timeArray.length - 1] += stepDuration;
            cumulativeTime += stepDuration;
          }
        }
      }
      
      // 验证至少有一个有效点
      if (points.length === 0) {
        throw new Error('未找到有效的路径点');
      }

      // 确保时间数组长度与路径点数组长度一致
      // 如果时间数组比路径点多1（因为t0[0]=0），需要调整
      if (timeArray.length === points.length + 1) {
        // 移除第一个0，因为第一个点的时间应该是0
        timeArray.shift();
      } else if (timeArray.length < points.length) {
        // 如果时间数组不够，用最后一个值填充
        const lastTime = timeArray[timeArray.length - 1] || 0;
        while (timeArray.length < points.length) {
          timeArray.push(lastTime);
        }
      } else if (timeArray.length > points.length) {
        // 如果时间数组太多，截断
        timeArray.splice(points.length);
      }

      // 如果点太多，进行采样（保留每 N 个点），同时同步采样时间数组
      const sampled = this.samplePointsWithTime(points, timeArray, 200);
      return sampled;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`获取路径失败: ${String(error)}`);
    }
  }

  /**
   * 采样路径点和时间数组，保持同步
   */
  private samplePointsWithTime(
    points: number[][],
    timeArray: number[],
    maxPoints: number,
  ): { points: number[][]; timeArray: number[] } {
    if (points.length <= maxPoints) {
      return { points, timeArray };
    }

    const sampledPoints: number[][] = [points[0]]; // 始终保留起点
    const sampledTimeArray: number[] = [timeArray[0]]; // 始终保留起点时间
    const step = Math.floor(points.length / (maxPoints - 1));

    for (let i = step; i < points.length - 1; i += step) {
      sampledPoints.push(points[i]);
      sampledTimeArray.push(timeArray[i]);
    }

    sampledPoints.push(points[points.length - 1]); // 始终保留终点
    sampledTimeArray.push(timeArray[timeArray.length - 1]); // 始终保留终点时间

    return { points: sampledPoints, timeArray: sampledTimeArray };
  }
}

