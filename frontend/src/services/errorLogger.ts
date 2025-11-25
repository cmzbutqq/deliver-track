interface ConsoleLog {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  args: any[];
  timestamp: string;
  stack?: string;
}

interface ErrorLog {
  message: string;
  source: string;
  lineno?: number;
  colno?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  url?: string;
  userAgent?: string;
  timestamp: string;
}

// 只在开发环境转发到前端服务器
const isDev = import.meta.env.DEV;
// 使用当前页面的 origin，确保能正确发送到开发服务器
const DEV_SERVER_URL = isDev ? window.location.origin : '';

// 发送控制台日志到开发服务器
const sendConsoleLog = async (log: ConsoleLog) => {
  if (!isDev) return;

  try {
    await fetch(`${DEV_SERVER_URL}/__dev-console-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
      // 不等待响应，避免阻塞
    }).catch(() => {
      // 静默失败，避免循环错误
    });
  } catch (error) {
    // 静默失败
  }
};

// 发送错误日志到开发服务器
const sendErrorLog = async (log: ErrorLog) => {
  if (!isDev) return;

  try {
    await fetch(`${DEV_SERVER_URL}/__dev-error-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    }).catch(() => {
      // 静默失败
    });
  } catch (error) {
    // 静默失败
  }
};

// 序列化参数，处理复杂对象
const serializeArgs = (args: any[]): any[] => {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return {
        __type: 'Error',
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        // 尝试序列化，如果失败则返回字符串
        JSON.stringify(arg);
        return arg;
      } catch {
        return String(arg);
      }
    }
    return arg;
  });
};

// 初始化错误监听
export const initErrorLogger = () => {
  // 捕获 JavaScript 错误
  window.addEventListener('error', (event) => {
    const errorLog: ErrorLog = {
      message: event.message,
      source: event.filename || 'unknown',
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
        ? {
            name: event.error.name,
            message: event.error.message,
            stack: event.error.stack,
          }
        : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    sendErrorLog(errorLog);
  });

  // 捕获 Promise 未处理的错误
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorLog: ErrorLog = {
      message: error?.message || String(error) || 'Unhandled Promise Rejection',
      source: 'unhandledrejection',
      error: error
        ? {
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: error.stack,
          }
        : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    sendErrorLog(errorLog);
  });

  // 重写所有 console 方法来转发到开发服务器
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  // 创建转发函数
  const createForwarder = (level: ConsoleLog['level']) => {
    return (...args: any[]) => {
      // 先执行原始方法
      originalConsole[level].apply(console, args);

      // 转发到开发服务器
      const log: ConsoleLog = {
        level,
        args: serializeArgs(args),
        timestamp: new Date().toISOString(),
      };

      // 如果是错误，尝试提取堆栈
      if (level === 'error' && args.length > 0) {
        const error = args.find((arg) => arg instanceof Error);
        if (error) {
          log.stack = error.stack;
        }
      }

      sendConsoleLog(log);
    };
  };

  // 重写所有 console 方法
  console.log = createForwarder('log');
  console.info = createForwarder('info');
  console.warn = createForwarder('warn');
  console.error = createForwarder('error');
  console.debug = createForwarder('debug');

  if (isDev) {
    console.log('✅ 浏览器控制台日志转发已初始化（开发环境）');
  }
};
