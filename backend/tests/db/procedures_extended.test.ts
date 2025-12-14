import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试新增的存储过程功能
 */
async function testExtendedProcedures() {
  console.log('🧪 开始测试新增存储过程...\n');

  try {
    // 测试1: 费用结算存储过程
    console.log('测试1: 费用结算存储过程 (sp_settle_fees)');
    const merchant = await prisma.merchant.findFirst();
    if (merchant) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const result = await prisma.$queryRaw`
        SELECT * FROM sp_settle_fees(${merchant.id}, ${startDate}::timestamp, ${endDate}::timestamp)
      `;

      if (Array.isArray(result) && result.length > 0) {
        console.log('  ✅ 费用结算存储过程执行成功');
        console.log(`     结算单ID: ${(result[0] as any).settlement_id}`);
        console.log(`     总金额: ${(result[0] as any).total_amount}`);
        console.log(`     订单数: ${(result[0] as any).order_count}`);
      } else {
        console.log('  ⚠️  存储过程返回空结果（可能时间段内无订单）');
      }
    }

    // 测试2: 配送员排班存储过程
    console.log('\n测试2: 配送员排班存储过程 (sp_assign_driver_schedule)');
    const driver = await prisma.deliveryDriver.findFirst();
    if (driver) {
      const workDate = new Date();
      workDate.setDate(workDate.getDate() + 1); // 明天

      try {
        const result = await prisma.$queryRaw`
          SELECT * FROM sp_assign_driver_schedule(${driver.id}, ${workDate}::date, 'MORNING')
        `;

        if (Array.isArray(result) && result.length > 0) {
          console.log('  ✅ 配送员排班存储过程执行成功');
          console.log(`     排班ID: ${(result[0] as any).schedule_id}`);
        }
      } catch (error: any) {
        if (error.message?.includes('已有排班')) {
          console.log('  ✅ 存储过程正确检测到重复排班');
        } else {
          throw error;
        }
      }
    }

    // 测试3: 车辆维修提醒存储过程
    console.log('\n测试3: 车辆维修提醒存储过程 (sp_check_vehicle_maintenance)');
    const result = await prisma.$queryRaw`
      SELECT * FROM sp_check_vehicle_maintenance()
    `;

    if (Array.isArray(result) && result.length > 0) {
      const data = result[0] as any;
      console.log('  ✅ 车辆维修提醒存储过程执行成功');
      console.log(`     需要维修的车辆数: ${data.total_count || 0}`);
      if (data.vehicles && Array.isArray(data.vehicles)) {
        console.log(`     车辆列表: ${data.vehicles.length} 辆`);
      }
    }

    console.log('\n✅ 新增存储过程测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

testExtendedProcedures()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

