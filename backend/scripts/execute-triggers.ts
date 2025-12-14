import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function executeTriggerFile(filePath: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`执行触发器文件: ${filePath}`);
  
  try {
    // 先执行函数定义（CREATE FUNCTION部分）
    const functionMatch = sql.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql;/);
    if (functionMatch) {
      await prisma.$executeRawUnsafe(functionMatch[0]);
      console.log(`  ✅ 函数定义已创建`);
    }
    
    // 再执行触发器创建（CREATE TRIGGER部分）
    const triggerMatch = sql.match(/CREATE TRIGGER[\s\S]*?;/);
    if (triggerMatch) {
      // 先删除可能存在的触发器
      const triggerNameMatch = triggerMatch[0].match(/CREATE TRIGGER\s+(\w+)/);
      if (triggerNameMatch) {
        const triggerName = triggerNameMatch[1];
        try {
          await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${triggerName} ON ${getTableName(filePath)};`);
        } catch (e) {
          // 忽略删除错误
        }
      }
      await prisma.$executeRawUnsafe(triggerMatch[0]);
      console.log(`  ✅ 触发器已创建`);
    }
    
    console.log(`✅ 成功执行: ${path.basename(filePath)}`);
  } catch (error: any) {
    if (error?.meta?.message?.includes('already exists') || 
        error?.message?.includes('already exists')) {
      console.log(`⚠️  已存在，跳过: ${path.basename(filePath)}`);
    } else {
      console.error(`❌ 执行失败: ${path.basename(filePath)}`, error?.meta?.message || error?.message);
    }
  }
}

function getTableName(filePath: string): string {
  const filename = path.basename(filePath);
  if (filename.includes('order_timeout')) return 'orders';
  if (filename.includes('inventory_alert')) return 'warehouses';
  if (filename.includes('customer_points')) return 'orders';
  if (filename.includes('payment_status')) return 'payments';
  if (filename.includes('delivery_task')) return 'delivery_tasks';
  return 'orders';
}

async function main() {
  const triggersDir = path.join(__dirname, '..', 'prisma', 'triggers');
  const triggerFiles = [
    'trg_order_timeout.sql',
    'trg_inventory_alert.sql',
    'trg_customer_points.sql',
    'trg_payment_status.sql',
    'trg_delivery_task_completion.sql',
  ];
  
  for (const file of triggerFiles) {
    const filePath = path.join(triggersDir, file);
    if (fs.existsSync(filePath)) {
      await executeTriggerFile(filePath);
    }
  }
  
  console.log('\n✅ 所有触发器脚本执行完成！');
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

