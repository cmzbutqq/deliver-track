/**
 * Jest 测试全局配置
 */

// 设置测试超时时间
jest.setTimeout(30000);

// 全局变量
global.console = {
  ...console,
  // 在测试中隐藏不必要的日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // 保留错误日志
};


