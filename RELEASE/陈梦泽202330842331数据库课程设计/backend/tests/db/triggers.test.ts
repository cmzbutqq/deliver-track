import { PrismaClient } from '@prisma/client';
import { OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试触发器功能
 */
async function testTriggers() {
  console.log('🧪 开始测试触发器...\n');

  try {
    // 测试1: 订单状态变更触发器
    console.log('测试1: 订单状态变更触发器');
    const testOrder = await prisma.order.findFirst({
      where: { status: OrderStatus.PENDING },
    });

    if (testOrder) {
      const timelineCountBefore = await prisma.logisticsTimeline.count({
        where: { orderId: testOrder.id },
      });

      // 更新订单状态为SHIPPING
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: OrderStatus.SHIPPING },
      });

      const timelineCountAfter = await prisma.logisticsTimeline.count({
        where: { orderId: testOrder.id },
      });

      if (timelineCountAfter > timelineCountBefore) {
        console.log('✅ 订单状态变更触发器测试通过：自动创建了时间线记录');
      } else {
        console.log('❌ 订单状态变更触发器测试失败');
      }
    }

    // 测试2: 费用计算触发器
    console.log('\n测试2: 订单费用计算触发器');
    const feeOrder = await prisma.order.findFirst({
      where: { totalFee: null },
    });

    if (feeOrder) {
      // 更新订单的费用相关字段
      await prisma.order.update({
        where: { id: feeOrder.id },
        data: {
          weight: 5.5,
          distance: 10.0,
          urgentFee: 20.0,
          insuranceAmount: 1000.0,
        },
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id: feeOrder.id },
      });

      if (updatedOrder?.totalFee && updatedOrder.totalFee > 0) {
        console.log('✅ 费用计算触发器测试通过：自动计算了总费用');
        console.log(`   总费用: ${updatedOrder.totalFee}`);
      } else {
        console.log('❌ 费用计算触发器测试失败');
      }

      // 检查delivery_fees表
      const deliveryFee = await prisma.deliveryFee.findUnique({
        where: { orderId: feeOrder.id },
      });

      if (deliveryFee) {
        console.log('✅ 费用明细已自动创建到delivery_fees表');
      }
    }

    // 测试3: 配送员工作量统计触发器
    console.log('\n测试3: 配送员工作量统计触发器');
    const driver = await prisma.deliveryDriver.findFirst({
      where: { status: 'IDLE' },
    });

    if (driver) {
      const driverBefore = await prisma.deliveryDriver.findUnique({
        where: { id: driver.id },
      });

      // 创建一个订单并分配给配送员，然后完成
      const testOrder2 = await prisma.order.findFirst({
        where: {
          status: OrderStatus.SHIPPING,
          deliveryDriverId: null,
        },
      });

      if (testOrder2) {
        await prisma.order.update({
          where: { id: testOrder2.id },
          data: {
            deliveryDriverId: driver.id,
            status: OrderStatus.DELIVERED,
            actualTime: new Date(),
          },
        });

        const driverAfter = await prisma.deliveryDriver.findUnique({
          where: { id: driver.id },
        });

        if (driverAfter && driverAfter.totalOrders > driverBefore!.totalOrders) {
          console.log('✅ 配送员工作量统计触发器测试通过：自动更新了完成订单数');
          console.log(`   完成订单数: ${driverAfter.totalOrders}`);
        } else {
          console.log('❌ 配送员工作量统计触发器测试失败');
        }
      }
    }

    // 测试4: 客户评价统计触发器
    console.log('\n测试4: 客户评价统计触发器');
    const reviewOrder = await prisma.order.findFirst({
      where: { status: OrderStatus.DELIVERED },
      include: { reviews: true },
    });

    if (reviewOrder && reviewOrder.reviews.length === 0) {
      const driverBefore = reviewOrder.deliveryDriverId
        ? await prisma.deliveryDriver.findUnique({
            where: { id: reviewOrder.deliveryDriverId },
          })
        : null;

      await prisma.customerReview.create({
        data: {
          orderId: reviewOrder.id,
          rating: 5,
          comment: '测试评价',
          reviewerName: reviewOrder.receiverName,
          reviewerPhone: reviewOrder.receiverPhone,
        },
      });

      if (driverBefore) {
        const driverAfter = await prisma.deliveryDriver.findUnique({
          where: { id: driverBefore.id },
        });

        if (driverAfter && driverAfter.avgRating !== driverBefore.avgRating) {
          console.log('✅ 客户评价统计触发器测试通过：自动更新了配送员评分');
          console.log(`   平均评分: ${driverAfter.avgRating}`);
        } else {
          console.log('❌ 客户评价统计触发器测试失败');
        }
      }
    }

    console.log('\n✅ 所有触发器测试完成！');
  } catch (error) {
    console.error('❌ 触发器测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTriggers();

