/**
 * 展示性测试 - 完整业务流程演示（2025-11-22 更新）
 * 
 * 本测试展示从商家登录、物流公司管理、批量操作、数据统计到实时追踪的完整流程
 * 重点在于展示后端功能效果，而非功能测试
 * 
 * 新增场景：
 * - 场景 1.5: 物流公司管理
 * - 场景 2.5: 商家发货地址管理  
 * - 场景 3.5: 订单批量操作
 * - 场景 7: 数据统计与分析
 */

import axios, { AxiosInstance } from 'axios';
import * as io from 'socket.io-client';
import { Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logStep(step: number, message: string) {
  log(`[步骤 ${step}] ${message}`, colors.blue);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logData(label: string, data: any) {
  log(`  ${label}:`, colors.yellow);
  console.log(JSON.stringify(data, null, 2));
}

// 延迟函数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class DeliverySystemDemo {
  private client: AxiosInstance;
  private token: string = '';
  private merchantInfo: any;
  private testOrder: any;
  private batchOrders: any[] = [];
  private socket: Socket | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });
  }

  // 场景1: 商家认证
  async demoAuthentication() {
    logSection('场景 1: 商家认证系统');

    logStep(1, '商家登录');
    try {
      const response = await this.client.post('/auth/login', {
        username: 'merchant1',
        password: '123456',
      });

      this.token = response.data.access_token;
      this.merchantInfo = response.data.user;

      logSuccess('登录成功');
      logData('商家信息', this.merchantInfo);
      logData('JWT Token (前20字符)', this.token.substring(0, 20) + '...');

      // 设置后续请求的认证头
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (error: any) {
      log(`✗ 登录失败: ${error.message}`, colors.red);
      throw error;
    }

    await sleep(1000);

    logStep(2, '获取商家详细信息');
    try {
      const response = await this.client.get('/merchants/me');
      logSuccess('获取商家信息成功');
      logData('商家详情', response.data.data);
    } catch (error: any) {
      log(`✗ 获取失败: ${error.message}`, colors.red);
    }
  }

  // 场景1.5: 物流公司管理 (新增)
  async demoLogisticsCompanies() {
    logSection('场景 1.5: 物流公司管理系统 ⭐ 新功能');

    logStep(1, '获取所有物流公司列表');
    try {
      const response = await this.client.get('/logistics-companies');
      const companies = response.data.data;

      logSuccess(`系统预置 ${companies.length} 家物流公司`);
      
      log('\n  物流公司列表:', colors.yellow);
      companies.forEach((company: any, index: number) => {
        log(`    ${index + 1}. ${company.name}`, colors.cyan);
        log(`       配送时效: ${company.timeLimit} 小时`, colors.yellow);
        log(`       ID: ${company.id}`, colors.yellow);
      });

      log('\n  时效分类:', colors.yellow);
      const fast = companies.filter((c: any) => c.timeLimit <= 24);
      const normal = companies.filter((c: any) => c.timeLimit > 24 && c.timeLimit <= 48);
      const slow = companies.filter((c: any) => c.timeLimit > 48);
      
      log(`    • 次日达 (≤24h): ${fast.map((c: any) => c.name).join('、')}`, colors.green);
      log(`    • 2日达 (≤48h): ${normal.map((c: any) => c.name).join('、')}`, colors.blue);
      log(`    • 3日达 (>48h): ${slow.map((c: any) => c.name).join('、')}`, colors.magenta);

    } catch (error: any) {
      log(`✗ 获取失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(2, '物流公司时效自动计算演示');
    log('  → 创建订单时系统会自动根据物流公司计算预计送达时间', colors.yellow);
    log('  → 示例: 顺丰速运 = 当前时间 + 24小时', colors.cyan);
    log('  → 示例: 韵达速递 = 当前时间 + 72小时', colors.cyan);
  }

  // 场景2.5: 商家发货地址管理 (新增)
  async demoMerchantAddress() {
    logSection('场景 2.5: 商家发货地址管理 ⭐ 新功能');

    logStep(1, '查看当前发货地址');
    try {
      const response = await this.client.get('/merchants/me');
      const merchant = response.data.data;

      if (merchant.address) {
        logSuccess('商家已配置默认发货地址');
        logData('发货地址', {
          经度: merchant.address.lng,
          纬度: merchant.address.lat,
          地址: merchant.address.address,
        });
      } else {
        log('  商家尚未配置发货地址，将使用系统默认地址', colors.yellow);
      }
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(2, '更新商家发货地址');
    try {
      const newAddress = {
        lng: 116.407396,
        lat: 39.904211,
        address: '北京市东城区天安门广场',
      };

      const response = await this.client.patch('/merchants/me', {
        address: newAddress,
      });

      logSuccess('发货地址更新成功');
      logData('新地址', response.data.data.address);
      
      log('\n  地址作用说明:', colors.yellow);
      log('    • 创建订单时自动作为起点', colors.cyan);
      log('    • 无需每次手动输入发货地址', colors.cyan);
      log('    • 支持随时修改', colors.cyan);
    } catch (error: any) {
      log(`✗ 更新失败: ${error.message}`, colors.red);
    }
  }

  // 场景2: 订单管理
  async demoOrderManagement() {
    logSection('场景 2: 订单管理系统');

    logStep(1, '创建新订单（使用商家发货地址）');
    try {
      const orderData = {
        receiverName: '演示用户',
        receiverPhone: '13900139999',
        receiverAddress: '北京市朝阳区三里屯太古里',
        productName: 'iPhone 15 Pro Max 1TB',
        productQuantity: 1,
        amount: 12999,
        destination: {
          lng: 116.455395,
          lat: 39.937458,
          address: '北京市朝阳区三里屯太古里',
        },
        logistics: '顺丰速运',
      };

      const response = await this.client.post('/orders', orderData);
      this.testOrder = response.data;

      logSuccess('订单创建成功');
      logData('订单号', this.testOrder.orderNo);
      logData('订单状态', this.testOrder.status);
      logData('商品信息', {
        name: this.testOrder.productName,
        quantity: this.testOrder.productQuantity,
        amount: `¥${this.testOrder.amount}`,
      });
      logData('配送信息', {
        from: this.testOrder.origin.address,
        to: this.testOrder.destination.address,
        logistics: this.testOrder.logistics,
      });
      
      // 验证自动计算的预计送达时间
      const estimatedTime = new Date(this.testOrder.estimatedTime);
      const createdTime = new Date(this.testOrder.createdAt);
      const hoursDiff = (estimatedTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
      
      log('\n  ✓ 自动计算预计送达时间:', colors.green);
      log(`    创建时间: ${createdTime.toLocaleString('zh-CN')}`, colors.cyan);
      log(`    预计送达: ${estimatedTime.toLocaleString('zh-CN')}`, colors.cyan);
      log(`    时效: ${hoursDiff.toFixed(1)} 小时 (顺丰速运标准时效: 24小时)`, colors.yellow);
    } catch (error: any) {
      log(`✗ 创建失败: ${error.response?.data?.message || error.message}`, colors.red);
      throw error;
    }

    await sleep(1000);

    logStep(2, '查询订单列表（按状态筛选）');
    try {
      const response = await this.client.get('/orders', {
        params: { status: 'PENDING', sortBy: 'createdAt', sortOrder: 'desc' },
      });

      logSuccess(`查询到 ${response.data.length} 个待发货订单`);
      response.data.slice(0, 3).forEach((order: any, index: number) => {
        log(`  ${index + 1}. ${order.orderNo} - ${order.productName} (¥${order.amount})`, colors.yellow);
      });
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(3, '查看订单详情');
    try {
      const response = await this.client.get(`/orders/${this.testOrder.id}`);
      const orderDetail = response.data;

      logSuccess('订单详情获取成功');
      logData('完整信息', {
        orderNo: orderDetail.orderNo,
        status: orderDetail.status,
        receiver: orderDetail.receiverName,
        phone: orderDetail.receiverPhone,
        address: orderDetail.receiverAddress,
        timeline: orderDetail.timeline.map((t: any) => ({
          status: t.status,
          description: t.description,
          time: new Date(t.timestamp).toLocaleString('zh-CN'),
        })),
      });
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }
  }

  // 场景3.5: 订单批量操作 (新增)
  async demoBatchOperations() {
    logSection('场景 3.5: 订单批量操作 ⭐ 新功能');

    logStep(1, '创建多个测试订单用于批量操作');
    try {
      const destinations = [
        { name: '张三', address: '北京市海淀区中关村', lng: 116.310316, lat: 39.989896 },
        { name: '李四', address: '北京市朝阳区望京', lng: 116.481499, lat: 39.989675 },
        { name: '王五', address: '北京市西城区金融街', lng: 116.36123, lat: 39.916345 },
      ];

      for (const dest of destinations) {
        const orderData = {
          receiverName: dest.name,
          receiverPhone: '13900000000',
          receiverAddress: dest.address,
          productName: '测试商品',
          productQuantity: 1,
          amount: 99.99,
          destination: {
            lng: dest.lng,
            lat: dest.lat,
            address: dest.address,
          },
          logistics: '圆通速递',
        };

        const response = await this.client.post('/orders', orderData);
        this.batchOrders.push(response.data);
      }

      logSuccess(`已创建 ${this.batchOrders.length} 个测试订单`);
      this.batchOrders.forEach((order, index) => {
        log(`  ${index + 1}. ${order.orderNo} - ${order.receiverName}`, colors.cyan);
      });
    } catch (error: any) {
      log(`✗ 创建失败: ${error.message}`, colors.red);
      return;
    }

    await sleep(1000);

    logStep(2, '批量发货操作');
    try {
      const orderIds = this.batchOrders.slice(0, 2).map(o => o.id);
      
      log(`  → 准备发货 ${orderIds.length} 个订单...`, colors.yellow);
      
      const response = await this.client.post('/orders/batch/ship', {
        orderIds,
      });

      logSuccess('批量发货完成');
      logData('操作结果', response.data.data);
      
      log('\n  批量发货特性:', colors.yellow);
      log('    • 自动跳过非待发货状态订单', colors.cyan);
      log('    • 返回成功/失败统计', colors.cyan);
      log('    • 提供详细错误信息', colors.cyan);
    } catch (error: any) {
      log(`✗ 批量发货失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(3, '批量删除操作');
    try {
      // 删除剩余的待发货订单
      const remainingOrders = this.batchOrders.slice(2);
      const orderIds = remainingOrders.map(o => o.id);
      
      if (orderIds.length > 0) {
        log(`  → 准备删除 ${orderIds.length} 个订单...`, colors.yellow);
        
        const response = await this.client.delete('/orders/batch', {
          data: { orderIds },
        });

        logSuccess('批量删除完成');
        logData('操作结果', response.data.data);
        
        log('\n  批量删除特性:', colors.yellow);
        log('    • 只能删除待发货/已取消订单', colors.cyan);
        log('    • 自动过滤不符合条件的订单', colors.cyan);
        log('    • 返回删除统计信息', colors.cyan);
      }
    } catch (error: any) {
      log(`✗ 批量删除失败: ${error.message}`, colors.red);
    }
  }

  // 场景3: 模拟发货与路径规划
  async demoShippingAndRouting() {
    logSection('场景 3: 智能发货与路径规划');

    logStep(1, '执行发货操作');
    log('  → 调用高德地图 API 规划配送路径...', colors.yellow);
    log('  → 如果 API 不可用，将使用直线插值降级策略', colors.yellow);

    try {
      const response = await this.client.post(`/orders/${this.testOrder.id}/ship`, {
        interval: 5000,
      });

      const shippedOrder = response.data;
      logSuccess('发货成功！订单进入运输状态');
      logData('发货信息', {
        orderNo: shippedOrder.orderNo,
        status: shippedOrder.status,
        currentLocation: shippedOrder.currentLocation,
        estimatedTime: new Date(shippedOrder.estimatedTime).toLocaleString('zh-CN'),
      });
    } catch (error: any) {
      log(`✗ 发货失败: ${error.response?.data?.message || error.message}`, colors.red);
      throw error;
    }

    await sleep(1000);

    logStep(2, '查看生成的路径数据');
    try {
      const response = await this.client.get(`/orders/${this.testOrder.id}`);
      const order = response.data;

      if (order.route) {
        logSuccess('路径规划完成');
        logData('路径统计', {
          总路径点: order.route.totalSteps,
          当前步骤: order.route.currentStep,
          推送间隔: `${order.route.interval / 1000}秒`,
          进度: `${((order.route.currentStep / order.route.totalSteps) * 100).toFixed(1)}%`,
        });

        log('\n  路径坐标点示例（前5个）:', colors.yellow);
        const points = order.route.points.slice(0, 5);
        points.forEach((point: number[], index: number) => {
          log(`    ${index + 1}. [经度: ${point[0].toFixed(6)}, 纬度: ${point[1].toFixed(6)}]`, colors.cyan);
        });
      }
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(3, '查看物流时间线更新');
    try {
      const response = await this.client.get(`/orders/${this.testOrder.id}`);
      const timeline = response.data.timeline;

      logSuccess(`物流时间线已更新，共 ${timeline.length} 条记录`);
      timeline.forEach((item: any, index: number) => {
        const time = new Date(item.timestamp).toLocaleString('zh-CN');
        log(`  ${index + 1}. [${time}] ${item.status} - ${item.description}`, colors.cyan);
        if (item.location) {
          log(`     位置: ${item.location}`, colors.yellow);
        }
      });
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }
  }

  // 场景4: 实时轨迹追踪
  async demoRealtimeTracking() {
    logSection('场景 4: 实时轨迹追踪系统');

    logStep(1, '用户查询物流信息（公开接口，无需认证）');
    try {
      const response = await axios.get(`${BASE_URL}/tracking/${this.testOrder.orderNo}`);
      const trackingData = response.data.data;

      logSuccess('物流信息查询成功');
      logData('实时追踪信息', {
        订单号: trackingData.orderNo,
        订单状态: trackingData.status,
        收货人: trackingData.receiverName,
        当前位置: trackingData.currentLocation,
        预计送达: new Date(trackingData.estimatedTime).toLocaleString('zh-CN'),
        配送进度: `${((trackingData.route.currentStep / trackingData.route.totalSteps) * 100).toFixed(1)}%`,
      });
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(2, '建立 WebSocket 实时连接');
    log('  → 连接到 WebSocket 服务器...', colors.yellow);

    return new Promise<void>((resolve) => {
      this.socket = io.connect(BASE_URL, {
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        logSuccess('WebSocket 连接建立成功');
        log(`  连接 ID: ${this.socket?.id}`, colors.cyan);

        logStep(3, `订阅订单实时追踪: ${this.testOrder.orderNo}`);
        this.socket?.emit('subscribe', this.testOrder.orderNo);
        log('  → 等待接收实时位置更新...', colors.yellow);
      });

      let updateCount = 0;
      const maxUpdates = 5;

      this.socket.on('location_update', (data: any) => {
        updateCount++;
        log(`\n[位置更新 #${updateCount}] ${new Date().toLocaleTimeString('zh-CN')}`, colors.green);
        logData('推送数据', {
          订单号: data.orderNo,
          经度: data.location.lng.toFixed(6),
          纬度: data.location.lat.toFixed(6),
          进度: `${data.progress?.toFixed(1)}%`,
        });

        if (updateCount >= maxUpdates) {
          logStep(4, '演示完成，取消订阅');
          this.socket?.emit('unsubscribe', this.testOrder.orderNo);
          
          setTimeout(() => {
            this.socket?.disconnect();
            logSuccess('WebSocket 连接已关闭');
            resolve();
          }, 1000);
        }
      });

      this.socket.on('status_update', (data: any) => {
        log(`\n[状态更新] ${data.message}`, colors.magenta);
        logData('状态变更', data);
      });

      this.socket.on('error', (data: any) => {
        log(`✗ 错误: ${data.message}`, colors.red);
      });

      this.socket.on('disconnect', () => {
        log('  WebSocket 连接已断开', colors.yellow);
      });

      // 超时保护
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.disconnect();
        }
        resolve();
      }, 35000);
    });
  }

  // 场景5: 配送区域管理
  async demoDeliveryZones() {
    logSection('场景 5: 配送区域管理与地理计算');

    let zoneId: string = '';

    logStep(1, '创建配送区域（北京东城区）');
    try {
      const zoneData = {
        name: '测试配送区',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [116.38, 39.89],
              [116.45, 39.89],
              [116.45, 39.93],
              [116.38, 39.93],
              [116.38, 39.89],
            ],
          ],
        },
        timeLimit: 2,
      };

      const response = await this.client.post('/delivery-zones', zoneData);
      zoneId = response.data.id;

      logSuccess('配送区域创建成功');
      logData('区域信息', {
        id: response.data.id,
        name: response.data.name,
        配送时效: `${response.data.timeLimit}小时`,
        边界顶点数: response.data.boundary.coordinates[0].length,
      });

      log('\n  区域边界坐标:', colors.yellow);
      response.data.boundary.coordinates[0].forEach((point: number[], index: number) => {
        log(`    顶点 ${index + 1}: [${point[0].toFixed(6)}, ${point[1].toFixed(6)}]`, colors.cyan);
      });
    } catch (error: any) {
      log(`✗ 创建失败: ${error.response?.data?.message || error.message}`, colors.red);
      return;
    }

    await sleep(1000);

    logStep(2, '查询配送区域内的订单（地理空间计算）');
    log('  → 使用射线法算法判断订单目的地是否在区域内...', colors.yellow);

    try {
      const response = await this.client.get(`/delivery-zones/${zoneId}/orders`);
      
      logSuccess(`找到 ${response.data.length} 个区域内订单`);
      
      if (response.data.length > 0) {
        log('\n  区域内订单列表:', colors.yellow);
        response.data.slice(0, 5).forEach((order: any, index: number) => {
          log(`    ${index + 1}. ${order.orderNo} - ${order.receiverName}`, colors.cyan);
          log(`       目的地: [${order.destination.lng.toFixed(6)}, ${order.destination.lat.toFixed(6)}]`, colors.yellow);
          log(`       地址: ${order.destination.address}`, colors.yellow);
        });
      } else {
        log('  当前区域内暂无订单', colors.yellow);
      }
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(3, '获取所有配送区域');
    try {
      const response = await this.client.get('/delivery-zones');
      
      logSuccess(`商家共有 ${response.data.length} 个配送区域`);
      response.data.forEach((zone: any, index: number) => {
        log(`  ${index + 1}. ${zone.name} (${zone.timeLimit}小时配送)`, colors.cyan);
      });
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }
  }

  // 场景6: 定时任务与自动化
  async demoAutomation() {
    logSection('场景 6: 定时任务与自动化流程');

    log('系统每 5 秒自动执行以下任务:', colors.yellow);
    log('  1. 查询所有运输中的订单', colors.cyan);
    log('  2. 根据路径数据计算新位置', colors.cyan);
    log('  3. 更新订单当前位置', colors.cyan);
    log('  4. 通过 WebSocket 广播位置更新', colors.cyan);
    log('  5. 到达终点时自动完成签收', colors.cyan);

    await sleep(1000);

    logStep(1, '查询当前运输中的订单');
    try {
      const response = await this.client.get('/orders', {
        params: { status: 'SHIPPING' },
      });

      logSuccess(`系统中有 ${response.data.length} 个订单正在配送`);
      
      if (response.data.length > 0) {
        log('\n  配送中订单:', colors.yellow);
        response.data.forEach((order: any, index: number) => {
          const progress = order.route
            ? ((order.route.currentStep / order.route.totalSteps) * 100).toFixed(1)
            : 0;
          log(`    ${index + 1}. ${order.orderNo} - 进度: ${progress}%`, colors.cyan);
          log(`       当前位置: [${order.currentLocation.lng.toFixed(6)}, ${order.currentLocation.lat.toFixed(6)}]`, colors.yellow);
        });
      }
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    log('\n  定时任务特性:', colors.yellow);
    log('    ✓ 服务重启后自动恢复所有运输中订单', colors.green);
    log('    ✓ 到达关键进度节点自动创建时间线记录', colors.green);
    log('    ✓ 到达终点自动标记为已送达', colors.green);
    log('    ✓ 支持自定义推送间隔（默认 5 秒）', colors.green);
  }

  // 场景7: 数据统计与分析 (新增)
  async demoStatistics() {
    logSection('场景 7: 数据统计与分析 ⭐ 新功能');

    logStep(1, '总览统计');
    try {
      const response = await this.client.get('/statistics/overview');
      const stats = response.data.data;

      logSuccess('总览统计数据获取成功');
      log('\n  统计数据:', colors.yellow);
      log(`    今日订单数: ${stats.todayOrders} 个`, colors.cyan);
      log(`    今日订单金额: ¥${stats.todayAmount.toFixed(2)}`, colors.cyan);
      log(`    运输中订单: ${stats.shippingOrders} 个`, colors.cyan);
      log(`    已完成订单: ${stats.completedOrders} 个（累计）`, colors.cyan);

      log('\n  API 特性:', colors.yellow);
      log('    • 支持指定日期查询 (?date=2025-11-22)', colors.green);
      log('    • 实时统计运输中订单', colors.green);
      log('    • 自动聚合订单金额', colors.green);
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(2, '配送区域统计');
    try {
      const response = await this.client.get('/statistics/zones');
      const zoneStats = response.data.data;

      logSuccess(`获取到 ${zoneStats.length} 个配送区域的统计数据`);
      
      if (zoneStats.length > 0) {
        log('\n  配送区域分析:', colors.yellow);
        zoneStats.slice(0, 5).forEach((zone: any, index: number) => {
          log(`    ${index + 1}. ${zone.zoneName}`, colors.cyan);
          log(`       订单数量: ${zone.orderCount} 个`, colors.yellow);
          log(`       平均配送时长: ${zone.avgDeliveryTime.toFixed(2)} 小时`, colors.yellow);
        });

        log('\n  用途说明:', colors.yellow);
        log('    • 用于前端 ECharts Geo 地理柱状图', colors.green);
        log('    • 支持按订单数/时长切换显示', colors.green);
        log('    • 帮助商家优化配送区域规划', colors.green);
      }
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }

    await sleep(1000);

    logStep(3, '物流公司统计');
    try {
      const response = await this.client.get('/statistics/logistics');
      const companyStats = response.data.data;

      logSuccess(`获取到 ${companyStats.length} 家物流公司的统计数据`);
      
      log('\n  物流公司效率对比:', colors.yellow);
      companyStats.forEach((company: any, index: number) => {
        log(`    ${index + 1}. ${company.companyName}`, colors.cyan);
        log(`       订单数量: ${company.orderCount} 个`, colors.yellow);
        log(`       平均配送时长: ${company.avgDeliveryTime.toFixed(2)} 小时`, colors.yellow);
        log(`       准点率: ${(company.onTimeRate * 100).toFixed(1)}%`, colors.yellow);
      });

      log('\n  统计指标说明:', colors.yellow);
      log('    • 平均配送时长 = 实际签收时间 - 订单创建时间', colors.green);
      log('    • 准点率 = 实际送达 ≤ 预计送达的订单比例', colors.green);
      log('    • 用于前端物流公司对比柱状图', colors.green);
    } catch (error: any) {
      log(`✗ 查询失败: ${error.message}`, colors.red);
    }
  }

  // 生成演示报告
  async generateReport() {
    logSection('演示总结报告');

    log('📊 系统核心能力展示:', colors.bright);
    console.log('');
    
    log('1. 认证与授权', colors.cyan);
    log('   ✓ JWT Token 无状态认证', colors.green);
    log('   ✓ 密码 bcrypt 加密存储', colors.green);
    log('   ✓ 基于角色的权限控制', colors.green);
    console.log('');

    log('2. 物流公司管理 ⭐ 新增', colors.cyan);
    log('   ✓ 预置 6 家物流公司配置', colors.green);
    log('   ✓ 自动计算预计送达时间', colors.green);
    log('   ✓ 支持不同时效标准', colors.green);
    console.log('');

    log('3. 商家发货地址 ⭐ 新增', colors.cyan);
    log('   ✓ 默认发货地址配置', colors.green);
    log('   ✓ 创建订单自动使用', colors.green);
    log('   ✓ 支持动态更新', colors.green);
    console.log('');

    log('4. 订单管理', colors.cyan);
    log('   ✓ 完整的 CRUD 操作', colors.green);
    log('   ✓ 状态筛选与多字段排序', colors.green);
    log('   ✓ 自动生成订单号和时间线', colors.green);
    log('   ✓ 批量发货与批量删除 ⭐ 新增', colors.green);
    console.log('');

    log('5. 智能路径规划', colors.cyan);
    log('   ✓ 集成高德地图 API', colors.green);
    log('   ✓ 真实路网数据规划', colors.green);
    log('   ✓ 降级策略保证可用性', colors.green);
    log('   ✓ 路径点采样优化', colors.green);
    console.log('');

    log('6. 实时通信', colors.cyan);
    log('   ✓ WebSocket 低延迟推送', colors.green);
    log('   ✓ Room 机制订单隔离', colors.green);
    log('   ✓ 支持订阅/取消订阅', colors.green);
    log('   ✓ 位置和状态双向推送', colors.green);
    console.log('');

    log('7. 地理空间计算', colors.cyan);
    log('   ✓ GeoJSON 标准格式', colors.green);
    log('   ✓ 射线法多边形判断', colors.green);
    log('   ✓ Haversine 距离计算', colors.green);
    log('   ✓ 配送区域管理', colors.green);
    console.log('');

    log('8. 定时任务自动化', colors.cyan);
    log('   ✓ Cron 定时调度', colors.green);
    log('   ✓ 批量订单处理', colors.green);
    log('   ✓ 自动位置推进', colors.green);
    log('   ✓ 服务重启恢复', colors.green);
    console.log('');

    log('9. 数据统计分析 ⭐ 新增', colors.cyan);
    log('   ✓ 总览统计（订单/金额/状态）', colors.green);
    log('   ✓ 配送区域效率分析', colors.green);
    log('   ✓ 物流公司对比统计', colors.green);
    log('   ✓ 准点率计算', colors.green);
    console.log('');

    log('🎯 技术亮点:', colors.bright);
    console.log('');
    log('  • 模块化设计，高内聚低耦合', colors.yellow);
    log('  • TypeScript 全栈类型安全', colors.yellow);
    log('  • Prisma ORM 简化数据访问', colors.yellow);
    log('  • Socket.io 成熟实时方案', colors.yellow);
    log('  • 降级策略保证可用性', colors.yellow);
    log('  • 批量操作提升效率', colors.yellow);
    log('  • 数据统计支持决策', colors.yellow);
    console.log('');

    try {
      const ordersResponse = await this.client.get('/orders');
      const shippingOrders = ordersResponse.data.filter((o: any) => o.status === 'SHIPPING');
      const statsResponse = await this.client.get('/statistics/overview');
      const stats = statsResponse.data.data;
      
      log('📈 当前系统状态:', colors.bright);
      console.log('');
      log(`  总订单数: ${ordersResponse.data.length}`, colors.cyan);
      log(`  运输中订单: ${shippingOrders.length}`, colors.cyan);
      log(`  今日订单: ${stats.todayOrders}`, colors.cyan);
      log(`  今日金额: ¥${stats.todayAmount.toFixed(2)}`, colors.cyan);
      log(`  WebSocket 连接: ${this.socket ? '已建立' : '未连接'}`, colors.cyan);
      log(`  认证状态: 已登录 (${this.merchantInfo.username})`, colors.cyan);
    } catch (error) {
      // 忽略错误
    }

    console.log('\n' + '='.repeat(80));
    log('  演示完成！感谢观看！', colors.bright + colors.green);
    console.log('='.repeat(80) + '\n');
  }

  // 执行完整演示
  async runFullDemo() {
    const startTime = Date.now();

    log('\n' + '█'.repeat(80), colors.bright + colors.cyan);
    log('█' + ' '.repeat(78) + '█', colors.bright + colors.cyan);
    log('█' + ' '.repeat(20) + '电商物流配送可视化平台' + ' '.repeat(20) + '█', colors.bright + colors.cyan);
    log('█' + ' '.repeat(23) + '后端系统完整演示' + ' '.repeat(23) + '█', colors.bright + colors.cyan);
    log('█' + ' '.repeat(25) + '(2025-11-22)' + ' '.repeat(25) + '█', colors.bright + colors.cyan);
    log('█' + ' '.repeat(78) + '█', colors.bright + colors.cyan);
    log('█'.repeat(80) + '\n', colors.bright + colors.cyan);

    try {
      // 场景1: 认证
      await this.demoAuthentication();
      await sleep(2000);

      // 场景1.5: 物流公司管理 (新增)
      await this.demoLogisticsCompanies();
      await sleep(2000);

      // 场景2.5: 商家发货地址管理 (新增)
      await this.demoMerchantAddress();
      await sleep(2000);

      // 场景2: 订单管理
      await this.demoOrderManagement();
      await sleep(2000);

      // 场景3.5: 订单批量操作 (新增)
      await this.demoBatchOperations();
      await sleep(2000);

      // 场景3: 发货与路径规划
      await this.demoShippingAndRouting();
      await sleep(2000);

      // 场景4: 实时追踪
      await this.demoRealtimeTracking();
      await sleep(2000);

      // 场景5: 配送区域
      await this.demoDeliveryZones();
      await sleep(2000);

      // 场景6: 自动化
      await this.demoAutomation();
      await sleep(2000);

      // 场景7: 数据统计 (新增)
      await this.demoStatistics();
      await sleep(2000);

      // 生成报告
      await this.generateReport();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      log(`\n⏱️  总耗时: ${duration} 秒`, colors.bright);
      log(`\n✨ 共演示 9 大场景，包含 3 个全新功能模块`, colors.bright + colors.green);
    } catch (error: any) {
      log(`\n❌ 演示过程中出现错误: ${error.message}`, colors.red);
      log('请确保后端服务正在运行 (http://localhost:3000)', colors.yellow);
    }
  }
}

// 执行演示
async function main() {
  const demo = new DeliverySystemDemo();
  await demo.runFullDemo();
  process.exit(0);
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

export default DeliverySystemDemo;
