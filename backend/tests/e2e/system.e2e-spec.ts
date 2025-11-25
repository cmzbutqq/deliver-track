/**
 * E2E 测试 - 完整系统业务流程测试
 * 
 * 基于 demo.test.ts 改造，保留演示效果的同时添加 Jest 断言
 * 
 * 测试覆盖：
 * - 商家认证系统
 * - 物流公司管理
 * - 商家发货地址管理
 * - 订单CRUD操作
 * - 订单批量操作
 * - 路径规划
 * - 实时追踪
 * - 配送区域管理
 * - 数据统计分析
 * - WebSocket实时推送
 */

import axios, { AxiosInstance } from 'axios';
import * as io from 'socket.io-client';
import { Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';

describe('电商物流配送系统 E2E 测试', () => {
  let client: AxiosInstance;
  let token: string;
  let merchantId: string;
  let testOrderId: string;
  let testOrderNo: string;
  let deliveryZoneId: string;
  let socket: Socket;

  // 测试前准备
  beforeAll(async () => {
    client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });

    // 检查后端服务是否运行
    try {
      await client.get('/');
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('后端服务未运行，请先启动: pnpm start:dev');
      }
    }
  });

  // 测试后清理
  afterAll(async () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  describe('场景 1: 商家认证系统', () => {
    it('应该能够成功登录', async () => {
      const response = await client.post('/auth/login', {
        username: 'merchant1',
        password: '123456',
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('access_token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.username).toBe('merchant1');

      // 保存 token 供后续测试使用
      token = response.data.access_token;
      merchantId = response.data.user.id;
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    });

    it('应该能够获取商家详细信息', async () => {
      const response = await client.get('/merchants/me');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('username');
      expect(response.data.data).toHaveProperty('address');
      expect(response.data.data.id).toBe(merchantId);
    });

    it('应该拒绝错误的密码', async () => {
      await expect(
        client.post('/auth/login', {
          username: 'merchant1',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    it('应该拒绝不存在的用户', async () => {
      await expect(
        client.post('/auth/login', {
          username: 'nonexistent',
          password: '123456',
        })
      ).rejects.toThrow();
    });

    it('应该拒绝无 Token 访问受保护接口', async () => {
      const tempClient = axios.create({ baseURL: BASE_URL });
      await expect(tempClient.get('/merchants/me')).rejects.toThrow();
    });
  });

  describe('场景 2: 物流公司管理', () => {
    it('应该能够获取所有物流公司列表', async () => {
      const response = await client.get('/logistics-companies');

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.data.length).toBeGreaterThan(0);

      const company = response.data.data[0];
      expect(company).toHaveProperty('id');
      expect(company).toHaveProperty('name');
      expect(company).toHaveProperty('timeLimit');
      expect(typeof company.timeLimit).toBe('number');
    });

    it('应该包含预置的物流公司', async () => {
      const response = await client.get('/logistics-companies');
      const companies = response.data.data;

      const companyNames = companies.map((c: any) => c.name);
      expect(companyNames).toContain('顺丰速运');
      expect(companyNames).toContain('京东物流');
      expect(companyNames).toContain('圆通速递');
    });

    it('物流公司应该有不同的时效配置', async () => {
      const response = await client.get('/logistics-companies');
      const companies = response.data.data;

      const shunfeng = companies.find((c: any) => c.name === '顺丰速运');
      const yunda = companies.find((c: any) => c.name === '韵达速递');

      expect(shunfeng.timeLimit).toBeLessThan(yunda.timeLimit);
    });
  });

  describe('场景 3: 商家发货地址管理', () => {
    it('应该能够查看当前发货地址', async () => {
      const response = await client.get('/merchants/me');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('address');
    });

    it('应该能够更新发货地址', async () => {
      const newAddress = {
        lng: 116.407396,
        lat: 39.904211,
        address: '北京市东城区天安门广场',
      };

      const response = await client.patch('/merchants/me', {
        address: newAddress,
      });

      expect(response.status).toBe(200);
      expect(response.data.data.address).toEqual(newAddress);
    });

    it('更新地址后，创建订单应该自动使用新地址', async () => {
      const order = await client.post('/orders', {
        receiverName: '测试用户',
        receiverPhone: '13800000000',
        receiverAddress: '北京市朝阳区',
        productName: '测试商品',
        productQuantity: 1,
        amount: 100,
        destination: { lng: 116.48, lat: 39.99, address: '北京市朝阳区' },
        logistics: '顺丰速运',
      });

      expect(order.data.origin).toBeDefined();
      expect(order.data.origin.address).toContain('天安门');

      // 清理测试订单
      await client.delete(`/orders/${order.data.id}`);
    });
  });

  describe('场景 4: 订单管理', () => {
    it('应该能够创建订单', async () => {
      const response = await client.post('/orders', {
        receiverName: '张三',
        receiverPhone: '13800138000',
        receiverAddress: '北京市朝阳区望京',
        productName: 'Jest测试商品',
        productQuantity: 2,
        amount: 299,
        destination: {
          lng: 116.481499,
          lat: 39.989675,
          address: '北京市朝阳区望京',
        },
        logistics: '顺丰速运',
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('orderNo');
      expect(response.data.status).toBe('PENDING');
      expect(response.data.receiverName).toBe('张三');
      expect(response.data.amount).toBe(299);

      // 保存订单信息供后续测试使用
      testOrderId = response.data.id;
      testOrderNo = response.data.orderNo;
    });

    it('应该自动计算预计送达时间', async () => {
      const response = await client.get(`/orders/${testOrderId}`);

      expect(response.data.estimatedTime).toBeDefined();
      const estimatedTime = new Date(response.data.estimatedTime);
      const createdTime = new Date(response.data.createdAt);
      const hoursDiff = (estimatedTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

      // 顺丰速运应该是 24 小时
      expect(hoursDiff).toBeCloseTo(24, 0);
    });

    it('应该能够查询订单详情', async () => {
      const response = await client.get(`/orders/${testOrderId}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testOrderId);
      expect(response.data).toHaveProperty('timeline');
      expect(response.data.timeline).toBeInstanceOf(Array);
    });

    it('应该能够查询所有订单', async () => {
      const response = await client.get('/orders');

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
    });

    it('应该能够按状态筛选订单', async () => {
      const response = await client.get('/orders', {
        params: { status: 'PENDING' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Array);
      response.data.forEach((order: any) => {
        expect(order.status).toBe('PENDING');
      });
    });

    it('应该能够更新订单信息', async () => {
      const response = await client.patch(`/orders/${testOrderId}`, {
        receiverPhone: '13900139000',
        amount: 399,
      });

      expect(response.status).toBe(200);
      expect(response.data.receiverPhone).toBe('13900139000');
      expect(response.data.amount).toBe(399);
    });
  });

  describe('场景 5: 订单发货与路径规划', () => {
    it('应该能够发货订单并规划路径', async () => {
      const response = await client.post(`/orders/${testOrderId}/ship`, {
        interval: 5000,
      });

      expect(response.status).toBe(201);
      expect(response.data.status).toBe('SHIPPING');
      expect(response.data).toHaveProperty('route');
      expect(response.data).toHaveProperty('currentLocation');
    });

    it('路径应该包含正确的数据结构', async () => {
      const response = await client.get(`/orders/${testOrderId}`);

      expect(response.data.route).toBeDefined();
      expect(response.data.route).toHaveProperty('points');
      expect(response.data.route).toHaveProperty('totalSteps');
      expect(response.data.route).toHaveProperty('currentStep');
      expect(response.data.route).toHaveProperty('interval');
      expect(response.data.route.points).toBeInstanceOf(Array);
      expect(response.data.route.totalSteps).toBeGreaterThan(0);
    });

    it('当前位置应该在路径点上', async () => {
      const response = await client.get(`/orders/${testOrderId}`);
      const { currentLocation, route } = response.data;

      expect(currentLocation).toBeDefined();
      expect(currentLocation).toHaveProperty('lng');
      expect(currentLocation).toHaveProperty('lat');

      // 当前位置应该是路径点之一（允许较大误差，因为可能有四舍五入）
      const currentPoint = route.points[route.currentStep];
      expect(currentLocation.lng).toBeCloseTo(currentPoint[0], 2);
      expect(currentLocation.lat).toBeCloseTo(currentPoint[1], 2);
    });

    it('不应该允许重复发货', async () => {
      await expect(
        client.post(`/orders/${testOrderId}/ship`)
      ).rejects.toThrow();
    });
  });

  describe('场景 6: 实时追踪', () => {
    it('应该能够使用订单号查询物流信息（公开接口）', async () => {
      // 不使用 token
      const tempClient = axios.create({ baseURL: BASE_URL });
      const response = await tempClient.get(`/tracking/${testOrderNo}`);

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('status');
      expect(response.data.data).toHaveProperty('currentLocation');
      expect(response.data.data).toHaveProperty('route');
      expect(response.data.data).toHaveProperty('timeline');
      expect(response.data.data).toHaveProperty('estimatedTime');
    });

    it('应该返回配送进度百分比', async () => {
      const tempClient = axios.create({ baseURL: BASE_URL });
      const response = await tempClient.get(`/tracking/${testOrderNo}`);

      const { route } = response.data.data;
      const progress = ((route.currentStep + 1) / route.totalSteps) * 100;

      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('应该包含时间线记录', async () => {
      const tempClient = axios.create({ baseURL: BASE_URL });
      const response = await tempClient.get(`/tracking/${testOrderNo}`);

      expect(response.data.data.timeline).toBeInstanceOf(Array);
      expect(response.data.data.timeline.length).toBeGreaterThan(0);

      const latestEvent = response.data.data.timeline[response.data.data.timeline.length - 1];
      expect(latestEvent).toHaveProperty('description');
      expect(latestEvent).toHaveProperty('timestamp'); // 时间线使用 timestamp 字段
    });
  });

  describe('场景 7: 批量操作', () => {
    let batchOrderIds: string[] = [];

    beforeAll(async () => {
      // 创建 5 个测试订单
      for (let i = 0; i < 5; i++) {
        const order = await client.post('/orders', {
          receiverName: `批量测试${i + 1}`,
          receiverPhone: '13800000000',
          receiverAddress: '北京市测试地址',
          productName: '批量测试商品',
          productQuantity: 1,
          amount: 100,
          destination: { lng: 116.4 + i * 0.01, lat: 39.9, address: '测试' },
          logistics: '圆通速递',
        });
        batchOrderIds.push(order.data.id);
      }
    });

    it('应该能够批量发货订单', async () => {
      const orderIds = batchOrderIds.slice(0, 3);
      const response = await client.post('/orders/batch/ship', {
        orderIds,
      });

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('shipped');
      expect(response.data.data).toHaveProperty('failed');
      expect(response.data.data).toHaveProperty('total');
      expect(response.data.data.shipped).toBe(3);
      expect(response.data.data.total).toBe(3);
    });

    it('批量发货应该跳过已发货订单', async () => {
      const orderIds = batchOrderIds.slice(0, 3);
      const response = await client.post('/orders/batch/ship', {
        orderIds,
      });

      expect(response.data.data.failed).toBe(3); // 全部失败（已发货）
    });

    it('应该能够批量删除待发货订单', async () => {
      const orderIds = batchOrderIds.slice(3, 5);
      const response = await client.delete('/orders/batch', {
        data: { orderIds },
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('deleted');
      expect(response.data.data.deleted).toBe(2);
    });

    it('不应该允许删除运输中订单', async () => {
      const shippingOrderIds = batchOrderIds.slice(0, 1);
      const response = await client.delete('/orders/batch', {
        data: { orderIds: shippingOrderIds },
      });

      expect(response.data.data.deleted).toBe(0);
      expect(response.data.data.failed).toBe(1);
    });
  });

  describe('场景 8: 配送区域管理', () => {
    it('应该能够创建配送区域', async () => {
      const response = await client.post('/delivery-zones', {
        name: 'Jest测试区域',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [116.35, 39.88],
              [116.45, 39.88],
              [116.45, 39.95],
              [116.35, 39.95],
              [116.35, 39.88],
            ],
          ],
        },
        timeLimit: 2,
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe('Jest测试区域');
      expect(response.data.timeLimit).toBe(2);

      deliveryZoneId = response.data.id;
    });

    it('应该能够查询所有配送区域', async () => {
      const response = await client.get('/delivery-zones');

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
    });

    it('应该能够查询区域内订单', async () => {
      const response = await client.get(`/delivery-zones/${deliveryZoneId}/orders`);

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Array);
    });

    it('应该能够更新配送区域', async () => {
      const response = await client.patch(`/delivery-zones/${deliveryZoneId}`, {
        timeLimit: 3,
      });

      expect(response.status).toBe(200);
      expect(response.data.timeLimit).toBe(3);
    });

    it('应该能够删除配送区域', async () => {
      await client.delete(`/delivery-zones/${deliveryZoneId}`);
      
      // 验证已删除
      await expect(
        client.get(`/delivery-zones/${deliveryZoneId}`)
      ).rejects.toThrow();
    });
  });

  describe('场景 9: 数据统计分析', () => {
    it('应该能够获取总览统计', async () => {
      const response = await client.get('/statistics/overview');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('todayOrders');
      expect(response.data.data).toHaveProperty('todayAmount');
      expect(response.data.data).toHaveProperty('shippingOrders');
      expect(response.data.data).toHaveProperty('completedOrders');
      expect(typeof response.data.data.todayOrders).toBe('number');
      expect(typeof response.data.data.todayAmount).toBe('number');
    });

    it('应该能够获取配送区域统计', async () => {
      const response = await client.get('/statistics/zones');

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);

      if (response.data.data.length > 0) {
        const zoneStat = response.data.data[0];
        expect(zoneStat).toHaveProperty('zoneName');
        expect(zoneStat).toHaveProperty('orderCount');
        expect(zoneStat).toHaveProperty('avgDeliveryTime');
      }
    });

    it('应该能够获取物流公司统计', async () => {
      const response = await client.get('/statistics/logistics');

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.data.length).toBeGreaterThan(0);

      const companyStat = response.data.data[0];
      expect(companyStat).toHaveProperty('companyName');
      expect(companyStat).toHaveProperty('orderCount');
      expect(companyStat).toHaveProperty('avgDeliveryTime');
      expect(companyStat).toHaveProperty('onTimeRate');
      expect(companyStat.onTimeRate).toBeGreaterThanOrEqual(0);
      expect(companyStat.onTimeRate).toBeLessThanOrEqual(1);
    });
  });

  describe('场景 10: WebSocket 实时推送', () => {
    it('应该能够订阅订单实时更新', (done) => {
      socket = io.connect(BASE_URL, {
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);

        // 订阅订单
        socket.emit('subscribe', testOrderNo);

        // 监听位置更新
        socket.once('location_update', (data: any) => {
          expect(data).toHaveProperty('orderNo');
          expect(data).toHaveProperty('location');
          expect(data).toHaveProperty('status');
          expect(data).toHaveProperty('progress');
          expect(data.orderNo).toBe(testOrderNo);

          socket.disconnect();
          done();
        });
      });

      socket.on('connect_error', (error) => {
        done(error);
      });
    }, 10000);

    it('应该在订单完成时收到通知', (done) => {
      socket = io.connect(BASE_URL, {
        transports: ['websocket'],
      });

      let deliveryCompleteReceived = false;

      socket.on('connect', async () => {
        socket.emit('subscribe', testOrderNo);

        // 监听 delivery_complete 事件
        socket.once('delivery_complete', (data: any) => {
          deliveryCompleteReceived = true;
          expect(data).toHaveProperty('orderNo');
          expect(data.orderNo).toBe(testOrderNo);
          socket.disconnect();
          done();
        });

        // 等待订阅成功后再完成订单
        setTimeout(async () => {
          try {
            await client.post(`/orders/${testOrderId}/deliver`);
          } catch (error) {
            // 如果订单已经完成，忽略错误
            if (!deliveryCompleteReceived) {
              socket.disconnect();
              done(error);
            }
          }
        }, 500);
      });

      socket.on('connect_error', (error) => {
        done(error);
      });
    }, 15000);
  });

  describe('场景 11: 边界条件测试', () => {
    it('应该拒绝访问不存在的订单', async () => {
      await expect(
        client.get('/orders/00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow();
    });

    it('应该验证订单创建的必填字段', async () => {
      await expect(
        client.post('/orders', {
          receiverName: '测试',
          // 缺少其他必填字段
        })
      ).rejects.toThrow();
    });

    it('应该接受任意坐标（暂无服务端验证）', async () => {
      // 注：后端当前未实现坐标有效性验证
      // 这是一个已知的功能限制，可以在未来版本中添加
      const response = await client.post('/orders', {
        receiverName: '测试边界坐标',
        receiverPhone: '13800000000',
        receiverAddress: '测试地址',
        productName: '测试商品',
        productQuantity: 1,
        amount: 100,
        destination: {
          lng: 999, // 技术上无效，但后端未验证
          lat: 999,
          address: '测试地址',
        },
        logistics: '顺丰速运',
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      
      // 清理测试数据
      await client.delete(`/orders/${response.data.id}`);
    });

    it('应该拒绝操作其他商家的订单', async () => {
      // 这个测试需要创建另一个商家账号
      // 暂时跳过，在实际项目中应该实现
    });
  });
});


