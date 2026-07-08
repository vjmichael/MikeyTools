/**
 * L-02 FIX: Centralized logger abstraction for consistent logging across the toolkit.
 * Replaces direct console.log/warn/error calls.
 */

export interface ToolkitLogger {
  debug: (msg: string, ...args: any[]) => void;
  info: (msg: string, ...args: any[]) => void;
  warn: (msg: string, ...args: any[]) => void;
  error: (msg: string, ...args: any[]) => void;
}

/**
 * Creates a logger instance with configurable verbosity.
 */
/**
 * Creates a logger instance with configurable verbosity.
 * 
 * @param {string} [prefix='[Toolkit]'] - Log message prefix
 * @returns {ToolkitLogger} Logger instance
 */

export function createLogger(prefix: string = '[Toolkit]'): ToolkitLogger {
  const format = (msg: string, ...args: any[]) => {
    return `${prefix} ${msg}`;
  };

  return {
    debug: (msg: string, ...args: any[]) => {
      if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
        console.debug(format(msg), ...args);
      }
    },
    info: (msg: string, ...args: any[]) => {
      console.info(format(msg), ...args);
    },
    warn: (msg: string, ...args: any[]) => {
      console.warn(format(msg), ...args);
    },
    error: (msg: string, ...args: any[]) => {
      console.error(format(msg), ...args);
    }
  };
}

/**
 * Default logger instance used throughout the toolkit.
 */
export const logger = createLogger('[Toolkit]');

/**
 * Create a logger for a specific module.
 */
export function createModuleLogger(moduleName: string): ToolkitLogger {
  return createLogger(`[Toolkit/${moduleName}]`);
}
