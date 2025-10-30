import { Logger } from 'fastmcp';

const LOG_LEVEL = process.env.LOG_LEVEL;

class CustomLogger implements Logger {
  debug(...args: unknown[]): void {
    if (LOG_LEVEL === 'debug') {
      console.log("[DEBUG]", new Date().toISOString(), ...args);
    }
  }

  error(...args: unknown[]): void {
    console.error("[ERROR]", new Date().toISOString(), ...args);
  }

  info(...args: unknown[]): void {
    if (LOG_LEVEL && ['info', 'debug'].includes(LOG_LEVEL)) {
      console.info("[INFO]", new Date().toISOString(), ...args);
    }
  }

  log(...args: unknown[]): void {
    console.log("[LOG]", new Date().toISOString(), ...args);
  }

  warn(...args: unknown[]): void {
    console.warn("[WARN]", new Date().toISOString(), ...args);
  }
}

export default new CustomLogger();