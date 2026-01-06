import { DEBUG_MODE } from '../config/defaults';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'API' | 'STATE' | 'UI';

class DebugLogger {
  private enabled: boolean = DEBUG_MODE;

  log(level: LogLevel, category: string, message: string, data?: unknown) {
    // Always log errors, other levels only when debug mode enabled
    if (!this.enabled && level !== 'ERROR') {
      return;
    }

    const time = new Date().toISOString().substr(11, 12);
    const prefix = `[YTFeed ${time}] [${level}] [${category}]`;

    if (level === 'ERROR') {
      console.error(prefix, message, data !== undefined ? data : '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, data !== undefined ? data : '');
    } else {
      console.log(prefix, message, data !== undefined ? data : '');
    }
  }

  // Convenience methods
  info(category: string, message: string, data?: unknown) {
    this.log('INFO', category, message, data);
  }

  warn(category: string, message: string, data?: unknown) {
    this.log('WARN', category, message, data);
  }

  error(category: string, message: string, data?: unknown) {
    this.log('ERROR', category, message, data);
  }

  api(message: string, data?: unknown) {
    this.log('API', 'api', message, data);
  }

  state(message: string, data?: unknown) {
    this.log('STATE', 'state', message, data);
  }

  ui(message: string, data?: unknown) {
    this.log('UI', 'ui', message, data);
  }
}

export const debug = new DebugLogger();
