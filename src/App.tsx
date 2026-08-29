import React, { useState, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { parsePlrFile, getResearchProgress } from './utils/plrParser';
import { getAllItems } from './utils/itemsDb';
import ConsolePanel from './components/ConsolePanel';
import CustomSelect from './components/CustomSelect';
import './App.css';

function App() {
  const isDebug = window.location.search.includes('debug');
  const [playerName, setPlayerName] = useState<string>('');
  const [research, setResearch] = useState<Record<string, number>>({});
  const [_, setProgress] = useState<number>(0); // kept for potential future
  const [fileError, setFileError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const allItems = useMemo(() => getAllItems(), []);

  const stats = useMemo(() => {
    let researched = 0;
    let complete = 0;
    let partial = 0;
    let missing = 0;
    for (const item of allItems) {
      if (item.needed === 0) continue; // unobtainable
      const current = research[item.internalName] ?? 0;
      if (current > 0) researched++;
      if (current >= item.needed) complete++;
      else if (current > 0) partial++;
      else missing++;
    }
    const totalObtainable = allItems.filter(i => i.needed > 0).length;
    const unobtainable = allItems.filter(i => i.needed === 0).length;
    const totalProgress = (complete / Math.max(1, totalObtainable)) * 100;
    return { researched, complete, partial, missing, total: totalObtainable, unobtainable, totalProgress };
  }, [allItems, research]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    flushSync(() => setIsLoading(true));
    const file = event.target.files?.[0];
    if (!file) {
      setIsLoading(false);
      return
    };
    setFileError('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const plrData = await parsePlrFile(arrayBuffer);
        setPlayerName(plrData.playerName);
        setResearch(plrData.research);
        const { progressPercent } = getResearchProgress(plrData.research, plrData.items);
        setProgress(progressPercent);
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Unknown error';
        setFileError('Failed to parse .plr file: ' + errorMsg);
        console.error('Error parsing .plr file:', error);
      } finally {
        setIsLoading(false);
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
    <div className={`App ${isDebug ? 'debug-mode' : ''}`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Decrypting and parsing .plr file...</p>
        </div>
      )}
      <header className="app-header">
        <h1>Terraria Research Tracker</h1>
        <p className="subtitle">Track your Journey's End research progress</p>
      </header>

      <div className="file-upload-section">
        <div className="upload-box">
          <input type="file" accept=".plr" id="plr-upload" onChange={handleFileUpload} className="file-input" />
          <label htmlFor="plr-upload" className="btn btn-primary">
            <span className="upload-icon">📁</span>
            <span>Choose .plr file</span>
          </label>
          <button onClick={handleClear} className="btn btn-secondary" disabled={!playerName}>
            <span className="upload-icon">🗑</span>
            <span>Clear</span>
          </button>
          {playerName && (
            <button onClick={handleExport} className="btn btn-success" style={{ background: '#2ecc71' }}>
              <span className="upload-icon">📤</span>
              <span>Export JSON</span>
            </button>
          )}
        </div>
        {fileError && <div className="error-message">{fileError}</div>}
      </div>

      {playerName && (
        <div className="results-section">
          <ResearchSection research={research} allItems={allItems} stats={stats} playerName={playerName} />
        </div>
      )}
      {window.location.search.includes('debug') && <ConsolePanel />}
    </div>
  );
}

function ResearchSection({ research, allItems, stats, playerName }: { research: Record<string, number>; allItems: any[]; stats?: any; playerName?: string }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'missing' | 'partial' | 'done' | 'unobtainable' | 'all'>('missing');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const counts = useMemo(() => {
    let missing = 0, partial = 0, done = 0, unobtainable = 0;
    for (const item of allItems) {
      if (item.needed === 0) { unobtainable++; continue; }
      const current = research[item.internalName] ?? 0;
      if (current >= item.needed) done++;
      else if (current > 0) partial++;
      else missing++;
    }
    return { missing, partial, done, unobtainable, all: allItems.length };
  }, [allItems, research]);

  const [sortMode, setSortMode] = useState<'name_asc' | 'name_desc' | 'id_asc' | 'id_desc'>('name_asc');

  const filtered = useMemo(() => {
    let list = allItems.map(item => {
      if (item.needed === 0) {
        return { ...item, current: 0, status: 'unobtainable' as const };
      }
      const current = research[item.internalName] ?? 0;
      return { ...item, current, status: current >= item.needed ? 'done' : current > 0 ? 'partial' : 'missing' };
    }).filter(Boolean);
    if (filter !== 'all' && filter !== 'unobtainable') {
      list = list.filter(item => item.status === filter);
    } else if (filter === 'unobtainable') {
      list = list.filter(item => item.status === 'unobtainable');
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.internalName.toLowerCase().includes(q) ||
        String(item.id).includes(q)
      );
    }
    if (sortMode === 'id_asc') list.sort((a, b) => a.id - b.id);
    else if (sortMode === 'id_desc') list.sort((a, b) => b.id - a.id);
    else if (sortMode === 'name_desc') list.sort((a, b) => b.name.localeCompare(a.name));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [allItems, research, search, filter, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageItems = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const filterBtns: { key: typeof filter; label: string; color: string }[] = [
    { key: 'missing', label: `✗ Missing (${counts.missing.toLocaleString()})`, color: '#e74c3c' },
    { key: 'partial', label: `◐ Partial (${counts.partial.toLocaleString()})`, color: '#f39c12' },
    { key: 'done', label: `✓ Done (${counts.done.toLocaleString()})`, color: '#2ecc71' },
    { key: 'unobtainable', label: `⊘ Unobtainable (${counts.unobtainable.toLocaleString()})`, color: '#7f8c8d' },
    { key: 'all', label: `All (${counts.all.toLocaleString()})`, color: '#3498db' }
  ];

  return (
    <div className="research-list">
      <div className="progress-overview">
        <div className="progress-card">
          <div style={{display: "flex", flexDirection: "column"}}>
            <div className="player-info">
              <h2>Player: {playerName}</h2>
            </div>
            <div className="progress-stats">
              <div className="stat">
                <span className="stat-value">{stats.complete.toLocaleString()}</span>
                <span className="stat-label">Researched</span>
              </div>
            </div>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${stats?.totalProgress ?? 0}%` }} />
            </div>
            <div className="progress-bar-label">
              {stats?.totalProgress?.toFixed?.(1) ?? '0.0'}%
            </div>
          </div>
          
        </div>
      </div>
      <div className="research-header">
        <div className="research-header-row">
          <h3>Research Items</h3>
          <div className="search-row">
            <input
              type="text"
              className="search-input"
              placeholder="Search name, internal, or #id..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div className="filter-row">
          <div className="filter-btn-group">
            {filterBtns.map(b => (
              <button
                key={b.key}
                className="filter-btn"
                onClick={() => { setFilter(b.key); setPage(1); }}
                style={{ background: filter === b.key ? b.color : '#444', borderColor: b.color }}
              >
                {b.label}
              </button>
            ))}
          </div>
          <select className="search-input sort-select" value={sortMode} onChange={e => setSortMode(e.target.value as typeof sortMode)}>
            <option value="name_asc">Name Ascending</option>
            <option value="name_desc">Name Descending</option>
            <option value="id_asc">ID Ascending</option>
            <option value="id_desc">ID Descending</option>
          </select>
        </div>
      </div>

      {pageItems.length > 0 ? (
        <>
          <div className="research-items">
            {pageItems.map((item) => {
              return (
              <div
                key={item.id}
                className={`research-item ${item.status}`}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'default' }}
              >
                <div className="item-info">
                  <span className="item-id">#{item.id}</span>
                  <span className="item-image-wrapper">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="item-image"
                      onError={(e) => { const img = e.target as HTMLImageElement; img.style.background = "#555"; img.style.opacity = "0.5"; }}
                    />
                  </span>
                  <span className="item-name">{item.name}</span>
                  <div className="item-bar">
                    <div
                      className="item-bar-fill"
                      style={{ width: `${Math.min((item.current / Math.max(item.needed, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="item-count">{item.current}/{item.needed}</span>
              </div>
              );
            })}
          </div>

          <div className="per-page-select">
            <label>Show:</label>
            <CustomSelect value={itemsPerPage} onChange={v => { setItemsPerPage(v); setPage(1); }} options={[25, 50, 100]} />
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
