import { PrismaClient, OrderStatus, VehicleType, VehicleStatus, DriverStatus, WarehouseStatus, ExceptionType, ExceptionHandleStatus, ProductStatus, SupplierCreditLevel, SupplierStatus, DeliveryRouteStatus, ShiftType, ScheduleStatus, MaintenanceType, TransactionType, FeeType, SettlementStatus, TaskType, TaskStatus, PaymentMethod, PaymentStatus, RefundStatus, ComplaintType, ComplaintStatus, CouponType, CouponStatus, AlertLevel, RecipientType, NotificationType } from '@prisma/client';
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

  // 更新商家扩展字段
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      businessLicense: `BL${Math.floor(Math.random() * 1000000000)}`,
      creditLevel: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
      accountBalance: Math.random() * 100000,
    },
  });

  // 创建客户数据
  console.log('👥 创建客户数据...');
  const customers = [];
  for (let i = 0; i < 50; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: randomName(),
        phone: randomPhone(),
        email: `customer${i}@example.com`,
        idCard: `11010119900101${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        defaultAddress: {
          lng: 116.3 + Math.random() * 0.3,
          lat: 39.8 + Math.random() * 0.3,
          address: `北京市${['东城区', '西城区', '朝阳区', '海淀区'][Math.floor(Math.random() * 4)]}${randomName()}路${Math.floor(Math.random() * 100)}号`,
        },
      },
    });
    customers.push(customer);

    // 为每个客户创建1-3个地址
    const addressCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < addressCount; j++) {
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          receiverName: randomName(),
          receiverPhone: randomPhone(),
          address: {
            lng: 116.3 + Math.random() * 0.3,
            lat: 39.8 + Math.random() * 0.3,
            address: `北京市${['东城区', '西城区', '朝阳区', '海淀区'][Math.floor(Math.random() * 4)]}${randomName()}路${Math.floor(Math.random() * 100)}号`,
          },
          isDefault: j === 0, // 第一个地址设为默认
        },
      });
    }
  }
  console.log(`✅ 已创建 ${customers.length} 个客户及其地址`);

  // 创建商品数据
  console.log('📦 创建商品数据...');
  const products = [];
  const categories = ['电子产品', '服装', '食品', '家居', '图书', '运动', '美妆', '汽车用品'];
  for (let i = 0; i < 30; i++) {
    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        name: productNames[i % productNames.length],
        sku: `SKU${String(i + 1).padStart(6, '0')}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        weight: Math.random() * 10 + 0.1, // 0.1-10.1 kg
        volume: Math.random() * 0.1 + 0.01, // 0.01-0.11 m³
        price: Math.random() * 5000 + 100, // 100-5100 元
        description: `${productNames[i % productNames.length]}的详细描述`,
        status: Math.random() > 0.2 ? ProductStatus.ON_SHELF : ProductStatus.OFF_SHELF,
      },
    });
    products.push(product);
  }
  console.log(`✅ 已创建 ${products.length} 个商品`);

  // 创建供应商数据
  console.log('🏭 创建供应商数据...');
  const suppliers = [];
  const supplierNames = ['北京供应商A', '上海供应商B', '广州供应商C', '深圳供应商D', '杭州供应商E'];
  for (let i = 0; i < 5; i++) {
    const supplier = await prisma.supplier.create({
      data: {
        name: supplierNames[i],
        contactName: randomName(),
        contactPhone: randomPhone(),
        address: {
          lng: 116.3 + Math.random() * 0.3,
          lat: 39.8 + Math.random() * 0.3,
          address: `北京市${['东城区', '西城区', '朝阳区', '海淀区'][Math.floor(Math.random() * 4)]}${randomName()}路${Math.floor(Math.random() * 100)}号`,
        },
        creditLevel: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)] as SupplierCreditLevel,
        status: Math.random() > 0.1 ? SupplierStatus.NORMAL : (Math.random() > 0.5 ? SupplierStatus.SUSPENDED : SupplierStatus.BLACKLIST),
      },
    });
    suppliers.push(supplier);
  }
  console.log(`✅ 已创建 ${suppliers.length} 个供应商`);

  // 创建车辆数据
  console.log('🚗 创建车辆数据...');
  const vehicles = [];
  const vehicleTypes = [VehicleType.SMALL_TRUCK, VehicleType.LARGE_TRUCK, VehicleType.ELECTRIC];
  const vehicleStatuses = [VehicleStatus.AVAILABLE, VehicleStatus.AVAILABLE, VehicleStatus.AVAILABLE, VehicleStatus.MAINTENANCE];

  for (let i = 0; i < 8; i++) {
    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: `京${['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
        vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
        loadCapacity: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] === VehicleType.LARGE_TRUCK ?
          Math.random() * 5 + 5 : Math.random() * 3 + 1, // 大货车5-10吨，其他1-4吨
        status: vehicleStatuses[Math.floor(Math.random() * vehicleStatuses.length)],
        purchaseDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000), // 0-5年前购买
        lastMaintenanceDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // 0-90天前维修
      },
    });
    vehicles.push(vehicle);
  }
  console.log(`✅ 已创建 ${vehicles.length} 辆车`);

  // 创建仓库数据
  console.log('🏭 创建仓库数据...');
  const warehouses = [];
  const warehouseLocations = [
    { name: '北京分拨中心', lng: 116.407396, lat: 39.904211, address: '北京市朝阳区' },
    { name: '上海分拨中心', lng: 121.473701, lat: 31.230416, address: '上海市浦东新区' },
    { name: '广州分拨中心', lng: 113.264385, lat: 23.129112, address: '广州市天河区' },
    { name: '成都分拨中心', lng: 104.066541, lat: 30.572269, address: '成都市锦江区' },
  ];

  for (const loc of warehouseLocations) {
    const warehouse = await prisma.warehouse.create({
      data: {
        name: loc.name,
        address: {
          lng: loc.lng,
          lat: loc.lat,
          address: loc.address,
        },
        managerName: randomName(),
        managerPhone: randomPhone(),
        capacity: Math.floor(Math.random() * 50000) + 10000, // 10000-60000
        currentStock: Math.floor(Math.random() * 30000) + 5000, // 5000-35000
        status: Math.random() > 0.9 ? WarehouseStatus.MAINTENANCE : WarehouseStatus.NORMAL,
      },
    });
    warehouses.push(warehouse);
  }
  console.log(`✅ 已创建 ${warehouses.length} 个仓库`);

  // 创建配送路线数据
  console.log('🛣️  创建配送路线数据...');
  const deliveryRoutes = [];
  const regions = ['华北', '华东', '华南', '西南', '西北', '东北'];
  for (const warehouse of warehouses) {
    for (let i = 0; i < 2; i++) {
      const route = await prisma.deliveryRoute.create({
        data: {
          name: `${warehouse.name}-${regions[Math.floor(Math.random() * regions.length)]}路线`,
          warehouseId: warehouse.id,
          destinationRegion: regions[Math.floor(Math.random() * regions.length)],
          distance: Math.random() * 500 + 100, // 100-600 km
          estimatedTime: Math.floor(Math.random() * 12) + 4, // 4-16 小时
          status: Math.random() > 0.1 ? DeliveryRouteStatus.ACTIVE : DeliveryRouteStatus.INACTIVE,
        },
      });
      deliveryRoutes.push(route);
    }
  }
  console.log(`✅ 已创建 ${deliveryRoutes.length} 条配送路线`);

  // 创建配送员数据
  console.log('👤 创建配送员数据...');
  const drivers = [];
  const driverStatuses = [DriverStatus.IDLE, DriverStatus.IDLE, DriverStatus.DELIVERING, DriverStatus.RESTING];

  for (let i = 0; i < 12; i++) {
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    const driver = await prisma.deliveryDriver.create({
      data: {
        name: randomName(),
        phone: randomPhone(),
        licenseNumber: `D${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}`,
        vehicleId: vehicle.id,
        status: driverStatuses[Math.floor(Math.random() * driverStatuses.length)],
        currentLocation: {
          lng: 116.407396 + (Math.random() - 0.5) * 0.1,
          lat: 39.904211 + (Math.random() - 0.5) * 0.1,
        },
        totalOrders: Math.floor(Math.random() * 200),
        avgRating: Math.random() * 2 + 3, // 3-5分
        onTimeRate: Math.random() * 0.3 + 0.7, // 70%-100%
      },
    });
    drivers.push(driver);
  }
  console.log(`✅ 已创建 ${drivers.length} 个配送员`);

  // 创建配送区域-配送员关联数据（在创建配送区域之后）
  // 注意：这里先创建配送区域，然后再关联

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

  // 创建配送区域-配送员关联数据
  console.log('🔗 创建配送区域-配送员关联数据...');
  const allZones = await prisma.deliveryZone.findMany({
    where: { merchantId: merchant.id },
  });
  let zoneDriverCount = 0;
  for (const zone of allZones) {
    // 每个配送区域关联2-4个配送员
    const driverCount = Math.floor(Math.random() * 3) + 2;
    const selectedDrivers = drivers.sort(() => Math.random() - 0.5).slice(0, driverCount);
    for (const driver of selectedDrivers) {
      await prisma.deliveryZoneDriver.create({
        data: {
          zoneId: zone.id,
          driverId: driver.id,
          priority: Math.floor(Math.random() * 10), // 0-9优先级
        },
      });
      zoneDriverCount++;
    }
  }
  console.log(`✅ 已创建 ${zoneDriverCount} 条配送区域-配送员关联`);

  // 商家发货地址
  const origin = {
    lng: 116.407396,
    lat: 39.904211,
    address: '北京市东城区天安门广场',
  };

  // 生成订单数据
  const totalOrders = 200;
  const statusDistribution = {
    [OrderStatus.CANCELLED]: 10,   // 已取消 10个
    [OrderStatus.DELIVERED]: 80,   // 已完成 80个
    [OrderStatus.SHIPPING]: 10,    // 运输中 10个
    [OrderStatus.PENDING]: 100,    // 待发货 100个
  };

  // 确保总数正确
  const actualTotal = Object.values(statusDistribution).reduce((a, b) => a + b, 0);
  if (actualTotal !== totalOrders) {
    // 如果总数不对，调整待发货数量
    statusDistribution[OrderStatus.PENDING] += totalOrders - actualTotal;
  }

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

      // 随机选择客户和客户地址（提前选择，用于确定finalDestination）
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const customerAddresses = await prisma.customerAddress.findMany({
        where: { customerId: customer.id },
      });
      const customerAddress = customerAddresses.length > 0
        ? customerAddresses[Math.floor(Math.random() * customerAddresses.length)]
        : null;

      // 检查customerAddress的坐标是否在当前配送区域内
      // 如果不在，则使用生成的destLng和destLat
      let finalDestination: { lng: number; lat: number; address: string };
      let useCustomerAddress = false;
      if (customerAddress && customerAddress.address) {
        const addr = customerAddress.address as any;
        if (addr.lng && addr.lat) {
          // 检查坐标是否在当前配送区域内
          const addrLng = addr.lng;
          const addrLat = addr.lat;
          // 判断是否在区域内（简单的矩形判断，因为配送区域是正方形）
          if (addrLng >= centerLng - zone.range && addrLng <= centerLng + zone.range &&
              addrLat >= centerLat - zone.range && addrLat <= centerLat + zone.range) {
            // 在区域内，使用customerAddress
            finalDestination = {
              lng: addrLng,
              lat: addrLat,
              address: addr.address || `${zone.name.replace('配送区', '')}${['区', '街道', '路', '街'][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 100)}号`,
            };
            useCustomerAddress = true;
          }
        }
      }

      // 如果customerAddress不在区域内或不存在，使用生成的坐标
      if (!useCustomerAddress) {
        finalDestination = {
          lng: destLng,
          lat: destLat,
          address: `${zone.name.replace('配送区', '')}${['区', '街道', '路', '街'][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 100)}号`,
        };
      }

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
        routeResult = await generateRoutePoints([origin.lng, origin.lat], [finalDestination.lng, finalDestination.lat]);

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
        routeResult = await generateRoutePoints([origin.lng, origin.lat], [finalDestination.lng, finalDestination.lat]);

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

        currentLocation = { lng: finalDestination.lng, lat: finalDestination.lat };
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

      // 随机分配配送员和仓库（仅对已发货和已送达的订单）
      const deliveryDriver = (orderStatus === OrderStatus.SHIPPING || orderStatus === OrderStatus.DELIVERED)
        ? drivers[Math.floor(Math.random() * drivers.length)]
        : null;
      const warehouse = (orderStatus === OrderStatus.SHIPPING || orderStatus === OrderStatus.DELIVERED)
        ? warehouses[Math.floor(Math.random() * warehouses.length)]
        : null;


      // 随机选择商品
      const product = products[Math.floor(Math.random() * products.length)];

      // 计算重量和距离（使用finalDestination）
      const weight = Math.random() * 20 + 0.5; // 0.5-20.5 kg
      const distance = Math.sqrt(
        Math.pow((finalDestination.lng - origin.lng) * 111, 2) +
        Math.pow((finalDestination.lat - origin.lat) * 111, 2)
      ); // 粗略计算距离（km）

      // 计算费用
      const baseFee = 10 + distance * 2; // 基础运费
      const urgentFee = Math.random() > 0.7 ? Math.random() * 20 + 10 : 0; // 30%概率有加急费
      const insuranceAmount = Math.random() > 0.8 ? randomAmount() * 0.1 : 0; // 20%概率有保价
      const insuranceFee = insuranceAmount > 0 ? insuranceAmount * 0.01 : 0; // 保价费 = 保价金额 * 1%
      const distanceFee = distance * 1.5;
      const weightFee = weight * 2;
      const totalFee = baseFee + urgentFee + insuranceFee + distanceFee + weightFee;

      // 创建订单
      const order = await prisma.order.create({
        data: {
          orderNo,
          merchantId: merchant.id,
          status: orderStatus,
          receiverName: useCustomerAddress && customerAddress ? customerAddress.receiverName : randomName(),
          receiverPhone: useCustomerAddress && customerAddress ? customerAddress.receiverPhone : randomPhone(),
          receiverAddress: useCustomerAddress && customerAddress ? (customerAddress.address as any).address : finalDestination.address,
          productName: product.name,
          productQuantity: Math.floor(Math.random() * 3) + 1,
          amount: randomAmount(),
          origin,
          destination: finalDestination,
          currentLocation,
          logistics: logistics.name,
          estimatedTime,
          actualTime,
          deliveryDriverId: deliveryDriver?.id,
          warehouseId: warehouse?.id,
          customerId: customer.id,
          customerAddressId: customerAddress?.id,
          productId: product.id,
          insuranceAmount: insuranceAmount > 0 ? insuranceAmount : null,
          urgentFee,
          totalFee,
          weight,
          distance,
          createdAt,
          updatedAt: orderStatus === OrderStatus.DELIVERED && actualTime ? actualTime : createdAt,
        },
      });

      // 创建配送费用明细
      if (orderStatus === OrderStatus.SHIPPING || orderStatus === OrderStatus.DELIVERED) {
        await prisma.deliveryFee.create({
          data: {
            orderId: order.id,
            baseFee,
            urgentFee,
            insuranceFee,
            distanceFee,
            weightFee,
            totalFee,
          },
        });
      }

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

  // 为已送达订单创建客户评价
  console.log('\n⭐ 创建客户评价数据...');
  const deliveredOrders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      status: OrderStatus.DELIVERED,
    },
    take: 50, // 只为前50个已送达订单创建评价
  });

  let reviewCount = 0;
  for (const order of deliveredOrders) {
    if (Math.random() > 0.6) { // 40%的订单有评价
      await prisma.customerReview.create({
        data: {
          orderId: order.id,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5分
          comment: ['服务很好', '配送及时', '包装完好', '非常满意', '推荐'][Math.floor(Math.random() * 5)],
          reviewerName: order.receiverName,
          reviewerPhone: order.receiverPhone,
        },
      });
      reviewCount++;
    }
  }
  console.log(`✅ 已创建 ${reviewCount} 条客户评价`);

  // 创建异常订单记录
  console.log('\n⚠️  创建异常订单记录...');
  const exceptionOrders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      status: { in: [OrderStatus.SHIPPING, OrderStatus.DELIVERED] },
    },
    take: 10,
  });

  let exceptionCount = 0;
  const exceptionTypes = [ExceptionType.TIMEOUT, ExceptionType.LOST, ExceptionType.DAMAGED, ExceptionType.OTHER];
  const handleStatuses = [ExceptionHandleStatus.PENDING, ExceptionHandleStatus.PROCESSING, ExceptionHandleStatus.RESOLVED];

  for (const order of exceptionOrders) {
    if (Math.random() > 0.7) { // 30%的订单有异常
      const exceptionType = exceptionTypes[Math.floor(Math.random() * exceptionTypes.length)];
      const handleStatus = handleStatuses[Math.floor(Math.random() * handleStatuses.length)];

      await prisma.orderException.create({
        data: {
          orderId: order.id,
          exceptionType,
          description: {
            [ExceptionType.TIMEOUT]: '配送超时',
            [ExceptionType.LOST]: '包裹丢失',
            [ExceptionType.DAMAGED]: '包裹损坏',
            [ExceptionType.OTHER]: '其他异常',
          }[exceptionType],
          handlerName: handleStatus !== ExceptionHandleStatus.PENDING ? randomName() : null,
          handleStatus,
          handleTime: handleStatus !== ExceptionHandleStatus.PENDING ? new Date() : null,
        },
      });
      exceptionCount++;
    }
  }
  console.log(`✅ 已创建 ${exceptionCount} 条异常订单记录`);

  // 创建订单历史数据
  console.log('\n📜 创建订单历史数据...');
  const ordersWithHistory = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      status: { in: [OrderStatus.SHIPPING, OrderStatus.DELIVERED] },
    },
    take: 50,
  });
  let historyCount = 0;
  for (const order of ordersWithHistory) {
    // 模拟状态变更历史：PENDING -> SHIPPING -> DELIVERED
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        oldStatus: OrderStatus.PENDING,
        newStatus: OrderStatus.SHIPPING,
        changedBy: 'system',
        changeReason: '订单已发货',
        changedAt: new Date(order.createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000),
      },
    });
    historyCount++;
    if (order.status === OrderStatus.DELIVERED) {
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          oldStatus: OrderStatus.SHIPPING,
          newStatus: OrderStatus.DELIVERED,
          changedBy: order.deliveryDriverId ? 'driver' : 'system',
          changeReason: '订单已送达',
          changedAt: order.actualTime || new Date(),
        },
      });
      historyCount++;
    }
  }
  console.log(`✅ 已创建 ${historyCount} 条订单历史记录`);

  // 创建费用结算数据
  console.log('\n💰 创建费用结算数据...');
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const settledOrders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      status: OrderStatus.DELIVERED,
      createdAt: { gte: startDate, lte: endDate },
    },
    take: 20,
  });
  if (settledOrders.length > 0) {
    const totalAmount = settledOrders.reduce((sum, o) => sum + (o.totalFee || 0), 0);
    const settlement = await prisma.feeSettlement.create({
      data: {
        merchantId: merchant.id,
        settlementNo: `SETTLE${Date.now()}`,
        startDate,
        endDate,
        totalAmount,
        settledAmount: totalAmount * 0.8, // 已结算80%
        status: SettlementStatus.SETTLING,
      },
    });
    for (const order of settledOrders) {
      if (order.totalFee && order.totalFee > 0) {
        await prisma.feeSettlementDetail.create({
          data: {
            settlementId: settlement.id,
            orderId: order.id,
            feeType: FeeType.BASE_FEE,
            amount: order.totalFee * 0.4, // 假设基础运费占40%
          },
        });
        await prisma.feeSettlementDetail.create({
          data: {
            settlementId: settlement.id,
            orderId: order.id,
            feeType: FeeType.DISTANCE_FEE,
            amount: order.totalFee * 0.3, // 距离费占30%
          },
        });
      }
    }
    console.log(`✅ 已创建 1 个费用结算单，包含 ${settledOrders.length} 个订单的明细`);
  }

  // 创建配送员排班数据
  console.log('\n📅 创建配送员排班数据...');
  const shiftTypes = [ShiftType.MORNING, ShiftType.AFTERNOON, ShiftType.NIGHT];
  let scheduleCount = 0;
  for (let day = 0; day < 7; day++) {
    const workDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    for (const driver of drivers) {
      if (Math.random() > 0.3) { // 70%概率有排班
        const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
        await prisma.driverSchedule.create({
          data: {
            driverId: driver.id,
            workDate,
            shiftType,
            startTime: shiftType === ShiftType.MORNING ? '08:00' : shiftType === ShiftType.AFTERNOON ? '14:00' : '20:00',
            endTime: shiftType === ShiftType.MORNING ? '14:00' : shiftType === ShiftType.AFTERNOON ? '20:00' : '02:00',
            status: Math.random() > 0.5 ? ScheduleStatus.CHECKED_IN : ScheduleStatus.SCHEDULED,
          },
        });
        scheduleCount++;
      }
    }
  }
  console.log(`✅ 已创建 ${scheduleCount} 条配送员排班记录`);

  // 创建车辆维修记录数据
  console.log('\n🔧 创建车辆维修记录数据...');
  const maintenanceTypes = [MaintenanceType.MAINTENANCE, MaintenanceType.REPAIR, MaintenanceType.INSPECTION];
  let maintenanceCount = 0;
  for (const vehicle of vehicles) {
    if (Math.random() > 0.5) { // 50%概率有维修记录
      const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
      const maintenanceDate = new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000); // 过去180天内
      await prisma.vehicleMaintenance.create({
        data: {
          vehicleId: vehicle.id,
          maintenanceType,
          maintenanceDate,
          cost: Math.random() * 5000 + 500, // 500-5500元
          description: `${maintenanceType === MaintenanceType.MAINTENANCE ? '定期保养' : maintenanceType === MaintenanceType.REPAIR ? '故障维修' : '年检'}记录`,
          nextMaintenanceDate: maintenanceType === MaintenanceType.MAINTENANCE
            ? new Date(maintenanceDate.getTime() + 90 * 24 * 60 * 60 * 1000)
            : null,
        },
      });
      maintenanceCount++;
    }
  }
  console.log(`✅ 已创建 ${maintenanceCount} 条车辆维修记录`);

  // 创建仓库出入库记录数据
  console.log('\n📦 创建仓库出入库记录数据...');
  const transactionTypes = [TransactionType.IN, TransactionType.OUT, TransactionType.INVENTORY];
  let transactionCount = 0;
  for (const warehouse of warehouses) {
    const warehouseOrders = await prisma.order.findMany({
      where: {
        warehouseId: warehouse.id,
        status: { in: [OrderStatus.SHIPPING, OrderStatus.DELIVERED] },
      },
      take: 10,
    });
    for (const order of warehouseOrders) {
      // 出库记录
      await prisma.warehouseTransaction.create({
        data: {
          warehouseId: warehouse.id,
          orderId: order.id,
          transactionType: TransactionType.OUT,
          quantity: Math.floor(Math.random() * 10) + 1,
          operator: randomName(),
          remark: `订单${order.orderNo}出库`,
          transactionDate: order.createdAt,
        },
      });
      transactionCount++;
    }
    // 随机创建一些入库和盘点记录
    for (let i = 0; i < 5; i++) {
      await prisma.warehouseTransaction.create({
        data: {
          warehouseId: warehouse.id,
          transactionType: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
          quantity: Math.floor(Math.random() * 20) + 1,
          operator: randomName(),
          remark: '库存调整',
          transactionDate: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      });
      transactionCount++;
    }
  }
  console.log(`✅ 已创建 ${transactionCount} 条仓库出入库记录`);

  // 创建配送员绩效统计数据
  console.log('\n📊 创建配送员绩效统计数据...');
  let statsCount = 0;
  for (let day = 0; day < 7; day++) {
    const statDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    for (const driver of drivers) {
      const driverOrders = await prisma.order.findMany({
        where: {
          deliveryDriverId: driver.id,
          status: OrderStatus.DELIVERED,
          actualTime: {
            gte: new Date(statDate.getTime()),
            lt: new Date(statDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });
      if (driverOrders.length > 0) {
        const totalDistance = driverOrders.reduce((sum, o) => sum + (o.distance || 0), 0);
        const totalIncome = driverOrders.reduce((sum, o) => sum + (o.totalFee || 0), 0);
        await prisma.driverPerformanceStats.create({
          data: {
            driverId: driver.id,
            statDate,
            totalOrders: driverOrders.length,
            completedOrders: driverOrders.length,
            onTimeOrders: Math.floor(driverOrders.length * 0.8), // 80%准时
            avgRating: driver.avgRating,
            totalDistance,
            totalIncome,
          },
        });
        statsCount++;
      }
    }
  }
  console.log(`✅ 已创建 ${statsCount} 条配送员绩效统计记录`);

  // 创建商家统计数据
  console.log('\n📈 创建商家统计数据...');
  let merchantStatsCount = 0;
  for (let day = 0; day < 7; day++) {
    const statDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const dayOrders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id,
        createdAt: {
          gte: new Date(statDate.getTime()),
          lt: new Date(statDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    if (dayOrders.length > 0) {
      const completedOrders = dayOrders.filter(o => o.status === OrderStatus.DELIVERED);
      const totalAmount = dayOrders.reduce((sum, o) => sum + o.amount, 0);
      const totalFee = dayOrders.reduce((sum, o) => sum + (o.totalFee || 0), 0);
      const reviews = await prisma.customerReview.findMany({
        where: {
          orderId: { in: dayOrders.map(o => o.id) },
        },
      });
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      await prisma.merchantStatistics.create({
        data: {
          merchantId: merchant.id,
          statDate,
          totalOrders: dayOrders.length,
          completedOrders: completedOrders.length,
          totalAmount,
          totalFee,
          avgRating,
        },
      });
      merchantStatsCount++;
    }
  }
  console.log(`✅ 已创建 ${merchantStatsCount} 条商家统计记录`);

  // ========== 第三阶段：新增表数据 ==========

  // 创建订单明细
  console.log('\n📦 创建订单明细...');
  const ordersWithItems = await prisma.order.findMany({
    take: 50,
    include: {
      product: true,
    },
  });
  let orderItemsCount = 0;
  for (const order of ordersWithItems) {
    if (order.productId) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: order.productId,
          quantity: order.productQuantity,
          unitPrice: order.amount / order.productQuantity,
          subtotal: order.amount,
        },
      });
      orderItemsCount++;
    }
  }
  console.log(`✅ 已创建 ${orderItemsCount} 条订单明细记录`);

  // 创建配送任务
  console.log('\n🚚 创建配送任务...');
  const shippingOrders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.SHIPPING, OrderStatus.DELIVERED] },
      deliveryDriverId: { not: null },
    },
    take: 30,
  });
  let tasksCount = 0;
  for (const order of shippingOrders) {
    if (order.deliveryDriverId) {
      await prisma.deliveryTask.create({
        data: {
          driverId: order.deliveryDriverId,
          orderId: order.id,
          taskType: TaskType.DELIVERY,
          priority: Math.floor(Math.random() * 3),
          status: order.status === OrderStatus.DELIVERED ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
          assignedAt: order.createdAt,
          completedAt: order.status === OrderStatus.DELIVERED ? order.actualTime : null,
        },
      });
      tasksCount++;
    }
  }
  console.log(`✅ 已创建 ${tasksCount} 条配送任务记录`);

  // 创建配送时效承诺
  console.log('\n⏰ 创建配送时效承诺...');
  const ordersWithTime = await prisma.order.findMany({
    where: {
      estimatedTime: { not: null },
    },
    take: 40,
  });
  let promisesCount = 0;
  for (const order of ordersWithTime) {
    if (order.estimatedTime) {
      const isOnTime = order.actualTime ? order.actualTime <= order.estimatedTime : null;
      const delayMinutes = order.actualTime && order.estimatedTime
        ? Math.max(0, Math.floor((order.actualTime.getTime() - order.estimatedTime.getTime()) / 60000))
        : null;
      await prisma.deliveryPromise.create({
        data: {
          orderId: order.id,
          promisedDeliveryTime: order.estimatedTime,
          actualDeliveryTime: order.actualTime,
          isOnTime,
          delayMinutes,
        },
      });
      promisesCount++;
    }
  }
  console.log(`✅ 已创建 ${promisesCount} 条配送时效承诺记录`);

  // 创建支付记录
  console.log('\n💳 创建支付记录...');
  const paidOrders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.SHIPPING, OrderStatus.DELIVERED] },
    },
    take: 50,
  });
  let paymentsCount = 0;
  const paymentMethods = [PaymentMethod.ALIPAY, PaymentMethod.WECHAT, PaymentMethod.BANK_CARD, PaymentMethod.BALANCE];
  for (const order of paidOrders) {
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const status = order.status === OrderStatus.DELIVERED ? PaymentStatus.SUCCESS : PaymentStatus.PENDING;
    await prisma.payment.create({
      data: {
        orderId: order.id,
        paymentMethod,
        amount: order.amount,
        status,
        transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
        paidAt: status === PaymentStatus.SUCCESS ? order.createdAt : null,
      },
    });
    paymentsCount++;
  }
  console.log(`✅ 已创建 ${paymentsCount} 条支付记录`);

  // 创建退款记录
  console.log('\n💰 创建退款记录...');
  const cancelledOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.CANCELLED,
    },
    take: 10,
  });
  let refundsCount = 0;
  for (const order of cancelledOrders) {
    const payment = await prisma.payment.findFirst({
      where: { orderId: order.id },
    });
    if (payment && payment.status === PaymentStatus.SUCCESS) {
      await prisma.refund.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          refundAmount: payment.amount * 0.8, // 退款80%
          refundReason: '订单取消',
          status: RefundStatus.COMPLETED,
          processedAt: new Date(order.updatedAt.getTime() + 3600000), // 1小时后处理
        },
      });
      refundsCount++;
    }
  }
  console.log(`✅ 已创建 ${refundsCount} 条退款记录`);

  // 创建客户积分
  console.log('\n🎁 创建客户积分...');
  const allCustomers = await prisma.customer.findMany();
  let pointsCount = 0;
  for (const customer of allCustomers) {
    const customerOrders = await prisma.order.findMany({
      where: {
        customerId: customer.id,
        status: OrderStatus.DELIVERED,
      },
    });
    if (customerOrders.length > 0) {
      const totalPoints = Math.floor(customerOrders.reduce((sum, o) => sum + o.amount, 0));
      const usedPoints = Math.floor(totalPoints * 0.2); // 已使用20%
      await prisma.customerPoint.upsert({
        where: { customerId: customer.id },
        update: {
          totalPoints,
          usedPoints,
          availablePoints: totalPoints - usedPoints,
        },
        create: {
          customerId: customer.id,
          totalPoints,
          usedPoints,
          availablePoints: totalPoints - usedPoints,
        },
      });
      pointsCount++;
    }
  }
  console.log(`✅ 已创建 ${pointsCount} 条客户积分记录`);

  // 创建投诉建议
  console.log('\n📝 创建投诉建议...');
  const ordersForComplaint = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      customerId: { not: null },
    },
    take: 15,
  });
  let complaintsCount = 0;
  const complaintTypes = [ComplaintType.DELIVERY_DELAY, ComplaintType.DAMAGE, ComplaintType.WRONG_ITEM, ComplaintType.SERVICE, ComplaintType.OTHER];
  for (const order of ordersForComplaint) {
    if (order.customerId && Math.random() < 0.3) { // 30%的订单有投诉
      const complaintType = complaintTypes[Math.floor(Math.random() * complaintTypes.length)];
      const status = Math.random() < 0.5 ? ComplaintStatus.RESOLVED : ComplaintStatus.PENDING;
      await prisma.complaint.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          complaintType,
          content: `关于订单${order.orderNo}的投诉：${complaintType === ComplaintType.DELIVERY_DELAY ? '配送延迟' : complaintType === ComplaintType.DAMAGE ? '商品损坏' : '服务问题'}`,
          status,
          handlerId: status === ComplaintStatus.RESOLVED ? merchant.id : null,
          handledAt: status === ComplaintStatus.RESOLVED ? new Date() : null,
        },
      });
      complaintsCount++;
    }
  }
  console.log(`✅ 已创建 ${complaintsCount} 条投诉建议记录`);

  // 创建优惠券
  console.log('\n🎫 创建优惠券...');
  let couponsCount = 0;
  for (let i = 0; i < 10; i++) {
    const couponType = Math.random() < 0.5 ? CouponType.FIXED_AMOUNT : CouponType.PERCENTAGE;
    const validFrom = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const validTo = new Date(validFrom.getTime() + (7 + Math.random() * 30) * 24 * 60 * 60 * 1000);
    await prisma.coupon.create({
      data: {
        merchantId: merchant.id,
        couponCode: `COUPON${Date.now()}${i}`,
        couponType,
        discountAmount: couponType === CouponType.FIXED_AMOUNT ? Math.floor(Math.random() * 100) + 10 : null,
        discountPercent: couponType === CouponType.PERCENTAGE ? Math.floor(Math.random() * 30) + 5 : null,
        minOrderAmount: Math.floor(Math.random() * 500) + 100,
        maxDiscount: couponType === CouponType.PERCENTAGE ? Math.floor(Math.random() * 50) + 20 : null,
        validFrom,
        validTo,
        usageLimit: Math.floor(Math.random() * 100) + 10,
        usedCount: 0,
        status: validTo > now ? CouponStatus.ACTIVE : CouponStatus.EXPIRED,
      },
    });
    couponsCount++;
  }
  console.log(`✅ 已创建 ${couponsCount} 条优惠券记录`);

  // 创建优惠券使用记录
  console.log('\n🎟️ 创建优惠券使用记录...');
  const activeCoupons = await prisma.coupon.findMany({
    where: {
      status: CouponStatus.ACTIVE,
      usedCount: { lt: prisma.coupon.fields.usageLimit },
    },
    take: 5,
  });
  let couponUsagesCount = 0;
  for (const coupon of activeCoupons) {
    const ordersToUse = await prisma.order.findMany({
      where: {
        merchantId: coupon.merchantId,
        customerId: { not: null },
        status: OrderStatus.DELIVERED,
      },
      take: Math.min(3, coupon.usageLimit - coupon.usedCount),
    });
    for (const order of ordersToUse) {
      if (order.customerId) {
        let discountAmount = 0;
        if (coupon.couponType === CouponType.FIXED_AMOUNT) {
          discountAmount = coupon.discountAmount ?? 0;
        } else if (coupon.couponType === CouponType.PERCENTAGE) {
          discountAmount = order.amount * (coupon.discountPercent ?? 0) / 100;
          if (coupon.maxDiscount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          }
        }
        await prisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            orderId: order.id,
            customerId: order.customerId,
            discountAmount,
          },
        });
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
        couponUsagesCount++;
      }
    }
  }
  console.log(`✅ 已创建 ${couponUsagesCount} 条优惠券使用记录`);

  // 创建库存预警
  console.log('\n⚠️ 创建库存预警...');
  const allWarehouses = await prisma.warehouse.findMany();
  let alertsCount = 0;
  for (const warehouse of allWarehouses) {
    if (warehouse.currentStock <= warehouse.capacity * 0.2) {
      const products = await prisma.product.findMany({
        where: { merchantId: merchant.id },
        take: 3,
      });
      for (const product of products) {
        const alertLevel = warehouse.currentStock <= warehouse.capacity * 0.1 ? AlertLevel.CRITICAL : AlertLevel.LOW;
        await prisma.inventoryAlert.create({
          data: {
            warehouseId: warehouse.id,
            productId: product.id,
            currentStock: warehouse.currentStock,
            alertThreshold: alertLevel === AlertLevel.CRITICAL ? warehouse.capacity * 0.1 : warehouse.capacity * 0.2,
            alertLevel,
            isResolved: false,
          },
        });
        alertsCount++;
      }
    }
  }
  console.log(`✅ 已创建 ${alertsCount} 条库存预警记录`);

  // 创建路线优化记录
  console.log('\n🗺️ 创建路线优化记录...');
  const ordersWithRoute = await prisma.order.findMany({
    where: {
      distance: { not: null },
    },
    take: 20,
  });
  let optimizationsCount = 0;
  for (const order of ordersWithRoute) {
    if (order.distance) {
      const originalDistance = order.distance;
      const optimizedDistance = originalDistance * (0.85 + Math.random() * 0.1); // 优化后减少5-15%
      const originalTime = Math.floor(originalDistance * 10); // 假设10分钟/公里
      const optimizedTime = Math.floor(optimizedDistance * 10);
      await prisma.routeOptimization.create({
        data: {
          orderId: order.id,
          originalDistance,
          optimizedDistance,
          originalTime,
          optimizedTime,
          savedDistance: originalDistance - optimizedDistance,
          savedTime: originalTime - optimizedTime,
          optimizationAlgorithm: 'Dijkstra',
        },
      });
      optimizationsCount++;
    }
  }
  console.log(`✅ 已创建 ${optimizationsCount} 条路线优化记录`);

  // 创建通知记录
  console.log('\n🔔 创建通知记录...');
  let notificationsCount = 0;
  // 为商家创建通知
  const merchantNotifications = [
    { type: NotificationType.ORDER_STATUS, title: '新订单提醒', content: '您有新的订单待处理' },
    { type: NotificationType.PAYMENT, title: '支付成功', content: '订单支付成功，请及时发货' },
    { type: NotificationType.SYSTEM, title: '系统维护通知', content: '系统将于今晚进行维护' },
  ];
  for (const notif of merchantNotifications) {
    await prisma.notification.create({
      data: {
        recipientId: merchant.id,
        recipientType: RecipientType.MERCHANT,
        notificationType: notif.type,
        title: notif.title,
        content: notif.content,
        isRead: Math.random() < 0.5,
      },
    });
    notificationsCount++;
  }
  // 为客户创建通知
  const customersForNotif = await prisma.customer.findMany({ take: 10 });
  for (const customer of customersForNotif) {
    const customerOrders = await prisma.order.findMany({
      where: { customerId: customer.id },
      take: 2,
    });
    for (const order of customerOrders) {
      await prisma.notification.create({
        data: {
          recipientId: customer.id,
          recipientType: RecipientType.CUSTOMER,
          notificationType: NotificationType.ORDER_STATUS,
          title: `订单${order.orderNo}状态更新`,
          content: `您的订单${order.orderNo}状态已更新为${order.status}`,
          isRead: false,
        },
      });
      notificationsCount++;
    }
  }
  // 为配送员创建通知
  const driversForNotif = await prisma.deliveryDriver.findMany({ take: 5 });
  for (const driver of driversForNotif) {
    await prisma.notification.create({
      data: {
        recipientId: driver.id,
        recipientType: RecipientType.DRIVER,
        notificationType: NotificationType.DELIVERY,
        title: '新配送任务',
        content: `您有新的配送任务待处理`,
        isRead: false,
      },
    });
    notificationsCount++;
  }
  console.log(`✅ 已创建 ${notificationsCount} 条通知记录`);

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
