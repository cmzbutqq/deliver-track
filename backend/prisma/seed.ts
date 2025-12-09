import { PrismaClient, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

const prisma = new PrismaClient();

// 高德地图 API 配置
const AMAP_KEY = process.env.AMAP_KEY || '';
const AMAP_BASE_URL = 'https://restapi.amap.com/v3';

// 商品名称列表
const productNames = [
  'iPhone 15 Pro', 'MacBook Pro', 'iPad Air', 'AirPods Pro', 'Apple Watch',
  '华为 Mate 60', '小米 14', 'OPPO Find X7', 'vivo X100', '荣耀 Magic6',
  '联想 ThinkPad', '戴尔 XPS', '华硕 ROG', '惠普 EliteBook', 'Surface Pro',
  '索尼 WH-1000XM5', 'Bose QuietComfort', 'JBL 音响', '漫步者耳机', '雷蛇鼠标',
  '罗技键盘', '机械键盘', '游戏手柄', '显示器', '移动硬盘',
  'U盘', '充电宝', '数据线', '手机壳', '保护膜',
  '蓝牙耳机', '智能手表', '运动手环', '智能音箱', '摄像头',
];

// 姓氏列表
const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗'];

// 名字列表
const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英'];

// 生成随机姓名
function randomName(): string {
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  return surname + givenName;
}

// 生成随机手机号
function randomPhone(): string {
  const prefix = ['139', '138', '137', '136', '135', '134', '159', '158', '157', '150', '151', '152', '188', '189'];
  const prefixStr = prefix[Math.floor(Math.random() * prefix.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefixStr + suffix;
}

// 生成随机金额（100-50000）
function randomAmount(): number {
  const ranges = [
    { min: 100, max: 500, weight: 0.3 },      // 低价值 30%
    { min: 500, max: 2000, weight: 0.25 },   // 中低价值 25%
    { min: 2000, max: 5000, weight: 0.2 },   // 中价值 20%
    { min: 5000, max: 10000, weight: 0.15 }, // 中高价值 15%
    { min: 10000, max: 50000, weight: 0.1 }, // 高价值 10%
  ];
  
  const rand = Math.random();
  let cumulative = 0;
  for (const range of ranges) {
    cumulative += range.weight;
    if (rand <= cumulative) {
      return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }
  }
  return Math.floor(Math.random() * 49001) + 100;
}

// 路径生成队列（用于 seed.ts）
interface RouteRequest {
  origin: [number, number];
  destination: [number, number];
  retryCount: number;
  resolve: (result: { points: number[][]; timeArray: number[] }) => void;
  reject: (error: Error) => void;
}

class RouteQueue {
  private queue: RouteRequest[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly intervalMs = 500; // 半秒

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
          console.warn(
            `路径获取失败，重试 ${request.retryCount}/${this.maxRetries}: ${error instanceof Error ? error.message : String(error)}`,
          );
        } else {
          // 达到最大重试次数，回退到直线路径
          console.error(
            `路径获取失败，已重试 ${this.maxRetries} 次，回退到直线路径: ${error instanceof Error ? error.message : String(error)}`,
          );
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

  private async fetchRouteWithRetry(
    origin: [number, number],
    destination: [number, number],
    retryCount: number,
  ): Promise<{ points: number[][]; timeArray: number[] }> {
    if (!AMAP_KEY) {
      throw new Error('高德地图 API Key 未配置，使用直线路径');
    }

    try {
      const response = await axios.get(`${AMAP_BASE_URL}/direction/driving`, {
        params: {
          key: AMAP_KEY,
          origin: `${origin[0]},${origin[1]}`,
          destination: `${destination[0]},${destination[1]}`,
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
              continue;
            }
            const parts = point.split(',');
            if (parts.length !== 2) {
              continue;
            }
            const lng = Number(parts[0]);
            const lat = Number(parts[1]);

            if (
              isNaN(lng) ||
              isNaN(lat) ||
              !isFinite(lng) ||
              !isFinite(lat) ||
              lng < 73 ||
              lng > 135 ||
              lat < 18 ||
              lat > 54
            ) {
              continue;
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

      if (points.length === 0) {
        throw new Error('未找到有效的路径点');
      }

      // 确保时间数组长度与路径点数组长度一致
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
      throw error;
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const routeQueue = new RouteQueue();

// 生成路径点和时间数组（优先使用高德 API，失败则使用直线路径）
async function generateRoutePoints(
  origin: [number, number],
  destination: [number, number],
): Promise<{ points: number[][]; timeArray: number[] }> {
  return routeQueue.getRoute(origin, destination);
}

// 生成物流时间线
async function createTimeline(
  orderId: string,
  status: OrderStatus,
  origin: { address: string },
  destination: { address: string },
  createdAt: Date,
  actualTime?: Date,
) {
  const timeline: Array<{
    orderId: string;
    status: string;
    description: string;
    location: string;
    timestamp: Date;
  }> = [];

  // 所有订单都有"订单已创建"
  timeline.push({
    orderId,
    status: '订单已创建',
    description: '商家已创建订单',
    location: origin.address,
    timestamp: createdAt,
  });

  if (status === OrderStatus.PENDING) {
    // 待发货订单只有创建记录
    // 不做任何操作
  } else if (status === OrderStatus.SHIPPING) {
    // 运输中订单：已创建 -> 已揽收 -> 运输中
    const pickupTime = new Date(createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000); // 0-2小时后
    timeline.push({
      orderId,
      status: '已揽收',
      description: '快递已从发货地揽收',
      location: origin.address,
      timestamp: pickupTime,
    });

    const shippingTime = new Date(pickupTime.getTime() + Math.random() * 2 * 60 * 60 * 1000); // 揽收后0-2小时
    timeline.push({
      orderId,
      status: '运输中',
      description: '包裹正在运输途中',
      location: '运输途中',
      timestamp: shippingTime,
    });
  } else if (status === OrderStatus.DELIVERED) {
    // 已送达订单：完整流程
    const pickupTime = new Date(createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000);
    timeline.push({
      orderId,
      status: '已揽收',
      description: '快递已从发货地揽收',
      location: origin.address,
      timestamp: pickupTime,
    });

    const shippingTime = new Date(pickupTime.getTime() + Math.random() * 4 * 60 * 60 * 1000);
    timeline.push({
      orderId,
      status: '运输中',
      description: '包裹正在运输途中',
      location: '运输途中',
      timestamp: shippingTime,
    });

    const deliveryTime = new Date(shippingTime.getTime() + Math.random() * 4 * 60 * 60 * 1000);
    timeline.push({
      orderId,
      status: '派送中',
      description: '快递员正在派送',
      location: destination.address,
      timestamp: deliveryTime,
    });

    if (actualTime) {
      timeline.push({
        orderId,
        status: '已签收',
        description: '包裹已成功签收',
        location: destination.address,
        timestamp: actualTime,
      });
    }
  } else if (status === OrderStatus.CANCELLED) {
    // 已取消订单：已创建 -> 已取消
    const cancelTime = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000); // 0-24小时内取消
    timeline.push({
      orderId,
      status: '已取消',
      description: '订单已取消',
      location: origin.address,
      timestamp: cancelTime,
    });
  }

  if (timeline.length > 0) {
    await prisma.logisticsTimeline.createMany({ data: timeline });
  }
}

async function main() {
  console.log('🌱 开始数据填充...');

  // 创建物流公司
  const logisticsCompanies = [
    { name: '顺丰速运', speed: 0.5 },
    { name: '京东物流', speed: 0.5 },
    { name: '圆通速递', speed: 0.4 },
    { name: '中通快递', speed: 0.4 },
    { name: '申通快递', speed: 0.3 },
    { name: '韵达速递', speed: 0.3 },
  ];

  console.log('📦 创建物流公司...');
  for (const company of logisticsCompanies) {
    await prisma.logisticsCompany.upsert({
      where: { name: company.name },
      update: company,
      create: company,
    });
  }
  console.log(`✅ 已创建 ${logisticsCompanies.length} 家物流公司`);

  // 创建商家账号
  const passwordHash = await bcrypt.hash('123456', 10);
  const merchant = await prisma.merchant.upsert({
    where: { username: 'merchant1' },
    update: {},
    create: {
      username: 'merchant1',
      passwordHash,
      name: '北京商家',
      phone: '13800138000',
      address: {
        lng: 116.407396,
        lat: 39.904211,
        address: '北京市东城区天安门广场',
      },
    },
  });

  console.log('✅ 创建商家账号:', merchant.username);

  // 先删除该商家的所有现有数据，避免重复
  console.log('🗑️  清理旧数据...');
  const deletedOrders = await prisma.order.deleteMany({
    where: { merchantId: merchant.id },
  });
  console.log(`   已删除 ${deletedOrders.count} 个旧订单`);

  const deletedZones = await prisma.deliveryZone.deleteMany({
    where: { merchantId: merchant.id },
  });
  if (deletedZones.count > 0) {
    console.log(`   已删除 ${deletedZones.count} 个旧配送区域`);
  }

  // 创建配送区域（省会及以上城市，不重复）
  const deliveryZones = [
    { name: '北京配送区', center: [116.407396, 39.904211], range: 0.15 },
    { name: '上海配送区', center: [121.473701, 31.230416], range: 0.15 },
    { name: '广州配送区', center: [113.264385, 23.129112], range: 0.15 },
    { name: '深圳配送区', center: [114.057868, 22.543099], range: 0.12 },
    { name: '成都配送区', center: [104.066541, 30.572269], range: 0.15 },
    { name: '杭州配送区', center: [120.155070, 30.274084], range: 0.15 },
    { name: '南京配送区', center: [118.796877, 32.060255], range: 0.15 },
    { name: '武汉配送区', center: [114.316200, 30.581000], range: 0.15 },
    { name: '西安配送区', center: [108.940175, 34.341568], range: 0.15 },
    { name: '郑州配送区', center: [113.6401, 34.7566], range: 0.15 },
    { name: '天津配送区', center: [117.200983, 39.084158], range: 0.15 },
    { name: '重庆配送区', center: [106.551556, 29.562849], range: 0.15 },
    { name: '济南配送区', center: [117.120095, 36.651216], range: 0.12 },
    { name: '沈阳配送区', center: [123.431474, 41.805698], range: 0.15 },
    { name: '长沙配送区', center: [112.938814, 28.228209], range: 0.12 },
    { name: '福州配送区', center: [119.296494, 26.074507], range: 0.12 },
    { name: '合肥配送区', center: [117.227239, 31.820586], range: 0.12 },
    { name: '石家庄配送区', center: [114.514861, 38.042306], range: 0.12 },
    { name: '哈尔滨配送区', center: [126.535797, 45.802982], range: 0.15 },
    { name: '长春配送区', center: [125.323544, 43.817071], range: 0.12 },
    { name: '昆明配送区', center: [102.714601, 25.049153], range: 0.12 },
    { name: '南昌配送区', center: [115.892151, 28.676493], range: 0.12 },
    { name: '南宁配送区', center: [108.366543, 22.817002], range: 0.12 },
    { name: '太原配送区', center: [112.548879, 37.870590], range: 0.12 },
    { name: '贵阳配送区', center: [106.630153, 26.647661], range: 0.12 },
    { name: '海口配送区', center: [110.330802, 20.022071], range: 0.10 },
    { name: '兰州配送区', center: [103.823557, 36.058039], range: 0.12 },
    { name: '银川配送区', center: [106.230909, 38.487194], range: 0.10 },
    { name: '西宁配送区', center: [101.778916, 36.617134], range: 0.10 },
    { name: '乌鲁木齐配送区', center: [87.616848, 43.825592], range: 0.12 },
    { name: '拉萨配送区', center: [91.140856, 29.645554], range: 0.10 },
  ];

  console.log('📦 创建配送区域...');
  const zoneMap = new Map<string, any>();
  for (const zoneData of deliveryZones) {
    const [centerLng, centerLat] = zoneData.center;
    const range = zoneData.range;
    
    const boundary = {
      type: 'Polygon',
      coordinates: [
        [
          [centerLng - range, centerLat - range],
          [centerLng + range, centerLat - range],
          [centerLng + range, centerLat + range],
          [centerLng - range, centerLat + range],
          [centerLng - range, centerLat - range],
        ],
      ],
    };

    // 随机选择物流公司
    const randomLogistics = logisticsCompanies[Math.floor(Math.random() * logisticsCompanies.length)];

    const existingZone = await prisma.deliveryZone.findFirst({
      where: {
        merchantId: merchant.id,
        name: zoneData.name,
      },
    });

    const deliveryZone = existingZone
      ? await prisma.deliveryZone.update({
          where: { id: existingZone.id },
          data: {
            boundary,
            logistics: randomLogistics.name, // 随机物流公司
          },
        })
      : await prisma.deliveryZone.create({
          data: {
            merchantId: merchant.id,
            name: zoneData.name,
            boundary,
            logistics: randomLogistics.name, // 随机物流公司
          },
        });

    zoneMap.set(zoneData.name, {
      ...zoneData,
      id: deliveryZone.id,
    });
  }
  console.log(`✅ 已创建 ${deliveryZones.length} 个配送区域`);

  // 商家发货地址
  const origin = {
    lng: 116.407396,
    lat: 39.904211,
    address: '北京市东城区天安门广场',
  };

  // 生成订单数据
  const totalOrders = 100;
  const statusDistribution = {
    [OrderStatus.PENDING]: Math.floor(totalOrders * 0.60),   // 60个
    [OrderStatus.SHIPPING]: Math.floor(totalOrders * 0.20), // 20个
    [OrderStatus.DELIVERED]: Math.floor(totalOrders * 0.15), // 15个
    [OrderStatus.CANCELLED]: Math.floor(totalOrders * 0.05), // 5个
  };

  // 确保总数正确
  const actualTotal = Object.values(statusDistribution).reduce((a, b) => a + b, 0);
  statusDistribution[OrderStatus.PENDING] += totalOrders - actualTotal;

  console.log('\n📦 开始生成订单数据...');
  console.log(`   状态分布: PENDING(${statusDistribution[OrderStatus.PENDING]}), SHIPPING(${statusDistribution[OrderStatus.SHIPPING]}), DELIVERED(${statusDistribution[OrderStatus.DELIVERED]}), CANCELLED(${statusDistribution[OrderStatus.CANCELLED]})`);

  // 时间范围：过去30天到今天
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let orderCount = 0;
  const statusCounts: Record<OrderStatus, number> = {
    [OrderStatus.PENDING]: 0,
    [OrderStatus.SHIPPING]: 0,
    [OrderStatus.DELIVERED]: 0,
    [OrderStatus.CANCELLED]: 0,
  };

  // 按状态生成订单
  for (const [status, count] of Object.entries(statusDistribution)) {
    const orderStatus = status as OrderStatus;
    
    for (let i = 0; i < count; i++) {
      // 随机选择配送区域
      const zoneIndex = Math.floor(Math.random() * deliveryZones.length);
      const zone = deliveryZones[zoneIndex];
      const [centerLng, centerLat] = zone.center;
      const range = zone.range * 0.8; // 稍微缩小范围，确保在区域内

      // 在配送区域内随机生成目的地
      const destLng = centerLng + (Math.random() - 0.5) * range * 2;
      const destLat = centerLat + (Math.random() - 0.5) * range * 2;

      // 随机选择物流公司
      const logistics = logisticsCompanies[Math.floor(Math.random() * logisticsCompanies.length)];

      // 根据状态设置额外字段
      let currentLocation: { lng: number; lat: number } | undefined;
      let actualTime: Date | undefined;
      let routeResult: { points: number[][]; timeArray: number[] } | undefined;
      let createdAt: Date;
      let routePoints: number[][] | undefined;
      let t_real: number[] | undefined;
      let targetStep: number | undefined;
      let estimatedTime: Date | undefined;

      if (orderStatus === OrderStatus.SHIPPING) {
        // 运输中：需要先获取路径和时间数组，然后根据进度计算创建时间
        // 使用路径队列服务获取真实路径和时间数组（带限流和重试）
        routeResult = await generateRoutePoints([origin.lng, origin.lat], [destLng, destLat]);
        
        // 计算时间数组（与 OrdersService.ship 方法相同的逻辑）
        const { points, timeArray: t0 } = routeResult;
        routePoints = points;
        // t_esti = t0 / speed
        const t_esti = t0.map((t) => t / logistics.speed);
        // factor = random_range(0.85, 1.2)
        const factor = 0.85 + Math.random() * (1.2 - 0.85);
        // t_real = t_esti * factor
        t_real = t_esti.map((t) => t * factor);
        
        // 计算总配送时间（秒，实际配送时间）
        const totalDeliveryTime = t_real[t_real.length - 1];
        
        // 时间加速倍率：与 SimulatorService.SPEED_FACTOR 保持一致
        // 1秒演示时间 = 900秒实际配送时间
        const SPEED_FACTOR = 900;
        
        // 计算创建时间，使得当前进度为 0%～30%
        // progress = elapsedDeliveryTime / totalDeliveryTime
        // elapsedDeliveryTime = elapsedSeconds * SPEED_FACTOR
        // 0 <= elapsedSeconds * SPEED_FACTOR / totalDeliveryTime <= 0.3
        // 0 <= elapsedSeconds <= 0.3 * totalDeliveryTime / SPEED_FACTOR
        const maxElapsedSeconds = 0.3 * totalDeliveryTime / SPEED_FACTOR;
        const elapsedSeconds = Math.random() * maxElapsedSeconds;
        createdAt = new Date(now.getTime() - elapsedSeconds * 1000);
        
        // 计算预计送达时间
        const estimatedTimeSeconds = t_esti[t_esti.length - 1];
        estimatedTime = new Date(createdAt.getTime() + estimatedTimeSeconds * 1000);
        
        // 计算当前位置（基于已过时间）
        const elapsedDeliveryTime = elapsedSeconds * SPEED_FACTOR;
        targetStep = 0;
        for (let i = 0; i < t_real.length; i++) {
          if (t_real[i] <= elapsedDeliveryTime) {
            targetStep = i;
          } else {
            break;
          }
        }
        const targetPoint = routePoints[targetStep];
        currentLocation = {
          lng: targetPoint[0],
          lat: targetPoint[1],
        };
      } else if (orderStatus === OrderStatus.DELIVERED) {
        // 已送达：当前位置在终点，有实际送达时间
        // 使用路径队列服务获取真实路径和时间数组（带限流和重试）
        routeResult = await generateRoutePoints([origin.lng, origin.lat], [destLng, destLat]);
        
        // 计算时间数组（与 OrdersService.ship 方法相同的逻辑）
        const { points, timeArray: t0 } = routeResult;
        routePoints = points;
        // t_esti = t0 / speed
        const t_esti = t0.map((t) => t / logistics.speed);
        // factor = random_range(0.85, 1.2)
        const factor = 0.85 + Math.random() * (1.2 - 0.85);
        // t_real = t_esti * factor
        t_real = t_esti.map((t) => t * factor);
        
        // 已送达订单：创建时间应该是配送完成之前
        // 随机生成创建时间（过去30天内）
        const daysAgo = Math.random() * 30;
        createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        // 计算预计送达时间
        const estimatedTimeSeconds = t_esti[t_esti.length - 1];
        estimatedTime = new Date(createdAt.getTime() + estimatedTimeSeconds * 1000);
        
        // 实际送达时间：预计时间 + 随机延迟（0-2小时）
        const deliveryDelay = Math.random() * 2 * 60 * 60 * 1000;
        actualTime = new Date(estimatedTime.getTime() + deliveryDelay);
        
        currentLocation = { lng: destLng, lat: destLat };
        targetStep = routePoints.length - 1; // 已送达，在终点
      } else if (orderStatus === OrderStatus.CANCELLED) {
        // 已取消：没有当前位置和路径
        // 随机生成创建时间（过去30天内）
        const daysAgo = Math.random() * 30;
        createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        currentLocation = undefined;
        routeResult = undefined;
      } else {
        // 待发货：没有当前位置和路径
        // 随机生成创建时间（过去30天内）
        const daysAgo = Math.random() * 30;
        createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        currentLocation = undefined;
        routeResult = undefined;
      }

      // 计算预计送达时间（对于非运输中/已送达订单，使用默认值）
      if (!estimatedTime) {
        estimatedTime = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      }

      // 生成订单号（需要在 createdAt 之后）
      const orderNo = `ORD${createdAt.getTime()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // 创建订单
      const order = await prisma.order.create({
        data: {
          orderNo,
          merchantId: merchant.id,
          status: orderStatus,
          receiverName: randomName(),
          receiverPhone: randomPhone(),
          receiverAddress: `${zone.name.replace('配送区', '')}${['区', '街道', '路', '街'][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 100)}号`,
          productName: productNames[Math.floor(Math.random() * productNames.length)],
          productQuantity: Math.floor(Math.random() * 3) + 1,
          amount: randomAmount(),
          origin,
          destination: {
            lng: destLng,
            lat: destLat,
            address: `${zone.name.replace('配送区', '')}${['区', '街道', '路', '街'][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 100)}号`,
          },
          currentLocation,
          logistics: logistics.name,
          estimatedTime,
          actualTime,
          createdAt,
          updatedAt: orderStatus === OrderStatus.DELIVERED && actualTime ? actualTime : createdAt,
        },
      });

      // 创建路径（如果有）
      if (routeResult && routePoints && t_real !== undefined && targetStep !== undefined) {
        await prisma.route.create({
          data: {
            orderId: order.id,
            points: routePoints,
            timeArray: t_real,
            currentStep: targetStep,
            totalSteps: routePoints.length,
            interval: 5000, // 保留用于向后兼容
          },
        });
      }

      // 创建时间线
      await createTimeline(order.id, orderStatus, origin, order.destination as any, createdAt, actualTime);

      orderCount++;
      statusCounts[orderStatus]++;

      if (orderCount % 50 === 0) {
        console.log(`   已生成 ${orderCount}/${totalOrders} 个订单...`);
      }
    }
  }

  console.log(`\n✅ 订单生成完成！`);
  console.log(`   总计: ${orderCount} 个订单`);
  console.log(`   PENDING: ${statusCounts[OrderStatus.PENDING]} 个`);
  console.log(`   SHIPPING: ${statusCounts[OrderStatus.SHIPPING]} 个`);
  console.log(`   DELIVERED: ${statusCounts[OrderStatus.DELIVERED]} 个`);
  console.log(`   CANCELLED: ${statusCounts[OrderStatus.CANCELLED]} 个`);

  // 统计各配送区域和物流公司的订单数
  const zoneStats = new Map<string, number>();
  const logisticsStats = new Map<string, number>();
  
  const allOrders = await prisma.order.findMany({
    where: { merchantId: merchant.id, status: OrderStatus.DELIVERED },
    select: { destination: true, logistics: true },
  });

  for (const order of allOrders) {
    const dest = order.destination as any;
    // 简单匹配：根据坐标判断属于哪个配送区域
    for (const zone of deliveryZones) {
      const [centerLng, centerLat] = zone.center;
      const range = zone.range;
      if (dest.lng >= centerLng - range && dest.lng <= centerLng + range &&
          dest.lat >= centerLat - range && dest.lat <= centerLat + range) {
        zoneStats.set(zone.name, (zoneStats.get(zone.name) || 0) + 1);
        break;
      }
    }
    logisticsStats.set(order.logistics, (logisticsStats.get(order.logistics) || 0) + 1);
  }

  console.log('\n📊 数据统计:');
  console.log(`   配送区域订单分布（前10）:`);
  const sortedZones = Array.from(zoneStats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [zone, count] of sortedZones) {
    console.log(`     ${zone}: ${count} 个`);
  }
  console.log(`   物流公司订单分布:`);
  for (const [logistics, count] of Array.from(logisticsStats.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${logistics}: ${count} 个`);
  }

  console.log('\n🎉 数据填充完成！');
  console.log('\n📝 测试账号信息:');
  console.log('用户名: merchant1');
  console.log('密码: 123456');
}

main()
  .catch((e) => {
    console.error('❌ 数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
