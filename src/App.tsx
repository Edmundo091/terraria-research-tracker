import React, { useState, useMemo } from 'react';
import { parsePlrFile, getResearchProgress } from './utils/plrParser';
import ConsolePanel from './components/ConsolePanel';
import './App.css';

const ITEMS_PER_PAGE = 50;

function isValidItemName(name: string): boolean {
  // Must be printable ASCII, reasonable length, no control chars
  if (!name || name.length === 0 || name.length > 60) return false;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c < 32 || c > 126) return false;
  }
  // Must have at least one letter
  return /[a-zA-Z]/.test(name);
}

function App() {
  const [playerName, setPlayerName] = useState<string>('');
  const [research, setResearch] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<number>(0);
  const [totalResearched, setTotalResearched] = useState<number>(0);
  const [fileError, setFileError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError('');
    setSearchQuery('');
    setCurrentPage(1);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const plrData = await parsePlrFile(arrayBuffer);

        setPlayerName(plrData.playerName);
        setResearch(plrData.research);

        const { totalResearched: total, progressPercent } = getResearchProgress(plrData.research);
        setProgress(progressPercent);
        setTotalResearched(total);
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Unknown error';
        setFileError('Failed to parse .plr file: ' + errorMsg);
        console.error('Error parsing .plr file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    const exportData = {
      playerName,
      research,
      version: 326,
      timestamp: new Date().toISOString()
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
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
    setTotalResearched(0);
    setFileError('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Filter valid items and sort
  const validResearch = useMemo(() => {
    return Object.entries(research)
      .filter(([name, count]) => isValidItemName(name) && count > 0)
      .sort((a, b) => b[1] - a[1]); // Sort by count descending
  }, [research]);

  // Search filter
  const filteredResearch = useMemo(() => {
    if (!searchQuery.trim()) return validResearch;
    const q = searchQuery.toLowerCase();
    return validResearch.filter(([name]) => name.toLowerCase().includes(q));
  }, [validResearch, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredResearch.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredResearch.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Terraria Research Tracker</h1>
        <p className="subtitle">Track your Journey's End research progress</p>
      </header>

      <div className="file-upload-section">
        <div className="upload-box">
          <input
            type="file"
            accept=".plr"
            id="plr-upload"
            onChange={handleFileUpload}
            className="file-input"
          />
          <label htmlFor="plr-upload" className="upload-label">
            <span className="upload-icon">📁</span>
            <span>Choose .plr file</span>
          </label>
          <button onClick={handleClear} className="clear-btn" disabled={!playerName}>
            Clear
          </button>
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
                  <circle
                    className="progress-ring-bg"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="#333"
                    strokeWidth="8"
                  />
                  <circle
                    className="progress-ring-fg"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeDasharray="339.292"
                    strokeDashoffset={339.292 * (1 - progress / 100)}
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
                  <span className="progress-percent">{progress.toFixed(1)}%</span>
                </div>
              </div>
              <div className="progress-stats">
                <div className="stat">
                  <span className="stat-value">{totalResearched.toLocaleString()}</span>
                  <span className="stat-label">Total Researched</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{validResearch.length.toLocaleString()}</span>
                  <span className="stat-label">Unique Items</span>
                </div>
              </div>
            </div>
          </div>

          <div className="research-list">
            <div className="research-header">
              <h3>Research Items</h3>
              <input
                type="text"
                className="search-input"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {filteredResearch.length > 0 ? (
              <>
                <div className="research-items">
                  {paginatedItems.map(([name, count]) => (
                    <div key={name} className="research-item">
                      <div className="item-info">
                        <span className="item-name">{name}</span>
                        <div className="item-bar">
                          <div
                            className="item-bar-fill"
                            style={{ width: `${Math.min((count / 100) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="item-count">{count}/100</span>
                    </div>
                  ))}
                </div>

                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    ««
                  </button>
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    «
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                    <span className="page-count">
                      ({filteredResearch.length.toLocaleString()} items)
                    </span>
                  </span>
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    »
                  </button>
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    »»
                  </button>
                </div>
              </>
            ) : (
              <p className="no-data">
                {searchQuery ? 'No items match your search.' : 'No research data found in this file.'}
              </p>
            )}
          </div>
        </div>
      )}
      <ConsolePanel />
    </div>
  );
}

export default App;
