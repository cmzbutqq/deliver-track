/**
 * OrdersService 单元测试
 * 
 * 测试核心业务逻辑：
 * - 订单时效计算
 * - 订单状态机转换
 * - 批量操作逻辑
 * - 路径规划集成
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AmapService } from './services/amap.service';
import { LogisticsCompaniesService } from '../logistics-companies/logistics-companies.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { OrderStatus } from '@prisma/client';

// Mock PrismaService
const mockPrismaService = {
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  route: {
    create: jest.fn(),
    update: jest.fn(),
  },
  logisticsTimeline: {
    create: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
  },
};

// Mock AmapService
const mockAmapService = {
  getRoute: jest.fn(),
};

// Mock LogisticsCompaniesService
const mockLogisticsCompaniesService = {
  findAll: jest.fn(),
  findByName: jest.fn(),
};

// Mock TrackingGateway
const mockTrackingGateway = {
  broadcastLocationUpdate: jest.fn(),
  broadcastStatusUpdate: jest.fn(),
  broadcastDeliveryComplete: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let amapService: AmapService;
  let logisticsCompaniesService: LogisticsCompaniesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AmapService,
          useValue: mockAmapService,
        },
        {
          provide: LogisticsCompaniesService,
          useValue: mockLogisticsCompaniesService,
        },
        {
          provide: TrackingGateway,
          useValue: mockTrackingGateway,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    amapService = module.get<AmapService>(AmapService);
    logisticsCompaniesService = module.get<LogisticsCompaniesService>(
      LogisticsCompaniesService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('订单创建', () => {
    it('应该自动使用商家默认发货地址', async () => {
      const merchantId = 'merchant-123';
      const merchantAddress = {
        lng: 116.407396,
        lat: 39.904211,
        address: '北京市东城区天安门广场',
      };

      mockPrismaService.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        address: merchantAddress,
      });

      mockLogisticsCompaniesService.findByName.mockResolvedValue({
        id: '1',
        name: '顺丰速运',
        timeLimit: 24,
      });

      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-123',
        origin: merchantAddress,
        destination: { lng: 116.4, lat: 39.9, address: '测试地址' },
      });

      const createDto = {
        receiverName: '测试用户',
        receiverPhone: '13800000000',
        receiverAddress: '测试地址',
        productName: '测试商品',
        productQuantity: 1,
        amount: 100,
        destination: { lng: 116.4, lat: 39.9, address: '测试地址' },
        logistics: '顺丰速运',
      };

      await service.create(merchantId, createDto);

      expect(mockPrismaService.merchant.findUnique).toHaveBeenCalledWith({
        where: { id: merchantId },
        select: { address: true },
      });

      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            origin: merchantAddress,
          }),
        })
      );
    });

    it('应该根据物流公司自动计算预计送达时间', async () => {
      const merchantId = 'merchant-123';
      const now = new Date();

      mockPrismaService.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        address: { lng: 116.4, lat: 39.9, address: '测试' },
      });

      mockLogisticsCompaniesService.findByName.mockResolvedValue({
        id: '1',
        name: '顺丰速运',
        timeLimit: 24,
      });

      let capturedEstimatedTime: Date | null = null;

      mockPrismaService.order.create.mockImplementation((args: any) => {
        capturedEstimatedTime = args.data.estimatedTime;
        return Promise.resolve({
          id: 'order-123',
          estimatedTime: args.data.estimatedTime,
        });
      });

      const createDto = {
        receiverName: '测试用户',
        receiverPhone: '13800000000',
        receiverAddress: '测试地址',
        productName: '测试商品',
        productQuantity: 1,
        amount: 100,
        destination: { lng: 116.4, lat: 39.9, address: '测试地址' },
        logistics: '顺丰速运',
      };

      await service.create(merchantId, createDto);

      expect(capturedEstimatedTime).toBeDefined();
      
      if (capturedEstimatedTime) {
        const hoursDiff = (capturedEstimatedTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(hoursDiff).toBeCloseTo(24, 0); // 顺丰 24 小时
      }
    });

    it('物流公司不存在时应该使用默认时效', async () => {
      const merchantId = 'merchant-123';
      const now = new Date();

      mockPrismaService.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        address: { lng: 116.4, lat: 39.9, address: '测试' },
      });

      mockLogisticsCompaniesService.findByName.mockResolvedValue(null); // 不存在的物流公司

      let capturedEstimatedTime: Date | null = null;

      mockPrismaService.order.create.mockImplementation((args: any) => {
        capturedEstimatedTime = args.data.estimatedTime;
        return Promise.resolve({
          id: 'order-123',
          estimatedTime: args.data.estimatedTime,
        });
      });

      const createDto = {
        receiverName: '测试用户',
        receiverPhone: '13800000000',
        receiverAddress: '测试地址',
        productName: '测试商品',
        productQuantity: 1,
        amount: 100,
        destination: { lng: 116.4, lat: 39.9, address: '测试地址' },
        logistics: '不存在的快递',
      };

      await service.create(merchantId, createDto);

      // 验证使用了默认时效（48小时）
      expect(capturedEstimatedTime).toBeDefined();
      if (capturedEstimatedTime) {
        const hoursDiff = (capturedEstimatedTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(hoursDiff).toBeCloseTo(48, 0); // 默认 48 小时
      }
    });
  });

  describe('订单状态机', () => {
    it('待发货订单应该能够发货', async () => {
      const orderId = 'order-123';
      const merchantId = 'merchant-123';

      mockPrismaService.order.findUnique.mockResolvedValue({
        id: orderId,
        merchantId: merchantId,
        status: OrderStatus.PENDING,
        origin: { lng: 116.4, lat: 39.9, address: '起点' },
        destination: { lng: 116.5, lat: 40.0, address: '终点' },
      });

      mockAmapService.getRoute.mockResolvedValue([
        [116.4, 39.9],
        [116.45, 39.95],
        [116.5, 40.0],
      ]);

      mockPrismaService.route.create.mockResolvedValue({
        id: 'route-123',
      });

      mockPrismaService.order.update.mockResolvedValue({
        id: orderId,
        status: OrderStatus.SHIPPING,
      });

      mockPrismaService.logisticsTimeline.create.mockResolvedValue({});

      await service.ship(orderId, merchantId);

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.SHIPPING,
          }),
        })
      );
    });

    it('已发货订单不应该重复发货', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        merchantId: 'merchant-123',
        status: OrderStatus.SHIPPING,
      });

      await expect(
        service.ship('order-123', 'merchant-123')
      ).rejects.toThrow('状态不允许发货');
    });

    it('已送达订单不应该再次发货', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        merchantId: 'merchant-123',
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.ship('order-123', 'merchant-123')
      ).rejects.toThrow('状态不允许发货');
    });

    it('运输中订单应该能够标记为已送达', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        status: OrderStatus.SHIPPING,
        merchantId: 'merchant-123',
        destination: { lng: 116.5, lat: 40.0, address: '终点' },
      });

      mockPrismaService.order.update.mockResolvedValue({
        id: 'order-123',
        status: OrderStatus.DELIVERED,
        actualTime: new Date(),
      });

      mockPrismaService.logisticsTimeline.create.mockResolvedValue({});

      await service.deliver('order-123');

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
            actualTime: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('路径规划', () => {
    it('发货时应该调用高德API规划路径', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        merchantId: 'merchant-123',
        status: OrderStatus.PENDING,
        origin: { lng: 116.4, lat: 39.9, address: '起点' },
        destination: { lng: 116.5, lat: 40.0, address: '终点' },
      });

      mockAmapService.getRoute.mockResolvedValue([
        [116.4, 39.9],
        [116.45, 39.95],
        [116.5, 40.0],
      ]);

      mockPrismaService.route.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.logisticsTimeline.create.mockResolvedValue({});

      await service.ship('order-123', 'merchant-123');

      expect(mockAmapService.getRoute).toHaveBeenCalledWith(
        '116.4,39.9',
        '116.5,40'
      );
    });

    it('高德API失败时应该使用降级策略（直线插值）', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        merchantId: 'merchant-123',
        status: OrderStatus.PENDING,
        origin: { lng: 116.4, lat: 39.9, address: '起点' },
        destination: { lng: 116.5, lat: 40.0, address: '终点' },
      });

      // 模拟 API 失败
      mockAmapService.getRoute.mockRejectedValue(new Error('API Error'));

      mockPrismaService.route.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.logisticsTimeline.create.mockResolvedValue({});

      await service.ship('order-123', 'merchant-123');

      // 应该创建路径（使用降级策略）
      expect(mockPrismaService.route.create).toHaveBeenCalled();
      
      const createRouteCall = mockPrismaService.route.create.mock.calls[0][0];
      expect(createRouteCall.data.points).toBeDefined();
      expect(Array.isArray(createRouteCall.data.points)).toBe(true);
    });

    it('降级策略应该生成起点到终点的直线路径', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        merchantId: 'merchant-123',
        status: OrderStatus.PENDING,
        origin: { lng: 116.0, lat: 39.0, address: '起点' },
        destination: { lng: 117.0, lat: 40.0, address: '终点' },
      });

      mockAmapService.getRoute.mockRejectedValue(new Error('API Error'));

      let capturedPoints: number[][] = [];
      mockPrismaService.route.create.mockImplementation((args: any) => {
        capturedPoints = args.data.points;
        return Promise.resolve({});
      });

      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.logisticsTimeline.create.mockResolvedValue({});

      await service.ship('order-123', 'merchant-123');

      // 验证路径点
      expect(capturedPoints.length).toBeGreaterThan(0);
      expect(capturedPoints[0]).toEqual([116.0, 39.0]); // 起点
      expect(capturedPoints[capturedPoints.length - 1]).toEqual([117.0, 40.0]); // 终点
    });
  });

  describe('批量操作', () => {
    it('批量发货应该统计成功和失败数量', async () => {
      const orderIds = ['order-1', 'order-2', 'order-3'];

      // order-1 和 order-2 可以发货，order-3 已发货
      mockPrismaService.order.findFirst
        .mockResolvedValueOnce({
          id: 'order-1',
          merchantId: 'merchant-123',
          status: OrderStatus.PENDING,
          origin: { lng: 116.4, lat: 39.9, address: '起点' },
          destination: { lng: 116.5, lat: 40.0, address: '终点' },
        })
        .mockResolvedValueOnce({
          id: 'order-2',
          merchantId: 'merchant-123',
          status: OrderStatus.PENDING,
          origin: { lng: 116.4, lat: 39.9, address: '起点' },
          destination: { lng: 116.5, lat: 40.0, address: '终点' },
        })
        .mockResolvedValueOnce(null); // order-3 不存在或已发货
      
      // Mock for ship() internal calls
      mockPrismaService.order.findUnique
        .mockResolvedValueOnce({
          id: 'order-1',
          merchantId: 'merchant-123',
          status: OrderStatus.PENDING,
          origin: { lng: 116.4, lat: 39.9, address: '起点' },
          destination: { lng: 116.5, lat: 40.0, address: '终点' },
        })
        .mockResolvedValueOnce({
          id: 'order-2',
          merchantId: 'merchant-123',
          status: OrderStatus.PENDING,
          origin: { lng: 116.4, lat: 39.9, address: '起点' },
          destination: { lng: 116.5, lat: 40.0, address: '终点' },
        });

      mockAmapService.getRoute.mockResolvedValue([
        [116.4, 39.9],
        [116.5, 40.0],
      ]);

      mockPrismaService.route.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.logisticsTimeline.create.mockResolvedValue({});

      const result = await service.batchShip('merchant-123', orderIds);

      expect(result.shipped).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(3);
    });

    it('批量删除只能删除待发货/已取消订单', async () => {
      const orderIds = ['order-1', 'order-2', 'order-3'];

      // 只有 order-1 和 order-2 被删除（待发货/已取消）
      mockPrismaService.order.deleteMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.batchDelete('merchant-123', orderIds);

      expect(result.deleted).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(3);

      expect(mockPrismaService.order.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: orderIds },
          merchantId: 'merchant-123',
          status: { in: [OrderStatus.PENDING, OrderStatus.CANCELLED] },
        },
      });
    });

    it('批量删除应该过滤运输中订单', async () => {
      const orderIds = ['shipping-order'];

      mockPrismaService.order.deleteMany.mockResolvedValue({
        count: 0, // 没有订单被删除
      });

      const result = await service.batchDelete('merchant-123', orderIds);

      expect(result.deleted).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('订单查询', () => {
    it('应该能够按状态筛选订单', async () => {
      const merchantId = 'merchant-123';
      const status = OrderStatus.SHIPPING;

      mockPrismaService.order.findMany.mockResolvedValue([
        { id: '1', status: OrderStatus.SHIPPING },
        { id: '2', status: OrderStatus.SHIPPING },
      ]);

      await service.findAll(merchantId, status);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            merchantId,
            status,
          },
        })
      );
    });

    it('不传状态应该查询所有订单', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await service.findAll('merchant-123');

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            merchantId: 'merchant-123',
            status: undefined,
          },
        })
      );
    });
  });

  describe('权限控制', () => {
    it('应该验证订单是否属于当前商家', async () => {
      jest.clearAllMocks(); // 清除之前的 mock
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('order-123')
      ).rejects.toThrow('订单不存在');
    });

    it('不应该允许操作其他商家的订单', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.ship('order-123', 'wrong-merchant')
      ).rejects.toThrow();
    });
  });
});


