import React, { useState } from 'react';
import { parsePlrFile, getResearchProgress } from './utils/plrParser';
import ConsolePanel from './components/ConsolePanel';
import './App.css';

interface ResearchItem {
  id: number;
  name: string;
  count: number;
  max: number;
}

function App() {
  const [playerName, setPlayerName] = useState<string>('');
  const [research, setResearch] = useState<Record<number, number>>({});
  const [progress, setProgress] = useState<number>(0);
  const [totalResearched, setTotalResearched] = useState<number>(0);
  const [fileError, setFileError] = useState<string>('');

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
    // Save data to localStorage so it can be exported
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
  };

  const sortedResearch: ResearchItem[] = Object.entries(research)
    .map(([id, count]) => ({
      id: parseInt(id, 10),
      name: `Item ${id}`,
      count: count,
      max: 100,
    }))
    .sort((a, b) => b.count - a.count);

  const researchItems = sortedResearch.slice(0, 20); // Show top 20 items

  return (
    <div className="App">
      <header className="app-header">
        <h1> Terraria Research Tracker </h1>
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
                  <span className="stat-value">{totalResearched}</span>
                  <span className="stat-label">Items Researched</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{Object.keys(research).length}</span>
                  <span className="stat-label">Unique Items</span>
                </div>
              </div>
            </div>
          </div>

          <div className="research-list">
            <h3>Most Researched Items</h3>
            {researchItems.length > 0 ? (
              <div className="research-items">
                {researchItems.map((item) => (
                  <div key={item.id} className="research-item">
                    <div className="item-info">
                      <span className="item-id">ID: {item.id}</span>
                      <div className="item-bar">
                        <div
                          className="item-bar-fill"
                          style={{ width: `${(item.count / item.max) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="item-count">{item.count}/{item.max}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No research data found in this file.</p>
            )}
          </div>
        </div>
      )}
      <ConsolePanel />
    </div>
  );
}

export default App;