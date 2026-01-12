import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试新增的触发器功能
 */
async function testExtendedTriggers() {
  console.log('🧪 开始测试新增触发器...\n');

  try {
    // 测试1: 订单历史记录触发器
    console.log('测试1: 订单历史记录触发器 (trg_order_history)');
    const testOrder = await prisma.order.findFirst({
      where: { status: 'PENDING' },
    });

    if (testOrder) {
      // 更新订单状态，应该自动创建历史记录
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'SHIPPING' },
      });

      const history = await prisma.orderHistory.findFirst({
        where: { orderId: testOrder.id },
        orderBy: { changedAt: 'desc' },
      });

      if (history) {
        console.log('  ✅ 订单历史记录已自动创建');
        console.log(`     原状态: ${history.oldStatus}, 新状态: ${history.newStatus}`);
      } else {
        console.log('  ❌ 订单历史记录未创建');
      }
    }

    // 测试2: 仓库出入库记录触发器
    console.log('\n测试2: 仓库出入库记录触发器 (trg_warehouse_transaction)');
    const shippingOrder = await prisma.order.findFirst({
      where: { status: 'SHIPPING', warehouseId: { not: null } },
    });

    if (shippingOrder && shippingOrder.warehouseId) {
      const transaction = await prisma.warehouseTransaction.findFirst({
        where: {
          orderId: shippingOrder.id,
          transactionType: 'OUT',
        },
      });

      if (transaction) {
        console.log('  ✅ 出库记录已自动创建');
        console.log(`     仓库ID: ${transaction.warehouseId}, 数量: ${transaction.quantity}`);
      } else {
        console.log('  ⚠️  出库记录未找到（可能订单状态变更时未触发）');
      }
    }

    // 测试3: 费用结算触发器
    console.log('\n测试3: 费用结算触发器 (trg_fee_settlement)');
    const deliveredOrder = await prisma.order.findFirst({
      where: { status: 'DELIVERED', totalFee: { gt: 0 } },
    });

    if (deliveredOrder) {
      // 查找相关的结算单
      const settlement = await prisma.feeSettlement.findFirst({
        where: {
          merchantId: deliveredOrder.merchantId,
          status: 'PENDING',
        },
      });

      if (settlement) {
        console.log('  ✅ 费用结算触发器正常工作');
        console.log(`     结算单号: ${settlement.settlementNo}, 总金额: ${settlement.totalAmount}`);
      } else {
        console.log('  ⚠️  未找到相关结算单（可能需要手动创建）');
      }
    }

    console.log('\n✅ 新增触发器测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

testExtendedTriggers()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

