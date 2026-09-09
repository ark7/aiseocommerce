/**
 * Structured Logger for AI SEO E-Commerce SaaS
 * Simple implementation without external dependencies
 * Can be upgraded to Winston later
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface LogContext {
  [key: string]: any;
  userId?: string;
  storeId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error | string;
}

class Logger {
  private readonly serviceName: string = 'ai-seo-ecommerce';
  private readonly logLevels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];
  private minLevel: LogLevel = 'info';

  constructor() {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levelIndex = this.logLevels.indexOf(level);
    const minIndex = this.logLevels.indexOf(this.minLevel);
    return levelIndex >= minIndex;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error | string): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error: error ? (error instanceof Error ? { message: error.message, stack: error.stack } : error) : undefined,
    };
  }

  private writeToConsole(entry: LogEntry): void {
    const colors = {
      error: '\x1b[31m', // red
      warn: '\x1b[33m',  // yellow
      info: '\x1b[36m',  // cyan
      debug: '\x1b[35m', // magenta
      verbose: '\x1b[90m', // gray
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    
    if (entry.error) {
      console.error(
        `${color}${prefix} [${this.serviceName}] ${entry.message}${reset}`,
        {
          context: entry.context,
          error: entry.error,
        }
      );
    } else {
      console.log(
        `${color}${prefix} [${this.serviceName}] ${entry.message}${reset}`,
        entry.context ? { context: entry.context } : ''
      );
    }
  }

  error(message: string, context?: LogContext, error?: Error | string): void {
    if (!this.shouldLog('error')) return;
    const entry = this.formatLog('error', message, context, error);
    this.writeToConsole(entry);
  }

  warn(message: string, context?: LogContext, error?: Error | string): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatLog('warn', message, context, error);
    this.writeToConsole(entry);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    const entry = this.formatLog('info', message, context);
    this.writeToConsole(entry);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatLog('debug', message, context);
    this.writeToConsole(entry);
  }

  verbose(message: string, context?: LogContext): void {
    if (!this.shouldLog('verbose')) return;
    const entry = this.formatLog('verbose', message, context);
    this.writeToConsole(entry);
  }

  // Convenience methods for common scenarios
  requestStarted(method: string, path: string, context?: LogContext): void {
    this.info(`Request started: ${method} ${path}`, context);
  }

  requestCompleted(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    this.info(`Request completed: ${method} ${path} ${status} ${duration}ms`, context);
  }

  databaseQuery(query: string, duration: number, context?: LogContext): void {
    this.debug(`DB Query: ${query} (${duration}ms)`, context);
  }

  authenticationSuccess(userId: string, storeId: string, context?: LogContext): void {
    this.info(`Authentication success`, { ...context, userId, storeId });
  }

  authenticationFailed(reason: string, context?: LogContext): void {
    this.warn(`Authentication failed: ${reason}`, context);
  }

  paymentProcessed(paymentId: string, status: string, context?: LogContext): void {
    this.info(`Payment processed`, { ...context, paymentId, status });
  }

  orderCreated(orderId: string, totalAmount: number, context?: LogContext): void {
    this.info(`Order created`, { ...context, orderId, totalAmount });
  }

  stockUpdated(productId: string, oldStock: number, newStock: number, context?: LogContext): void {
    this.info(`Stock updated`, { ...context, productId, oldStock, newStock });
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;
