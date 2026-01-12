import { PrismaClient } from '@prisma/client';
import { OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试存储过程功能
 */
async function testProcedures() {
  console.log('🧪 开始测试存储过程...\n');

  try {
    // 测试1: 配送费用计算存储过程
    console.log('测试1: sp_calculate_delivery_fee');
    const testOrder = await prisma.order.findFirst();
    if (testOrder) {
      const result = await prisma.$queryRaw`
        SELECT * FROM sp_calculate_delivery_fee(${testOrder.id})
      `;
      console.log('✅ 存储过程调用成功');
      console.log('   结果:', JSON.stringify(result, null, 2));
    }

    // 测试2: 订单统计存储过程
    console.log('\n测试2: sp_get_order_statistics');
    const merchant = await prisma.merchant.findFirst();
    if (merchant) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const result = await prisma.$queryRaw`
        SELECT * FROM sp_get_order_statistics(${merchant.id}, ${startDate}, ${endDate})
      `;
      console.log('✅ 存储过程调用成功');
      console.log('   结果:', JSON.stringify(result, null, 2));
    }

    // 测试3: 配送员自动分配存储过程
    console.log('\n测试3: sp_assign_delivery_driver');
    const pendingOrder = await prisma.order.findFirst({
      where: { status: OrderStatus.PENDING, deliveryDriverId: null },
    });
    if (pendingOrder) {
      const result = await prisma.$queryRaw<Array<{ sp_assign_delivery_driver: string | null }>>`
        SELECT sp_assign_delivery_driver(${pendingOrder.id}) as sp_assign_delivery_driver
      `;
      const driverId = result[0]?.sp_assign_delivery_driver;
      if (driverId) {
        console.log('✅ 存储过程调用成功，已分配配送员');
        console.log(`   配送员ID: ${driverId}`);
      } else {
        console.log('⚠️  未找到可分配的配送员');
      }
    }

    // 测试4: 订单状态更新存储过程
    console.log('\n测试4: sp_update_order_status');
    const shippingOrder = await prisma.order.findFirst({
      where: { status: OrderStatus.SHIPPING },
    });
    if (shippingOrder) {
      const result = await prisma.$queryRaw<Array<{ sp_update_order_status: boolean }>>`
        SELECT sp_update_order_status(${shippingOrder.id}, 'DELIVERED'::text) as sp_update_order_status
      `;
      if (result[0]?.sp_update_order_status) {
        console.log('✅ 存储过程调用成功，订单状态已更新');
      } else {
        console.log('❌ 存储过程调用失败');
      }
    }

    console.log('\n✅ 所有存储过程测试完成！');
  } catch (error) {
    console.error('❌ 存储过程测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProcedures();

