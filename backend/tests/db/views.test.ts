import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试视图功能
 */
async function testViews() {
  console.log('🧪 开始测试视图...\n');

  try {
    // 测试1: 商家订单汇总视图
    console.log('测试1: v_merchant_order_summary');
    const merchant = await prisma.merchant.findFirst();
    if (merchant) {
      const result = await prisma.$queryRaw`
        SELECT * FROM v_merchant_order_summary WHERE merchant_id = ${merchant.id}
      `;
      console.log('✅ 视图查询成功');
      console.log('   结果:', JSON.stringify(result, null, 2));
    }

    // 测试2: 配送员绩效视图
    console.log('\n测试2: v_delivery_driver_performance');
    const result2 = await prisma.$queryRaw`
      SELECT * FROM v_delivery_driver_performance LIMIT 5
    `;
    console.log('✅ 视图查询成功');
    console.log('   结果数量:', Array.isArray(result2) ? result2.length : 0);

    // 测试3: 仓库库存视图
    console.log('\n测试3: v_warehouse_inventory');
    const result3 = await prisma.$queryRaw`
      SELECT * FROM v_warehouse_inventory
    `;
    console.log('✅ 视图查询成功');
    console.log('   结果数量:', Array.isArray(result3) ? result3.length : 0);

    // 测试4: 订单追踪详情视图
    console.log('\n测试4: v_order_tracking_detail');
    const order = await prisma.order.findFirst();
    if (order) {
      const result4 = await prisma.$queryRaw`
        SELECT * FROM v_order_tracking_detail WHERE order_id = ${order.id}
      `;
      console.log('✅ 视图查询成功');
      console.log('   结果:', Array.isArray(result4) && result4.length > 0 ? '有数据' : '无数据');
    }

    // 测试5: 物流公司统计视图
    console.log('\n测试5: v_logistics_company_statistics');
    const result5 = await prisma.$queryRaw`
      SELECT * FROM v_logistics_company_statistics
    `;
    console.log('✅ 视图查询成功');
    console.log('   结果数量:', Array.isArray(result5) ? result5.length : 0);

    console.log('\n✅ 所有视图测试完成！');
  } catch (error) {
    console.error('❌ 视图测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testViews();

