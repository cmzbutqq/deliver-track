import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 数据迁移脚本：将 LogisticsCompany 的 timeLimit 转换为 speed
 * 映射关系：
 * - 24小时 -> 0.5 (最快)
 * - 48小时 -> 0.4
 * - 72小时 -> 0.3
 * - 96小时 -> 0.25 (最慢)
 * - 其他 -> 根据比例计算
 */
async function migrateTimeToSpeed() {
  console.log('🔄 开始迁移 LogisticsCompany 数据：timeLimit -> speed');

  const companies = await prisma.logisticsCompany.findMany({
    select: {
      id: true,
      name: true,
      timeLimit: true,
    },
  });

  console.log(`   找到 ${companies.length} 个物流公司`);

  const timeToSpeedMap: Record<number, number> = {
    24: 0.5,
    48: 0.4,
    72: 0.3,
    96: 0.25,
  };

  for (const company of companies) {
    let speed: number;

    if (company.timeLimit in timeToSpeedMap) {
      speed = timeToSpeedMap[company.timeLimit as keyof typeof timeToSpeedMap];
    } else {
      // 对于其他值，使用线性映射：24小时=0.5, 96小时=0.25
      // speed = 0.5 - (timeLimit - 24) * (0.5 - 0.25) / (96 - 24)
      speed = 0.5 - ((company.timeLimit - 24) * 0.25) / 72;
      // 确保在合理范围内
      speed = Math.max(0.1, Math.min(1.0, speed));
    }

    await prisma.logisticsCompany.update({
      where: { id: company.id },
      data: { speed },
    });

    console.log(`   ${company.name}: timeLimit=${company.timeLimit} -> speed=${speed.toFixed(2)}`);
  }

  console.log('✅ 迁移完成');
}

migrateTimeToSpeed()
  .catch((e) => {
    console.error('❌ 迁移失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

