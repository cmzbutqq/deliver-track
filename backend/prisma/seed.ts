import { PrismaClient, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据填充...');

  // 创建物流公司
  const logisticsCompanies = [
    { name: '顺丰速运', timeLimit: 24 },
    { name: '京东物流', timeLimit: 24 },
    { name: '圆通速递', timeLimit: 48 },
    { name: '中通快递', timeLimit: 48 },
    { name: '申通快递', timeLimit: 72 },
    { name: '韵达速递', timeLimit: 72 },
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

  // 创建配送区域（北京市中心）
  const deliveryZone = await prisma.deliveryZone.create({
    data: {
      merchantId: merchant.id,
      name: '北京市中心配送区',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [116.3, 39.85],
            [116.5, 39.85],
            [116.5, 40.0],
            [116.3, 40.0],
            [116.3, 39.85],
          ],
        ],
      },
      timeLimit: 24,
    },
  });

  console.log('✅ 创建配送区域:', deliveryZone.name);

  // 创建模拟订单
  const orders = [
    {
      receiverName: '张三',
      receiverPhone: '13900139001',
      receiverAddress: '北京市朝阳区望京街道',
      productName: 'iPhone 15 Pro',
      productQuantity: 1,
      amount: 8999,
      origin: {
        lng: 116.397428,
        lat: 39.90923,
        address: '北京市东城区天安门广场',
      },
      destination: {
        lng: 116.473168,
        lat: 39.996648,
        address: '北京市朝阳区望京街道',
      },
      logistics: '顺丰速运',
    },
    {
      receiverName: '李四',
      receiverPhone: '13900139002',
      receiverAddress: '北京市海淀区中关村大街',
      productName: 'MacBook Pro',
      productQuantity: 1,
      amount: 15999,
      origin: {
        lng: 116.397428,
        lat: 39.90923,
        address: '北京市东城区天安门广场',
      },
      destination: {
        lng: 116.310316,
        lat: 39.989896,
        address: '北京市海淀区中关村大街',
      },
      logistics: '京东物流',
    },
    {
      receiverName: '王五',
      receiverPhone: '13900139003',
      receiverAddress: '北京市西城区金融街',
      productName: 'iPad Air',
      productQuantity: 2,
      amount: 9998,
      origin: {
        lng: 116.397428,
        lat: 39.90923,
        address: '北京市东城区天安门广场',
      },
      destination: {
        lng: 116.36123,
        lat: 39.916345,
        address: '北京市西城区金融街',
      },
      logistics: '顺丰速运',
    },
    {
      receiverName: '赵六',
      receiverPhone: '13900139004',
      receiverAddress: '北京市丰台区方庄',
      productName: 'AirPods Pro',
      productQuantity: 1,
      amount: 1999,
      origin: {
        lng: 116.397428,
        lat: 39.90923,
        address: '北京市东城区天安门广场',
      },
      destination: {
        lng: 116.439631,
        lat: 39.863642,
        address: '北京市丰台区方庄',
      },
      logistics: '中通快递',
    },
    {
      receiverName: '孙七',
      receiverPhone: '13900139005',
      receiverAddress: '北京市石景山区石景山路',
      productName: 'Apple Watch',
      productQuantity: 1,
      amount: 3199,
      origin: {
        lng: 116.397428,
        lat: 39.90923,
        address: '北京市东城区天安门广场',
      },
      destination: {
        lng: 116.222982,
        lat: 39.906611,
        address: '北京市石景山区石景山路',
      },
      logistics: '韵达快递',
    },
  ];

  for (const orderData of orders) {
    const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    // 根据物流公司计算预计送达时间
    const company = logisticsCompanies.find(c => c.name === orderData.logistics);
    const timeLimit = company?.timeLimit || 48;
    const estimatedTime = new Date(Date.now() + timeLimit * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        orderNo,
        merchantId: merchant.id,
        status: OrderStatus.PENDING,
        ...orderData,
        estimatedTime,
      },
    });

    // 创建初始时间线
    await prisma.logisticsTimeline.create({
      data: {
        orderId: order.id,
        status: '订单已创建',
        description: '商家已创建订单',
        location: orderData.origin.address,
      },
    });

    console.log(`✅ 创建订单: ${orderNo} - ${orderData.receiverName} (${orderData.logistics})`);
  }

  // 创建一个已发货的订单用于演示
  const shippingOrderNo = `ORD${Date.now()}${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`;

  const shippingOrder = await prisma.order.create({
    data: {
      orderNo: shippingOrderNo,
      merchantId: merchant.id,
      status: OrderStatus.SHIPPING,
      receiverName: '测试用户',
      receiverPhone: '13900139999',
      receiverAddress: '北京市朝阳区三里屯',
      productName: 'iPhone 15',
      productQuantity: 1,
      amount: 6999,
      origin: {
        lng: 116.397428,
        lat: 39.90923,
        address: '北京市东城区天安门广场',
      },
      destination: {
        lng: 116.455395,
        lat: 39.937458,
        address: '北京市朝阳区三里屯',
      },
      currentLocation: {
        lng: 116.397428,
        lat: 39.90923,
      },
      logistics: '顺丰速运',
      estimatedTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后
    },
  });

  // 为运输中订单创建路径
  const routePoints = [
    [116.397428, 39.90923], // 起点
    [116.41, 39.915],
    [116.425, 39.92],
    [116.44, 39.925],
    [116.455395, 39.937458], // 终点
  ];

  await prisma.route.create({
    data: {
      orderId: shippingOrder.id,
      points: routePoints,
      currentStep: 0,
      totalSteps: routePoints.length,
      interval: 5000,
    },
  });

  // 添加时间线
  await prisma.logisticsTimeline.createMany({
    data: [
      {
        orderId: shippingOrder.id,
        status: '订单已创建',
        description: '商家已创建订单',
        location: '北京市东城区天安门广场',
        timestamp: new Date(Date.now() - 3600000), // 1小时前
      },
      {
        orderId: shippingOrder.id,
        status: '已揽收',
        description: '快递已从发货地揽收',
        location: '北京市东城区天安门广场',
        timestamp: new Date(Date.now() - 1800000), // 30分钟前
      },
    ],
  });

  console.log(`✅ 创建运输中订单: ${shippingOrderNo} (用于实时追踪演示)`);

  console.log('🎉 数据填充完成！');
  console.log('\n📝 测试账号信息:');
  console.log('用户名: merchant1');
  console.log('密码: 123456');
  console.log(`\n📦 运输中订单号: ${shippingOrderNo} (可用于实时追踪测试)`);
}

main()
  .catch((e) => {
    console.error('❌ 数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

