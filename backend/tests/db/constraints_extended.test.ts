import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试新增的约束功能
 */
async function testExtendedConstraints() {
  console.log('🧪 开始测试新增约束...\n');

  try {
    // 测试1: 商品表检查约束
    console.log('测试1: 商品表检查约束');
    try {
      await prisma.product.create({
        data: {
          merchantId: (await prisma.merchant.findFirst())!.id,
          name: '测试商品',
          sku: 'TEST001',
          weight: -1, // 违反约束
          volume: 1,
          price: 100,
        },
      });
      console.log('  ❌ 约束未生效：允许负重量');
    } catch (error: any) {
      if (error.message?.includes('check') || error.message?.includes('constraint')) {
        console.log('  ✅ 检查约束生效：拒绝负重量');
      } else {
        throw error;
      }
    }

    // 测试2: 费用结算表检查约束
    console.log('\n测试2: 费用结算表检查约束');
    const merchant = await prisma.merchant.findFirst();
    if (merchant) {
      try {
        await prisma.feeSettlement.create({
          data: {
            merchantId: merchant.id,
            settlementNo: `TEST${Date.now()}`,
            startDate: new Date(),
            endDate: new Date(),
            totalAmount: 1000,
            settledAmount: 2000, // 违反约束：已结算金额 > 总金额
          },
        });
        console.log('  ❌ 约束未生效：允许已结算金额大于总金额');
      } catch (error: any) {
        if (error.message?.includes('check') || error.message?.includes('constraint')) {
          console.log('  ✅ 检查约束生效：拒绝已结算金额大于总金额');
        } else {
          throw error;
        }
      }
    }

    // 测试3: 仓库交易表检查约束
    console.log('\n测试3: 仓库交易表检查约束');
    const warehouse = await prisma.warehouse.findFirst();
    if (warehouse) {
      try {
        await prisma.warehouseTransaction.create({
          data: {
            warehouseId: warehouse.id,
            transactionType: 'OUT',
            quantity: 0, // 违反约束：数量不能为0
            operator: 'test',
          },
        });
        console.log('  ❌ 约束未生效：允许数量为0');
      } catch (error: any) {
        if (error.message?.includes('check') || error.message?.includes('constraint')) {
          console.log('  ✅ 检查约束生效：拒绝数量为0');
        } else {
          throw error;
        }
      }
    }

    // 测试4: 客户地址唯一默认地址约束
    console.log('\n测试4: 客户地址唯一默认地址约束');
    const customer = await prisma.customer.findFirst();
    if (customer) {
      // 先创建一个默认地址
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          receiverName: '测试',
          receiverPhone: '13800138000',
          address: { lng: 116.0, lat: 39.0, address: '测试地址1' },
          isDefault: true,
        },
      });

      try {
        // 尝试创建第二个默认地址
        await prisma.customerAddress.create({
          data: {
            customerId: customer.id,
            receiverName: '测试2',
            receiverPhone: '13800138001',
            address: { lng: 116.1, lat: 39.1, address: '测试地址2' },
            isDefault: true,
          },
        });
        console.log('  ⚠️  唯一约束可能未生效（需要检查数据库索引）');
      } catch (error: any) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          console.log('  ✅ 唯一约束生效：每个客户只能有一个默认地址');
        } else {
          console.log('  ⚠️  错误:', error.message);
        }
      }
    }

    console.log('\n✅ 新增约束测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

testExtendedConstraints()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

