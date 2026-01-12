import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试新增的视图功能
 */
async function testExtendedViews() {
  console.log('🧪 开始测试新增视图...\n');

  try {
    // 测试1: 客户订单汇总视图
    console.log('测试1: 客户订单汇总视图 (v_customer_order_summary)');
    const customerSummary = await prisma.$queryRaw`
      SELECT * FROM v_customer_order_summary LIMIT 5
    `;
    if (Array.isArray(customerSummary) && customerSummary.length > 0) {
      console.log('  ✅ 视图查询成功');
      console.log(`     返回 ${customerSummary.length} 条记录`);
      const first = customerSummary[0] as any;
      console.log(`     示例: ${first.customer_name} - 订单数: ${first.total_orders}, 总金额: ${first.total_amount}`);
    }

    // 测试2: 费用结算明细视图
    console.log('\n测试2: 费用结算明细视图 (v_fee_settlement_detail)');
    const settlementDetail = await prisma.$queryRaw`
      SELECT * FROM v_fee_settlement_detail LIMIT 5
    `;
    if (Array.isArray(settlementDetail) && settlementDetail.length > 0) {
      console.log('  ✅ 视图查询成功');
      console.log(`     返回 ${settlementDetail.length} 条记录`);
    } else {
      console.log('  ⚠️  视图返回空结果（可能无结算单数据）');
    }

    // 测试3: 配送员排班视图
    console.log('\n测试3: 配送员排班视图 (v_driver_schedule_summary)');
    const scheduleSummary = await prisma.$queryRaw`
      SELECT * FROM v_driver_schedule_summary LIMIT 5
    `;
    if (Array.isArray(scheduleSummary) && scheduleSummary.length > 0) {
      console.log('  ✅ 视图查询成功');
      console.log(`     返回 ${scheduleSummary.length} 条记录`);
      const first = scheduleSummary[0] as any;
      console.log(`     示例: ${first.driver_name} - 排班天数: ${first.scheduled_days}`);
    }

    // 测试4: 仓库运营统计视图
    console.log('\n测试4: 仓库运营统计视图 (v_warehouse_operation_stats)');
    const warehouseStats = await prisma.$queryRaw`
      SELECT * FROM v_warehouse_operation_stats
    `;
    if (Array.isArray(warehouseStats) && warehouseStats.length > 0) {
      console.log('  ✅ 视图查询成功');
      console.log(`     返回 ${warehouseStats.length} 条记录`);
      const first = warehouseStats[0] as any;
      console.log(`     示例: ${first.warehouse_name} - 库存使用率: ${first.stock_usage_rate}%`);
    }

    console.log('\n✅ 新增视图测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

testExtendedViews()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

