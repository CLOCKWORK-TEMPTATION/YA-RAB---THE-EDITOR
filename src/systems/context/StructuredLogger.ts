export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * @class StructuredLogger
 * @description مسجل منظم للسجلات مع مستويات
 */
export class StructuredLogger {
  private minLevel: LogLevel;
  private logs: Array<{
    timestamp: Date;
    level: LogLevel;
    message: string;
    data?: unknown;
  }> = [];

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.minLevel) return;

    const entry = {
      timestamp: new Date(),
      level: level,
      message,
      ...(data && { data }),
    };

    this.logs.push(entry);

    // الحفاظ على آخر 1000 سجل فقط
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    const prefix = `[${entry.timestamp.toISOString()}] [${LogLevel[level]}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || "");
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data || "");
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || "");
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || "");
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  getLogs(): Array<{
    timestamp: Date;
    level: string;
    message: string;
    data?: unknown;
  }> {
    return this.logs.map((log) => ({
      timestamp: log.timestamp,
      level: LogLevel[log.level],
      message: log.message,
      data: log.data,
    }));
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}
