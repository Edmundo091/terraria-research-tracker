import React, { useState, useMemo } from 'react';
import { parsePlrFile, getResearchProgress } from './utils/plrParser';
import { getAllItems } from './utils/itemsDb';
import ConsolePanel from './components/ConsolePanel';
import './App.css';

function App() {
  const [playerName, setPlayerName] = useState<string>('');
  const [research, setResearch] = useState<Record<string, number>>({});
  const [_, setProgress] = useState<number>(0); // kept for potential future
  const [fileError, setFileError] = useState<string>('');

  const allItems = useMemo(() => getAllItems(), []);

  const stats = useMemo(() => {
    let researched = 0;
    let complete = 0;
    let totalNeeded = 0;
    for (const item of allItems) {
      const current = research[item.internalName] ?? 0;
      if (current > 0) researched++;
      totalNeeded += item.needed;
      if (current >= item.needed) complete++;
    }
    const totalProgress = (complete / allItems.length) * 100;
    return { researched, complete, total: allItems.length, missing: allItems.length - complete, totalProgress };
  }, [allItems, research]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const plrData = await parsePlrFile(arrayBuffer);
        setPlayerName(plrData.playerName);
        setResearch(plrData.research);
        const { progressPercent } = getResearchProgress(plrData.research);
        setProgress(progressPercent);
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Unknown error';
        setFileError('Failed to parse .plr file: ' + errorMsg);
        console.error('Error parsing .plr file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    const exportData = { playerName, research, version: 326, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terraria-research-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setPlayerName('');
    setResearch({});
    setProgress(0);
    setFileError('');
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Terraria Research Tracker</h1>
        <p className="subtitle">Track your Journey's End research progress</p>
      </header>

      <div className="file-upload-section">
        <div className="upload-box">
          <input type="file" accept=".plr" id="plr-upload" onChange={handleFileUpload} className="file-input" />
          <label htmlFor="plr-upload" className="upload-label">
            <span className="upload-icon">📁</span>
            <span>Choose .plr file</span>
          </label>
          <button onClick={handleClear} className="clear-btn" disabled={!playerName}>Clear</button>
          {playerName && (
            <button onClick={handleExport} className="export-btn" style={{ marginLeft: '10px', background: '#2ecc71' }}>
              Export JSON
            </button>
          )}
        </div>
        {fileError && <div className="error-message">{fileError}</div>}
      </div>

      {playerName && (
        <div className="results-section">
          <div className="player-info">
            <h2>Player: {playerName}</h2>
          </div>

          <div className="progress-overview">
            <div className="progress-card">
              <div className="progress-circle">
                <svg className="progress-ring" viewBox="0 0 120 120">
                  <circle className="progress-ring-bg" cx="60" cy="60" r="54" fill="none" stroke="#333" strokeWidth="8" />
                  <circle
                    className="progress-ring-fg"
                    cx="60" cy="60" r="54" fill="none"
                    stroke="url(#gradient)" strokeWidth="8"
                    strokeDasharray="339.292"
                    strokeDashoffset={339.292 * (1 - stats.totalProgress / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9b59b6" />
                      <stop offset="100%" stopColor="#3498db" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="progress-text">
                  <span className="progress-percent">{stats.totalProgress.toFixed(1)}%</span>
                </div>
              </div>
              <div className="progress-stats">
                <div className="stat">
                  <span className="stat-value">{stats.complete.toLocaleString()}</span>
                  <span className="stat-label">Researched</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{stats.total.toLocaleString()}</span>
                  <span className="stat-label">Total Items</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{stats.missing.toLocaleString()}</span>
                  <span className="stat-label">Missing</span>
                </div>
              </div>
            </div>
          </div>

          <ResearchSection research={research} allItems={allItems} />
        </div>
      )}
      <ConsolePanel />
    </div>
  );
}

function ResearchSection({ research, allItems }: { research: Record<string, number>; allItems: any[] }) {
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false); // true = show researched, false = show missing
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const filtered = useMemo(() => {
    let list = allItems.map(item => ({
      ...item,
      current: research[item.internalName] ?? 0,
      done: (research[item.internalName] ?? 0) >= item.needed
    }));
    // Filter: missing first (default), or researched
    list = list.filter(item => showDone ? item.done : !item.done);
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.internalName.toLowerCase().includes(q) ||
        String(item.id).includes(q)
      );
    }
    // Sort: alphabetical by display name
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [allItems, research, search, showDone]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="research-list">
      <div className="research-header">
        <h3>{showDone ? 'Researched Items' : 'Missing Items'} ({filtered.length.toLocaleString()})</h3>
        <div className="search-row">
          <input
            type="text"
            className="search-input"
            placeholder="Search name, internal, or #id..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <button
            className="toggle-btn"
            onClick={() => { setShowDone(!showDone); setPage(1); }}
            style={{ background: showDone ? '#2ecc71' : '#e74c3c' }}
          >
            {showDone ? 'Switch to Missing' : 'Switch to Researched'}
          </button>
        </div>
      </div>

      {pageItems.length > 0 ? (
        <>
          <div className="research-items">
            {pageItems.map((item) => (
              <div key={item.id} className={`research-item ${item.done ? 'done' : 'missing'}`}>
                <div className="item-info">
                  <span className="item-id">#{item.id}</span>
                  <span className="item-name">{item.name}</span>
                  <div className="item-bar">
                    <div
                      className="item-bar-fill"
                      style={{ width: `${Math.min((item.current / item.needed) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="item-count">{item.current}/{item.needed}</span>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>««</button>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
            <span className="page-info">
              Page {page} of {totalPages}
              <span className="page-count"> ({filtered.length.toLocaleString()} items)</span>
            </span>
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>»</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»»</button>
          </div>
        </>
      ) : (
        <p className="no-data">No items match your search.</p>
      )}
    </div>
  );
}

export default App;
