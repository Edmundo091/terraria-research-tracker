// Console logger for debugging - captures console.log output and displays in UI

type LogLevel = 'log' | 'warn' | 'error' | 'info';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  args: string[];
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  constructor() {
    // Override console methods
    this.overrideConsole('log');
    this.overrideConsole('warn');
    this.overrideConsole('error');
    this.overrideConsole('info');
  }

  private overrideConsole(level: LogLevel) {
    const original = console[level].bind(console);
    const self = this;
    
    console[level] = (...args: unknown[]) => {
      // Call original
      original(...args);
      
      // Store our copy
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        args: args.map(arg => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
      };
      
      self.logs.push(entry);
      self.notifyListeners();
    };
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    // Immediately call with current logs
    listener(this.logs);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l([...this.logs]));
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }
}

export const debugLogger = new DebugLogger();
export type { LogEntry, LogLevel };
