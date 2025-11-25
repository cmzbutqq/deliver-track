import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-console-logger',
      configureServer(server) {
        // 接收控制台日志
        server.middlewares.use('/__dev-console-log', async (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const log = JSON.parse(body);
                const { level, args, timestamp, stack } = log;
                
                // 格式化输出到控制台
                const time = new Date(timestamp).toLocaleTimeString();
                const prefix = `[浏览器 ${time}]`;
                
                // 根据日志级别使用不同的颜色和格式
                const formattedArgs = args.map((arg: any) => {
                  if (arg && arg.__type === 'Error') {
                    return `Error: ${arg.name} - ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
                  }
                  try {
                    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                  } catch {
                    return String(arg);
                  }
                });

                switch (level) {
                  case 'error':
                    console.error('\x1b[31m%s\x1b[0m', prefix, ...formattedArgs);
                    if (stack) {
                      console.error('\x1b[31m%s\x1b[0m', stack);
                    }
                    break;
                  case 'warn':
                    console.warn('\x1b[33m%s\x1b[0m', prefix, ...formattedArgs);
                    break;
                  case 'info':
                    console.info('\x1b[36m%s\x1b[0m', prefix, ...formattedArgs);
                    break;
                  case 'debug':
                    console.debug('\x1b[90m%s\x1b[0m', prefix, ...formattedArgs);
                    break;
                  default:
                    console.log('\x1b[37m%s\x1b[0m', prefix, ...formattedArgs);
                }
              } catch (error) {
                console.error('解析控制台日志失败:', error);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            });
          } else {
            next();
          }
        });

        // 接收错误日志
        server.middlewares.use('/__dev-error-log', async (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const errorLog = JSON.parse(body);
                const { message, source, lineno, colno, error, url, timestamp } = errorLog;
                
                const time = new Date(timestamp).toLocaleTimeString();
                console.error('\x1b[31m%s\x1b[0m', `[浏览器错误 ${time}]`);
                console.error('  消息:', message);
                console.error('  来源:', source);
                if (lineno !== undefined && colno !== undefined) {
                  console.error('  位置:', `行 ${lineno}, 列 ${colno}`);
                }
                if (error) {
                  console.error('  错误:', `${error.name}: ${error.message}`);
                  if (error.stack) {
                    console.error('  堆栈:', error.stack);
                  }
                }
                if (url) {
                  console.error('  URL:', url);
                }
              } catch (error) {
                console.error('解析错误日志失败:', error);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            });
          } else {
            next();
          }
        });
      },
    },
  ],
})
