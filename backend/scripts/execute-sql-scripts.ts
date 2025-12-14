import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function executeSqlFile(filePath: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`执行SQL文件: ${filePath}`);
  try {
    // 使用正则表达式分割SQL语句，考虑函数和触发器的完整定义
    // 匹配以CREATE或DROP开头的完整语句（直到分号或文件结束）
    const statements: string[] = [];
    let currentStatement = '';
    let inFunction = false;
    let dollarQuote = '';
    
    const lines = sql.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentStatement += line + '\n';
      
      // 检测dollar quoting ($$, $tag$, etc.)
      const dollarMatch = line.match(/\$([^$]*)\$/);
      if (dollarMatch && !dollarQuote) {
        dollarQuote = dollarMatch[0];
        inFunction = true;
      } else if (dollarQuote && line.includes(dollarQuote)) {
        dollarQuote = '';
        inFunction = false;
      }
      
      // 如果不在函数内，且遇到分号，则是一个完整语句
      if (!inFunction && line.trim().endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // 添加最后一个语句（如果没有以分号结尾）
    if (currentStatement.trim() && !currentStatement.trim().startsWith('--')) {
      statements.push(currentStatement.trim());
    }
    
    // 执行每个语句
    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(statement);
      }
    }
    
    console.log(`✅ 成功执行: ${path.basename(filePath)}`);
  } catch (error: any) {
    // 如果错误是"already exists"，认为是成功的
    if (error?.meta?.message?.includes('already exists') || 
        error?.message?.includes('already exists')) {
      console.log(`⚠️  已存在，跳过: ${path.basename(filePath)}`);
    } else {
      console.error(`❌ 执行失败: ${path.basename(filePath)}`, error?.meta?.message || error?.message);
      // 继续执行其他文件，不抛出错误
      console.log(`⚠️  跳过此文件，继续执行其他文件...`);
    }
  }
}

async function main() {
  const baseDir = path.join(__dirname, '..', 'prisma');
  
  // 执行约束SQL
  const constraintsFile = path.join(baseDir, 'migrations', '20251214000000_add_new_tables_constraints', 'migration.sql');
  if (fs.existsSync(constraintsFile)) {
    await executeSqlFile(constraintsFile);
  }
  
  // 执行触发器SQL
  const triggersDir = path.join(baseDir, 'triggers');
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
      await executeSqlFile(filePath);
    }
  }
  
  // 执行存储过程SQL
  const proceduresDir = path.join(baseDir, 'procedures');
  const procedureFiles = [
    'sp_batch_process_orders.sql',
    'sp_calculate_customer_points.sql',
    'sp_generate_daily_report.sql',
  ];
  
  for (const file of procedureFiles) {
    const filePath = path.join(proceduresDir, file);
    if (fs.existsSync(filePath)) {
      await executeSqlFile(filePath);
    }
  }
  
  // 执行视图SQL
  const viewsDir = path.join(baseDir, 'views');
  const viewFiles = [
    'v_merchant_daily_statistics.sql',
    'v_customer_order_history.sql',
    'v_driver_task_summary.sql',
    'v_payment_statistics.sql',
  ];
  
  for (const file of viewFiles) {
    const filePath = path.join(viewsDir, file);
    if (fs.existsSync(filePath)) {
      await executeSqlFile(filePath);
    }
  }
  
  console.log('\n✅ 所有SQL脚本执行完成！');
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

