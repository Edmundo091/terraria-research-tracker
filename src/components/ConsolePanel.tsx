import { useEffect, useState, useRef } from 'react';
import { debugLogger } from '../utils/debugLogger';
import type { LogEntry } from '../utils/debugLogger';
import './ConsolePanel.css';

export default function ConsolePanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((newLogs: LogEntry[]) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    debugLogger.clear();
  };

  return (
    <div className="console-panel">
      <div className="console-header">
        <h3>🐛 Debug Console</h3>
        <button onClick={clearLogs} className="console-clear-btn">Clear</button>
      </div>
      <div className="console-body">
        {logs.length === 0 ? (
          <div className="console-empty">No messages yet. Upload a .plr file to see logs.</div>
        ) : (
          logs.map((entry, idx) => (
            <div key={idx} className={`console-line console-${entry.level}`}>
              <span className="console-time">
                {entry.timestamp.toLocaleTimeString()}
              </span>
              <span className="console-level">[{entry.level.toUpperCase()}]</span>
              <span className="console-msg">{entry.args.join(' ')}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
