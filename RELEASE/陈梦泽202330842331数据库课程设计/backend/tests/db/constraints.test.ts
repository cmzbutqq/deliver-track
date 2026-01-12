import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试约束功能
 */
async function testConstraints() {
  console.log('🧪 开始测试约束...\n');

  try {
    // 测试1: 订单金额必须 > 0
    console.log('测试1: 订单金额约束 (amount > 0)');
    try {
      await prisma.$executeRaw`
        INSERT INTO orders (id, "orderNo", status, merchant_id, receiver_name, receiver_phone, receiver_address, product_name, product_quantity, amount, origin, destination, logistics)
        VALUES (gen_random_uuid()::text, 'TEST001', 'PENDING', (SELECT id FROM merchants LIMIT 1), '测试', '13800138000', '测试地址', '测试商品', 1, -100, '{}', '{}', '顺丰速运')
      `;
      console.log('❌ 约束测试失败：应该拒绝负数金额');
    } catch (error: any) {
      if (error.message?.includes('orders_amount_check')) {
        console.log('✅ 订单金额约束测试通过：正确拒绝了负数金额');
      } else {
        console.log('⚠️  约束测试：', error.message);
      }
    }

    // 测试2: 配送员评分范围约束 (0-5)
    console.log('\n测试2: 配送员评分约束 (0 <= avg_rating <= 5)');
    const driver = await prisma.deliveryDriver.findFirst();
    if (driver) {
      try {
        await prisma.$executeRaw`
          UPDATE delivery_drivers SET avg_rating = 10 WHERE id = ${driver.id}
        `;
        console.log('❌ 约束测试失败：应该拒绝超出范围的评分');
      } catch (error: any) {
        if (error.message?.includes('delivery_drivers_avg_rating_check')) {
          console.log('✅ 配送员评分约束测试通过：正确拒绝了超出范围的评分');
        } else {
          console.log('⚠️  约束测试：', error.message);
        }
      }
    }

    // 测试3: 客户评价评分范围约束 (1-5)
    console.log('\n测试3: 客户评价评分约束 (1 <= rating <= 5)');
    const order = await prisma.order.findFirst();
    if (order) {
      try {
        await prisma.$executeRaw`
          INSERT INTO customer_reviews (id, order_id, rating, reviewer_name)
          VALUES (gen_random_uuid()::text, ${order.id}, 10, '测试用户')
        `;
        console.log('❌ 约束测试失败：应该拒绝超出范围的评分');
      } catch (error: any) {
        if (error.message?.includes('customer_reviews_rating_check')) {
          console.log('✅ 客户评价评分约束测试通过：正确拒绝了超出范围的评分');
        } else {
          console.log('⚠️  约束测试：', error.message);
        }
      }
    }

    // 测试4: 物流公司速度约束 (0 < speed <= 1)
    console.log('\n测试4: 物流公司速度约束 (0 < speed <= 1)');
    try {
      await prisma.$executeRaw`
        INSERT INTO logistics_companies (id, name, speed)
        VALUES (gen_random_uuid()::text, '测试物流', 2.0)
      `;
      console.log('❌ 约束测试失败：应该拒绝超出范围的速度');
    } catch (error: any) {
      if (error.message?.includes('logistics_companies_speed_check')) {
        console.log('✅ 物流公司速度约束测试通过：正确拒绝了超出范围的速度');
      } else {
        console.log('⚠️  约束测试：', error.message);
      }
    }

    // 测试5: 仓库库存约束 (current_stock <= capacity)
    console.log('\n测试5: 仓库库存约束 (current_stock <= capacity)');
    const warehouse = await prisma.warehouse.findFirst();
    if (warehouse) {
      try {
        await prisma.$executeRaw`
          UPDATE warehouses SET current_stock = ${warehouse.capacity + 1000} WHERE id = ${warehouse.id}
        `;
        console.log('❌ 约束测试失败：应该拒绝超出容量的库存');
      } catch (error: any) {
        if (error.message?.includes('warehouses_stock_capacity_check')) {
          console.log('✅ 仓库库存约束测试通过：正确拒绝了超出容量的库存');
        } else {
          console.log('⚠️  约束测试：', error.message);
        }
      }
    }

    console.log('\n✅ 所有约束测试完成！');
  } catch (error) {
    console.error('❌ 约束测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConstraints();

