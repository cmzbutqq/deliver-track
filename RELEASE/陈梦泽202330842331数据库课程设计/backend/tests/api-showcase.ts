/**
 * API 展示测试 - 独立功能点演示（2025-11-22 更新）
 * 
 * 交互式菜单，可以单独运行某个场景来展示特定功能
 * 
 * 新增场景：
 * - 场景 2.5: 物流公司管理演示
 * - 场景 3.5: 商家地址管理演示
 * - 场景 4.5: 订单批量操作演示
 * - 场景 6: 数据统计演示（重写）
 */

import axios from 'axios';
import * as readline from 'readline';

const BASE_URL = 'http://localhost:3000';
const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// 颜色工具
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

const log = (msg: string, color = c.reset) => console.log(`${color}${msg}${c.reset}`);

// 等待函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 交互式菜单
function showMenu() {
  console.clear();
  log('╔════════════════════════════════════════════════════════════════╗', c.cyan + c.bright);
  log('║      电商物流配送可视化平台 - API 功能演示 (v2.0)            ║', c.cyan + c.bright);
  log('╠════════════════════════════════════════════════════════════════╣', c.cyan + c.bright);
  log('║                                                                ║', c.cyan);
  log('║  基础功能:                                                     ║', c.cyan);
  log('║  1. 认证系统演示 - 登录与授权                                 ║', c.cyan);
  log('║  2. 订单管理演示 - CRUD 完整流程                              ║', c.cyan);
  log('║  3. 路径规划演示 - 高德地图集成                               ║', c.cyan);
  log('║  4. 实时追踪演示 - 公开接口测试                               ║', c.cyan);
  log('║  5. 配送区域演示 - 地理空间计算                               ║', c.cyan);
  log('║                                                                ║', c.cyan);
  log('║  新增功能: ⭐                                                  ║', c.cyan);
  log('║  6. 物流公司管理 - 时效配置与查询                             ║', c.yellow);
  log('║  7. 商家地址管理 - 发货地址配置                               ║', c.yellow);
  log('║  8. 订单批量操作 - 批量发货与删除                             ║', c.yellow);
  log('║  9. 数据统计分析 - 总览/区域/物流公司                         ║', c.yellow);
  log('║                                                                ║', c.cyan);
  log('║  综合测试:                                                     ║', c.cyan);
  log('║  10. 性能压测演示 - 并发请求测试                              ║', c.cyan);
  log('║  11. 错误处理演示 - 异常场景测试                              ║', c.cyan);
  log('║  12. 完整流程演示 - 端到端业务                                ║', c.cyan);
  log('║                                                                ║', c.cyan);
  log('║  0. 退出                                                       ║', c.cyan);
  log('║                                                                ║', c.cyan);
  log('╚════════════════════════════════════════════════════════════════╝', c.cyan + c.bright);
  console.log();
}

// 1. 认证系统演示
async function demoAuth() {
  log('\n【场景 1: 认证系统演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  log('\n➤ 测试 1: 正确的用户名密码', c.yellow);
  try {
    const res = await client.post('/auth/login', {
      username: 'merchant1',
      password: '123456',
    });
    log('✓ 登录成功', c.green);
    log(`  Token: ${res.data.access_token.substring(0, 30)}...`, c.cyan);
    log(`  用户: ${res.data.user.username}`, c.cyan);

    const token = res.data.access_token;

    log('\n➤ 测试 2: 访问受保护的接口', c.yellow);
    const meRes = await client.get('/merchants/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    log('✓ 认证通过，获取商家信息成功', c.green);
    log(`  商家名称: ${meRes.data.data.name || '未设置'}`, c.cyan);
    log(`  发货地址: ${meRes.data.data.address ? meRes.data.data.address.address : '未配置'}`, c.cyan);
  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  log('\n➤ 测试 3: 错误的密码', c.yellow);
  try {
    await client.post('/auth/login', {
      username: 'merchant1',
      password: 'wrongpassword',
    });
  } catch (err: any) {
    log('✓ 正确拒绝: ' + err.response?.data?.message, c.green);
  }

  log('\n➤ 测试 4: 不存在的用户', c.yellow);
  try {
    await client.post('/auth/login', {
      username: 'nonexistent',
      password: '123456',
    });
  } catch (err: any) {
    log('✓ 正确拒绝: ' + err.response?.data?.message, c.green);
  }

  log('\n➤ 测试 5: 不带 Token 访问受保护接口', c.yellow);
  try {
    await client.get('/merchants/me');
  } catch (err: any) {
    log('✓ 正确拒绝: 401 Unauthorized', c.green);
  }

  log('\n' + '━'.repeat(70), c.blue);
  log('认证系统演示完成！\n', c.bright + c.green);
}

// 2. 订单管理演示
async function demoOrders() {
  log('\n【场景 2: 订单管理演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  const token = loginRes.data.access_token;
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  log('\n➤ 测试 1: 查询所有订单', c.yellow);
  const allOrders = await client.get('/orders');
  log(`✓ 找到 ${allOrders.data.length} 个订单`, c.green);

  log('\n➤ 测试 2: 按状态筛选订单', c.yellow);
  const statuses = ['PENDING', 'SHIPPING', 'DELIVERED'];
  for (const status of statuses) {
    const res = await client.get('/orders', { params: { status } });
    log(`  ${status}: ${res.data.length} 个`, c.cyan);
  }

  log('\n➤ 测试 3: 创建新订单（自动使用商家发货地址）', c.yellow);
  const newOrder = await client.post('/orders', {
    receiverName: '测试用户',
    receiverPhone: '13800138000',
    receiverAddress: '北京市海淀区中关村',
    productName: '测试商品',
    productQuantity: 1,
    amount: 999,
    destination: {
      lng: 116.310003,
      lat: 39.990419,
      address: '北京市海淀区中关村',
    },
    logistics: '顺丰速运',
  });
  log(`✓ 订单创建成功: ${newOrder.data.orderNo}`, c.green);
  log(`  起点（自动使用商家地址）: ${newOrder.data.origin.address}`, c.cyan);
  log(`  预计送达: ${new Date(newOrder.data.estimatedTime).toLocaleString('zh-CN')}`, c.cyan);

  const orderId = newOrder.data.id;

  log('\n➤ 测试 4: 查询订单详情', c.yellow);
  const detail = await client.get(`/orders/${orderId}`);
  log(`✓ 订单号: ${detail.data.orderNo}`, c.green);
  log(`  状态: ${detail.data.status}`, c.cyan);
  log(`  时间线记录: ${detail.data.timeline.length} 条`, c.cyan);

  log('\n➤ 测试 5: 更新订单信息', c.yellow);
  const updated = await client.patch(`/orders/${orderId}`, {
    receiverPhone: '13900139000',
    amount: 1299,
  });
  log(`✓ 更新成功`, c.green);
  log(`  新手机号: ${updated.data.receiverPhone}`, c.cyan);
  log(`  新金额: ¥${updated.data.amount}`, c.cyan);

  log('\n➤ 测试 6: 订单发货（路径规划）', c.yellow);
  log('  正在调用高德地图API规划路径...', c.yellow);
  const shipped = await client.post(`/orders/${orderId}/ship`, {
    interval: 5000,
  });
  log(`✓ 发货成功`, c.green);
  log(`  状态变更: ${shipped.data.status}`, c.cyan);

  const orderWithRoute = await client.get(`/orders/${orderId}`);
  if (orderWithRoute.data.route) {
    log(`  规划路径点: ${orderWithRoute.data.route.totalSteps} 个`, c.cyan);
  }

  log('\n➤ 测试 7: 删除订单', c.yellow);
  await client.delete(`/orders/${orderId}`);
  log(`✓ 订单删除成功`, c.green);

  log('\n' + '━'.repeat(70), c.blue);
  log('订单管理演示完成！\n', c.bright + c.green);
}

// 6. 物流公司管理演示 (新增)
async function demoLogistics() {
  log('\n【场景 6: 物流公司管理演示 ⭐ 新功能】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  log('\n➤ 测试 1: 获取所有物流公司（公开接口，无需认证）', c.yellow);
  try {
    const res = await client.get('/logistics-companies');
    const companies = res.data.data;

    log(`✓ 系统预置 ${companies.length} 家物流公司`, c.green);
    log('\n  物流公司列表:', c.cyan);
    
    companies.forEach((company: any, index: number) => {
      log(`    ${index + 1}. ${company.name}`, c.bright);
      log(`       • 配送时效: ${company.timeLimit} 小时`, c.cyan);
      log(`       • ID: ${company.id}`, c.yellow);
    });

    log('\n➤ 测试 2: 时效分类统计', c.yellow);
    const fast = companies.filter((c: any) => c.timeLimit <= 24);
    const normal = companies.filter((c: any) => c.timeLimit > 24 && c.timeLimit <= 48);
    const slow = companies.filter((c: any) => c.timeLimit > 48);
    
    log(`  次日达 (≤24h): ${fast.map((c: any) => c.name).join('、')} (${fast.length}家)`, c.green);
    log(`  2日达 (≤48h): ${normal.map((c: any) => c.name).join('、')} (${normal.length}家)`, c.cyan);
    log(`  3日达 (>48h): ${slow.map((c: any) => c.name).join('、')} (${slow.length}家)`, c.yellow);

    log('\n➤ 测试 3: 创建订单时自动计算时效', c.yellow);
    const loginRes = await client.post('/auth/login', {
      username: 'merchant1',
      password: '123456',
    });
    client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;

    // 创建顺丰订单
    const order1 = await client.post('/orders', {
      receiverName: '测试用户',
      receiverPhone: '13800000000',
      receiverAddress: '测试地址',
      productName: '测试商品',
      productQuantity: 1,
      amount: 100,
      destination: { lng: 116.4, lat: 39.9, address: '测试地址' },
      logistics: '顺丰速运',
    });

    const createdTime = new Date(order1.data.createdAt);
    const estimatedTime = new Date(order1.data.estimatedTime);
    const hoursDiff = (estimatedTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

    log(`  ✓ 顺丰速运订单创建成功`, c.green);
    log(`    创建时间: ${createdTime.toLocaleString('zh-CN')}`, c.cyan);
    log(`    预计送达: ${estimatedTime.toLocaleString('zh-CN')}`, c.cyan);
    log(`    时效: ${hoursDiff.toFixed(1)} 小时 (标准时效: 24小时)`, c.yellow);

    // 创建韵达订单
    const order2 = await client.post('/orders', {
      receiverName: '测试用户',
      receiverPhone: '13800000000',
      receiverAddress: '测试地址',
      productName: '测试商品',
      productQuantity: 1,
      amount: 100,
      destination: { lng: 116.4, lat: 39.9, address: '测试地址' },
      logistics: '韵达速递',
    });

    const createdTime2 = new Date(order2.data.createdAt);
    const estimatedTime2 = new Date(order2.data.estimatedTime);
    const hoursDiff2 = (estimatedTime2.getTime() - createdTime2.getTime()) / (1000 * 60 * 60);

    log(`  ✓ 韵达速递订单创建成功`, c.green);
    log(`    创建时间: ${createdTime2.toLocaleString('zh-CN')}`, c.cyan);
    log(`    预计送达: ${estimatedTime2.toLocaleString('zh-CN')}`, c.cyan);
    log(`    时效: ${hoursDiff2.toFixed(1)} 小时 (标准时效: 72小时)`, c.yellow);

    // 清理测试订单
    await client.delete(`/orders/${order1.data.id}`);
    await client.delete(`/orders/${order2.data.id}`);

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  log('\n' + '━'.repeat(70), c.blue);
  log('物流公司管理演示完成！\n', c.bright + c.green);
}

// 7. 商家地址管理演示 (新增)
async function demoMerchantAddress() {
  log('\n【场景 7: 商家地址管理演示 ⭐ 新功能】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;

  log('\n➤ 测试 1: 查看当前发货地址', c.yellow);
  try {
    const res = await client.get('/merchants/me');
    const merchant = res.data.data;

    if (merchant.address) {
      log('✓ 商家已配置默认发货地址', c.green);
      log(`  经度: ${merchant.address.lng}`, c.cyan);
      log(`  纬度: ${merchant.address.lat}`, c.cyan);
      log(`  地址: ${merchant.address.address}`, c.cyan);
    } else {
      log('  商家尚未配置发货地址，将使用系统默认地址', c.yellow);
    }
  } catch (err: any) {
    log(`✗ ${err.message}`, c.red);
  }

  log('\n➤ 测试 2: 更新商家发货地址', c.yellow);
  try {
    const newAddress = {
      lng: 116.407396,
      lat: 39.904211,
      address: '北京市东城区天安门广场',
    };

    const res = await client.patch('/merchants/me', {
      address: newAddress,
    });

    log('✓ 发货地址更新成功', c.green);
    log(`  经度: ${res.data.data.address.lng}`, c.cyan);
    log(`  纬度: ${res.data.data.address.lat}`, c.cyan);
    log(`  地址: ${res.data.data.address.address}`, c.cyan);

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  log('\n➤ 测试 3: 创建订单验证自动使用发货地址', c.yellow);
  try {
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

    log('✓ 订单创建成功', c.green);
    log(`  订单号: ${order.data.orderNo}`, c.cyan);
    log(`  起点（自动使用商家地址）:`, c.yellow);
    log(`    经度: ${order.data.origin.lng}`, c.cyan);
    log(`    纬度: ${order.data.origin.lat}`, c.cyan);
    log(`    地址: ${order.data.origin.address}`, c.cyan);

    // 清理测试订单
    await client.delete(`/orders/${order.data.id}`);

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  log('\n  地址管理说明:', c.yellow);
  log('    • 创建订单时自动作为起点', c.cyan);
  log('    • 无需每次手动输入发货地址', c.cyan);
  log('    • 支持随时修改', c.cyan);

  log('\n' + '━'.repeat(70), c.blue);
  log('商家地址管理演示完成！\n', c.bright + c.green);
}

// 8. 订单批量操作演示 (新增)
async function demoBatchOperations() {
  log('\n【场景 8: 订单批量操作演示 ⭐ 新功能】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;

  log('\n➤ 准备: 创建5个测试订单', c.yellow);
  const testOrders: any[] = [];
  
  for (let i = 0; i < 5; i++) {
    const order = await client.post('/orders', {
      receiverName: `批量测试用户${i + 1}`,
      receiverPhone: '13800000000',
      receiverAddress: '北京市测试地址',
      productName: '批量测试商品',
      productQuantity: 1,
      amount: 100,
      destination: { lng: 116.4 + i * 0.01, lat: 39.9, address: '北京市测试地址' },
      logistics: '圆通速递',
    });
    testOrders.push(order.data);
  }

  log(`✓ 已创建 ${testOrders.length} 个测试订单`, c.green);
  testOrders.forEach((order, index) => {
    log(`  ${index + 1}. ${order.orderNo}`, c.cyan);
  });

  await sleep(500);

  log('\n➤ 测试 1: 批量发货操作', c.yellow);
  try {
    const orderIds = testOrders.slice(0, 3).map(o => o.id);
    log(`  准备发货 ${orderIds.length} 个订单...`, c.yellow);

    const res = await client.post('/orders/batch/ship', {
      orderIds,
    });

    log('✓ 批量发货完成', c.green);
    log(`  成功: ${res.data.data.shipped} 个`, c.green);
    log(`  失败: ${res.data.data.failed} 个`, res.data.data.failed > 0 ? c.red : c.cyan);
    log(`  总计: ${res.data.data.total} 个`, c.cyan);

    if (res.data.data.errors) {
      log('  错误详情:', c.red);
      res.data.data.errors.forEach((err: string) => {
        log(`    • ${err}`, c.red);
      });
    }

    log('\n  批量发货特性:', c.yellow);
    log('    • 自动跳过非待发货状态订单', c.cyan);
    log('    • 返回详细的成功/失败统计', c.cyan);
    log('    • 提供错误信息列表', c.cyan);

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  await sleep(500);

  log('\n➤ 测试 2: 批量删除操作', c.yellow);
  try {
    const remainingOrders = testOrders.slice(3);
    const orderIds = remainingOrders.map(o => o.id);

    log(`  准备删除 ${orderIds.length} 个待发货订单...`, c.yellow);

    const res = await client.delete('/orders/batch', {
      data: { orderIds },
    });

    log('✓ 批量删除完成', c.green);
    log(`  成功删除: ${res.data.data.deleted} 个`, c.green);
    log(`  失败: ${res.data.data.failed} 个`, c.cyan);
    log(`  总计: ${res.data.data.total} 个`, c.cyan);

    log('\n  批量删除特性:', c.yellow);
    log('    • 只能删除待发货/已取消订单', c.cyan);
    log('    • 自动过滤不符合条件的订单', c.cyan);
    log('    • 返回删除统计信息', c.cyan);

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  await sleep(500);

  log('\n➤ 测试 3: 尝试删除运输中订单（应该失败）', c.yellow);
  try {
    const shippingOrders = testOrders.slice(0, 1).map(o => o.id);
    
    const res = await client.delete('/orders/batch', {
      data: { orderIds: shippingOrders },
    });

    if (res.data.data.deleted === 0 && res.data.data.failed === 1) {
      log('✓ 正确拒绝删除运输中订单', c.green);
      log(`  删除: ${res.data.data.deleted} 个`, c.cyan);
      log(`  失败: ${res.data.data.failed} 个`, c.yellow);
    }

  } catch (err: any) {
    log(`✓ 系统正确阻止了非法删除操作`, c.green);
  }

  log('\n' + '━'.repeat(70), c.blue);
  log('订单批量操作演示完成！\n', c.bright + c.green);
}

// 9. 数据统计分析演示 (新增/重写)
async function demoStatistics() {
  log('\n【场景 9: 数据统计分析演示 ⭐ 新功能】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;

  log('\n➤ 测试 1: 总览统计', c.yellow);
  try {
    const res = await client.get('/statistics/overview');
    const stats = res.data.data;

    log('✓ 总览统计数据获取成功', c.green);
    log('\n  统计数据:', c.cyan);
    log(`    今日订单数: ${stats.todayOrders} 个`, c.bright);
    log(`    今日订单金额: ¥${stats.todayAmount.toFixed(2)}`, c.bright);
    log(`    运输中订单: ${stats.shippingOrders} 个`, c.yellow);
    log(`    已完成订单: ${stats.completedOrders} 个（累计）`, c.green);

    log('\n  用途说明:', c.yellow);
    log('    • 前端数据看板展示', c.cyan);
    log('    • 实时监控运营状态', c.cyan);
    log('    • 支持指定日期查询 (?date=2025-11-22)', c.cyan);

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  await sleep(500);

  log('\n➤ 测试 2: 配送区域统计', c.yellow);
  try {
    const res = await client.get('/statistics/zones');
    const zoneStats = res.data.data;

    log(`✓ 获取到 ${zoneStats.length} 个配送区域的统计数据`, c.green);
    
    if (zoneStats.length > 0) {
      log('\n  配送区域分析（前5个）:', c.cyan);
      zoneStats.slice(0, 5).forEach((zone: any, index: number) => {
        log(`    ${index + 1}. ${zone.zoneName}`, c.bright);
        log(`       订单数量: ${zone.orderCount} 个`, c.cyan);
        log(`       平均配送时长: ${zone.avgDeliveryTime.toFixed(2)} 小时`, c.yellow);
      });

      log('\n  用途说明:', c.yellow);
      log('    • 用于 ECharts Geo 地理柱状图', c.cyan);
      log('    • 支持按订单数/时长切换显示', c.cyan);
      log('    • 帮助商家优化配送区域规划', c.cyan);
    }

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  await sleep(500);

  log('\n➤ 测试 3: 物流公司统计', c.yellow);
  try {
    const res = await client.get('/statistics/logistics');
    const companyStats = res.data.data;

    log(`✓ 获取到 ${companyStats.length} 家物流公司的统计数据`, c.green);
    
    log('\n  物流公司效率对比:', c.cyan);
    companyStats.forEach((company: any, index: number) => {
      log(`    ${index + 1}. ${company.companyName}`, c.bright);
      log(`       订单数量: ${company.orderCount} 个`, c.cyan);
      log(`       平均配送时长: ${company.avgDeliveryTime.toFixed(2)} 小时`, c.yellow);
      log(`       准点率: ${(company.onTimeRate * 100).toFixed(1)}%`, company.onTimeRate >= 0.8 ? c.green : c.red);
    });

    log('\n  统计指标说明:', c.yellow);
    log('    • 平均配送时长 = 实际签收时间 - 订单创建时间', c.cyan);
    log('    • 准点率 = 实际送达 ≤ 预计送达的订单比例', c.cyan);
    log('    • 用于前端物流公司对比柱状图', c.cyan);

  } catch (err: any) {
    log(`✗ ${err.response?.data?.message || err.message}`, c.red);
  }

  log('\n' + '━'.repeat(70), c.blue);
  log('数据统计分析演示完成！\n', c.bright + c.green);
}

// 其他场景函数（保持原有实现）...
// 3. 路径规划演示
async function demoRouting() {
  log('\n【场景 3: 路径规划演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;

  log('\n➤ 创建订单并测试路径规划', c.yellow);
  
  const order = await client.post('/orders', {
    receiverName: '路径测试',
    receiverPhone: '13800138000',
    receiverAddress: '北京市朝阳区望京',
    productName: '测试商品',
    productQuantity: 1,
    amount: 100,
    destination: {
      lng: 116.481499,
      lat: 39.989675,
      address: '北京市朝阳区望京',
    },
    logistics: '顺丰速运',
  });

  log(`✓ 订单创建: ${order.data.orderNo}`, c.green);

  log('\n  开始发货，调用高德地图 API 规划路径...', c.yellow);
  const shipped = await client.post(`/orders/${order.data.id}/ship`);

  const orderDetail = await client.get(`/orders/${order.data.id}`);
  
  if (orderDetail.data.route) {
    log('✓ 路径规划完成', c.green);
    log(`  路径点数: ${orderDetail.data.route.totalSteps}`, c.cyan);
    log(`  推送间隔: ${orderDetail.data.route.interval / 1000}秒`, c.cyan);
    log(`  预计时长: ${Math.ceil(orderDetail.data.route.totalSteps * orderDetail.data.route.interval / 1000 / 60)}分钟`, c.cyan);
    
    log('\n  路径坐标点（前3个）:', c.yellow);
    const points = orderDetail.data.route.points.slice(0, 3);
    points.forEach((point: number[], index: number) => {
      log(`    ${index + 1}. [${point[0].toFixed(6)}, ${point[1].toFixed(6)}]`, c.cyan);
    });
  } else {
    log('  使用直线插值降级策略', c.yellow);
  }

  log('\n' + '━'.repeat(70), c.blue);
  log('路径规划演示完成！\n', c.bright + c.green);
}

// 4. 实时追踪演示
async function demoTracking() {
  log('\n【场景 4: 实时追踪演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  log('\n➤ 测试公开追踪接口（无需认证）', c.yellow);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;

  const orders = await client.get('/orders', { params: { status: 'SHIPPING' } });

  if (orders.data.length > 0) {
    const order = orders.data[0];
    log(`\n  测试订单: ${order.orderNo}`, c.cyan);

    delete client.defaults.headers.common['Authorization'];
    const tracking = await client.get(`/tracking/${order.orderNo}`);

    log('  ✓ 查询成功', c.green);
    log(`    状态: ${tracking.data.data.status}`, c.cyan);
    log(`    当前位置: [${tracking.data.data.currentLocation.lng.toFixed(6)}, ${tracking.data.data.currentLocation.lat.toFixed(6)}]`, c.cyan);
    log(`    配送进度: ${((tracking.data.data.route.currentStep / tracking.data.data.route.totalSteps) * 100).toFixed(1)}%`, c.cyan);
    log(`    预计送达: ${new Date(tracking.data.data.estimatedTime).toLocaleString('zh-CN')}`, c.cyan);
  } else {
    log('  当前没有运输中的订单', c.yellow);
    log('  提示: 先运行场景2创建订单并发货', c.cyan);
  }

  log('\n' + '━'.repeat(70), c.blue);
  log('实时追踪演示完成！\n', c.bright + c.green);
}

// 5. 配送区域演示
async function demoDeliveryZones() {
  log('\n【场景 5: 配送区域演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;

  log('\n➤ 测试 1: 创建配送区域', c.yellow);
  const zone = await client.post('/delivery-zones', {
    name: 'API测试配送区',
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
  log(`✓ 创建成功: ${zone.data.name}`, c.green);
  log(`  配送时效: ${zone.data.timeLimit}小时`, c.cyan);

  log('\n➤ 测试 2: 查询区域内订单', c.yellow);
  const ordersInZone = await client.get(`/delivery-zones/${zone.data.id}/orders`);
  log(`✓ 找到 ${ordersInZone.data.length} 个区域内订单`, c.green);

  log('\n➤ 测试 3: 查询所有配送区域', c.yellow);
  const allZones = await client.get('/delivery-zones');
  log(`✓ 共有 ${allZones.data.length} 个配送区域`, c.green);

  log('\n' + '━'.repeat(70), c.blue);
  log('配送区域演示完成！\n', c.bright + c.green);
}

// 10. 性能压测演示
async function demoPerformance() {
  log('\n【场景 10: 性能压测演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  const token = loginRes.data.access_token;

  log('\n➤ 测试 1: 单次请求响应时间', c.yellow);
  const times: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await client.get('/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const duration = Date.now() - start;
    times.push(duration);
    log(`  请求 ${i + 1}: ${duration}ms`, c.cyan);
  }
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  log(`✓ 平均响应时间: ${avgTime.toFixed(2)}ms`, c.green);

  log('\n➤ 测试 2: 并发请求处理', c.yellow);
  const concurrency = 20;
  log(`  发起 ${concurrency} 个并发请求...`, c.yellow);
  const start = Date.now();
  const promises = Array(concurrency)
    .fill(0)
    .map(() =>
      client.get('/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
  await Promise.all(promises);
  const totalTime = Date.now() - start;
  log(`✓ ${concurrency} 个请求完成，总耗时: ${totalTime}ms`, c.green);
  log(`  平均每个请求: ${(totalTime / concurrency).toFixed(2)}ms`, c.cyan);
  log(`  吞吐量: ${((concurrency / totalTime) * 1000).toFixed(2)} req/s`, c.cyan);

  log('\n' + '━'.repeat(70), c.blue);
  log('性能压测演示完成！\n', c.bright + c.green);
}

// 11. 错误处理演示
async function demoErrorHandling() {
  log('\n【场景 11: 错误处理演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);

  log('\n➤ 测试 1: 访问不存在的订单', c.yellow);
  try {
    const token = (await client.post('/auth/login', { username: 'merchant1', password: '123456' })).data.access_token;
    await client.get('/orders/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err: any) {
    log(`✓ 正确返回错误: ${err.response?.status} ${err.response?.data?.message}`, c.green);
  }

  log('\n➤ 测试 2: 缺少必填字段', c.yellow);
  try {
    const token = (await client.post('/auth/login', { username: 'merchant1', password: '123456' })).data.access_token;
    await client.post('/orders', { receiverName: '测试' }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err: any) {
    log(`✓ 正确返回验证错误: ${err.response?.status}`, c.green);
  }

  log('\n' + '━'.repeat(70), c.blue);
  log('错误处理演示完成！\n', c.bright + c.green);
}

// 12. 完整流程演示
async function demoFullWorkflow() {
  log('\n【场景 12: 完整流程演示】', c.bright + c.blue);
  log('━'.repeat(70), c.blue);
  
  log('\n提示: 请运行 pnpm demo 查看完整的端到端业务流程演示', c.yellow);
  log('这里仅演示核心步骤...', c.cyan);
  
  await sleep(1000);
  
  log('\n1. 商家登录...', c.cyan);
  const loginRes = await client.post('/auth/login', {
    username: 'merchant1',
    password: '123456',
  });
  log('✓ 登录成功', c.green);
  
  client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;
  
  await sleep(500);
  
  log('\n2. 创建订单...', c.cyan);
  const order = await client.post('/orders', {
    receiverName: '完整流程测试',
    receiverPhone: '13800138000',
    receiverAddress: '北京市朝阳区',
    productName: '测试商品',
    productQuantity: 1,
    amount: 999,
    destination: { lng: 116.48, lat: 39.99, address: '北京市朝阳区' },
    logistics: '顺丰速运',
  });
  log(`✓ 订单创建: ${order.data.orderNo}`, c.green);
  
  await sleep(500);
  
  log('\n3. 订单发货...', c.cyan);
  await client.post(`/orders/${order.data.id}/ship`);
  log('✓ 发货成功', c.green);
  
  await sleep(500);
  
  log('\n4. 查询物流信息...', c.cyan);
  delete client.defaults.headers.common['Authorization'];
  const tracking = await client.get(`/tracking/${order.data.orderNo}`);
  log(`✓ 查询成功，当前进度: ${((tracking.data.data.route.currentStep / tracking.data.data.route.totalSteps) * 100).toFixed(1)}%`, c.green);
  
  log('\n' + '━'.repeat(70), c.blue);
  log('完整流程演示完成！\n', c.bright + c.green);
}

// 主菜单循环
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 检查连接
  log('\n正在检查后端服务连接...', c.yellow);
  try {
    await client.post('/auth/login', { username: 'test', password: 'test' });
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      log('✗ 无法连接到后端服务 (http://localhost:3000)', c.red);
      log('  请先启动后端服务: cd backend && pnpm start:dev', c.yellow);
      process.exit(1);
    }
    log('✓ 后端服务已启动', c.green);
  }

  const promptUser = () => {
    showMenu();
    rl.question(log('请选择要运行的场景 (0-12): ', c.bright + c.cyan) || '', async (answer) => {
      const choice = answer.trim();
      
      try {
        switch (choice) {
          case '0':
            log('\n再见！\n', c.bright + c.green);
            rl.close();
            process.exit(0);
            return;
          case '1':
            await demoAuth();
            break;
          case '2':
            await demoOrders();
            break;
          case '3':
            await demoRouting();
            break;
          case '4':
            await demoTracking();
            break;
          case '5':
            await demoDeliveryZones();
            break;
          case '6':
            await demoLogistics();
            break;
          case '7':
            await demoMerchantAddress();
            break;
          case '8':
            await demoBatchOperations();
            break;
          case '9':
            await demoStatistics();
            break;
          case '10':
            await demoPerformance();
            break;
          case '11':
            await demoErrorHandling();
            break;
          case '12':
            await demoFullWorkflow();
            break;
          default:
            log('\n✗ 无效选项，请重新选择\n', c.red);
        }
      } catch (error: any) {
        log(`\n✗ 演示出错: ${error.message}\n`, c.red);
      }

      log('\n按回车键继续...', c.yellow);
      rl.once('line', () => {
        promptUser();
      });
    });
  };

  promptUser();
}

// 启动
if (require.main === module) {
  main();
}
