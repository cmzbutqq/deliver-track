/**
 * AmapService 单元测试
 * 
 * 测试高德地图 API 集成服务的核心功能：
 * - 路径点采样算法
 * - API 调用和错误处理
 * - 路径数据解析
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AmapService } from './amap.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AmapService', () => {
  let service: AmapService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmapService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AMAP_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AmapService>(AmapService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(service).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('AMAP_KEY');
    });
  });

  describe('路径点采样算法 (samplePoints)', () => {
    it('当点数少于最大值时应该返回所有点', () => {
      const points = [
        [116.1, 39.1],
        [116.2, 39.2],
        [116.3, 39.3],
      ];
      
      // 使用反射访问私有方法
      const sampledPoints = (service as any).samplePoints(points, 50);
      
      expect(sampledPoints).toEqual(points);
      expect(sampledPoints.length).toBe(3);
    });

    it('当点数多于最大值时应该进行采样', () => {
      // 创建 100 个点
      const points = Array.from({ length: 100 }, (_, i) => [
        116 + i * 0.01,
        39 + i * 0.01,
      ]);
      
      const sampledPoints = (service as any).samplePoints(points, 20);
      
      expect(sampledPoints.length).toBeLessThanOrEqual(21); // 允许 ±1 的误差
      expect(sampledPoints[0]).toEqual(points[0]); // 保留起点
      expect(sampledPoints[sampledPoints.length - 1]).toEqual(points[points.length - 1]); // 保留终点
    });

    it('应该始终保留起点和终点', () => {
      const points = Array.from({ length: 1000 }, (_, i) => [
        116 + i * 0.001,
        39 + i * 0.001,
      ]);
      
      const sampledPoints = (service as any).samplePoints(points, 10);
      
      expect(sampledPoints[0]).toEqual([116, 39]); // 起点
      expect(sampledPoints[sampledPoints.length - 1]).toEqual([116.999, 39.999]); // 终点
    });

    it('应该均匀采样中间点', () => {
      const points = Array.from({ length: 100 }, (_, i) => [116 + i, 39 + i]);
      
      const sampledPoints = (service as any).samplePoints(points, 11);
      
      // 检查采样点数量
      expect(sampledPoints.length).toBeLessThanOrEqual(11);
      
      // 检查采样是否均匀（相邻点索引差应该大致相等）
      const originalIndexes = sampledPoints.map((p) => p[0] - 116);
      const gaps = [];
      for (let i = 1; i < originalIndexes.length; i++) {
        gaps.push(originalIndexes[i] - originalIndexes[i - 1]);
      }
      
      // 所有间隔应该相近（允许较大误差，因为采样算法使用整数步长）
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      gaps.forEach((gap) => {
        expect(Math.abs(gap - avgGap)).toBeLessThan(avgGap); // 允许较大偏差
      });
    });

    it('应该处理只有两个点的情况', () => {
      const points = [
        [116.1, 39.1],
        [116.2, 39.2],
      ];
      
      const sampledPoints = (service as any).samplePoints(points, 50);
      
      expect(sampledPoints).toEqual(points);
      expect(sampledPoints.length).toBe(2);
    });

    it('应该处理只有一个点的情况', () => {
      const points = [[116.1, 39.1]];
      
      const sampledPoints = (service as any).samplePoints(points, 50);
      
      expect(sampledPoints).toEqual(points);
      expect(sampledPoints.length).toBe(1);
    });
  });

  describe('getRoute - 成功场景', () => {
    it('应该成功获取路径并返回采样后的点', async () => {
      const mockResponse = {
        data: {
          status: '1',
          route: {
            paths: [
              {
                steps: [
                  {
                    polyline: '116.397428,39.90923;116.398,39.91;116.399,39.911',
                  },
                  {
                    polyline: '116.4,39.912;116.401,39.913',
                  },
                ],
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const origin = '116.397428,39.90923';
      const destination = '116.407526,39.904989';
      const result = await service.getRoute(origin, destination);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://restapi.amap.com/v3/direction/driving',
        {
          params: {
            key: 'test-api-key',
            origin,
            destination,
            extensions: 'all',
          },
        }
      );

      expect(result).toHaveProperty('points');
      expect(result).toHaveProperty('timeArray');
      expect(result.points).toBeInstanceOf(Array);
      expect(result.points.length).toBeGreaterThan(0);
      expect(result.points[0]).toBeInstanceOf(Array);
      expect(result.points[0].length).toBe(2); // [lng, lat]
      expect(result.timeArray).toBeInstanceOf(Array);
      expect(result.timeArray.length).toBe(result.points.length);
    });

    it('应该正确解析多段路径的折线数据', async () => {
      const mockResponse = {
        data: {
          status: '1',
          route: {
            paths: [
              {
                steps: [
                  {
                    polyline: '116.1,39.1;116.2,39.2',
                  },
                  {
                    polyline: '116.3,39.3;116.4,39.4',
                  },
                ],
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getRoute('116.1,39.1', '116.4,39.4');

      expect(result).toEqual([
        [116.1, 39.1],
        [116.2, 39.2],
        [116.3, 39.3],
        [116.4, 39.4],
      ]);
    });

    it('当路径点过多时应该自动采样', async () => {
      // 创建一个包含很多点的 polyline
      const manyPoints = Array.from({ length: 200 }, (_, i) => 
        `${116 + i * 0.001},${39 + i * 0.001}`
      ).join(';');

      const mockResponse = {
        data: {
          status: '1',
          route: {
            paths: [
              {
                steps: [{ polyline: manyPoints }],
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getRoute('116,39', '116.2,39.2');

      // 应该采样到 200 个点左右（允许 ±1 的误差）
      expect(result.points.length).toBeLessThanOrEqual(201);
      expect(result.points[0]).toEqual([116, 39]); // 保留起点
      expect(result.points[result.points.length - 1]).toEqual([116.199, 39.199]); // 保留终点
      expect(result.timeArray.length).toBe(result.points.length);
    });
  });

  describe('getRoute - 错误处理', () => {
    it('当 API Key 未配置时应该抛出错误', async () => {
      // 重新创建一个没有 API Key 的服务实例
      const moduleWithoutKey = await Test.createTestingModule({
        providers: [
          AmapService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<AmapService>(AmapService);

      await expect(
        serviceWithoutKey.getRoute('116,39', '117,40')
      ).rejects.toThrow('高德地图 API Key 未配置');
    });

    it('当 API 返回错误状态时应该抛出错误', async () => {
      const mockResponse = {
        data: {
          status: '0',
          info: 'INVALID_PARAMS',
          infocode: '10001',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(
        service.getRoute('invalid', 'invalid')
      ).rejects.toThrow('高德地图 API 错误: INVALID_PARAMS');
    });

    it('当未找到路径时应该抛出错误', async () => {
      const mockResponse = {
        data: {
          status: '1',
          route: {
            paths: [],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(
        service.getRoute('116,39', '117,40')
      ).rejects.toThrow('未找到路径');
    });

    it('当路径数据为空时应该抛出错误', async () => {
      const mockResponse = {
        data: {
          status: '1',
          route: null,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(
        service.getRoute('116,39', '117,40')
      ).rejects.toThrow('未找到路径');
    });

    it('当网络请求失败时应该抛出错误', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      await expect(
        service.getRoute('116,39', '117,40')
      ).rejects.toThrow('获取路径失败: Network Error');
    });

    it('当返回数据格式不正确时应该能处理', async () => {
      const mockResponse = {
        data: {
          status: '1',
          route: {
            paths: [
              {
                steps: [
                  {
                    polyline: 'invalid;data;format',
                  },
                ],
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getRoute('116,39', '117,40');

      // 应该返回解析后的点（即使坐标可能无效）
      expect(result).toHaveProperty('points');
      expect(result).toHaveProperty('timeArray');
      expect(result.points).toBeInstanceOf(Array);
      expect(result.timeArray).toBeInstanceOf(Array);
    });
  });

  describe('集成场景', () => {
    it('应该处理完整的路径规划流程', async () => {
      const mockResponse = {
        data: {
          status: '1',
          route: {
            paths: [
              {
                distance: '5000',
                duration: '600',
                steps: [
                  {
                    instruction: '沿中关村大街向南行驶',
                    road: '中关村大街',
                    distance: '1000',
                    duration: '120',
                    polyline: '116.310003,39.990419;116.310103,39.989419',
                  },
                  {
                    instruction: '右转进入北四环西路',
                    road: '北四环西路',
                    distance: '2000',
                    duration: '240',
                    polyline: '116.310103,39.989419;116.311103,39.988419',
                  },
                ],
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getRoute(
        '116.310003,39.990419', // 中关村
        '116.407526,39.904989'  // 王府井
      );

      expect(result.points.length).toBeGreaterThan(0);
      expect(result.points[0]).toEqual([116.310003, 39.990419]); // 起点
      expect(result.points[result.points.length - 1]).toEqual([116.311103, 39.988419]); // 终点
      expect(result.timeArray.length).toBe(result.points.length);
    });
  });
});


