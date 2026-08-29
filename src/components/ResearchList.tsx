import React, { useState, useMemo } from 'react';
import type { Item } from '../utils/itemsDb';

interface Props {
  research: Record<string, number>;
  items: Item[];
}

const ITEMS_PER_PAGE = 50;

interface ResearchEntry {
  internalName: string;
  displayName: string;
  current: number;
  needed: number;
  isMissing: boolean;
}

export const ResearchList: React.FC<Props> = ({ research, items }) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);

  const entries: ResearchEntry[] = useMemo(() => {
    return items.map(item => {
      const current = research[item.internalName] ?? 0;
      return {
        internalName: item.internalName,
        displayName: item.name,
        current,
        needed: item.needed,
        isMissing: current < item.needed
      };
    });
  }, [items, research]);

  const filtered = useMemo(() => {
    let list = entries;
    if (!showAll) list = list.filter(e => e.isMissing);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.displayName.toLowerCase().includes(q) ||
        e.internalName.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [entries, search, showAll]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="research-list">
      <div className="research-header">
        <h3>Research Items ({filtered.length})</h3>
        <div className="search-row">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or internal..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <button
            className="toggle-btn"
            onClick={() => { setShowAll(!showAll); setPage(1); }}
            style={{ background: showAll ? '#2ecc71' : '#444' }}
          >
            {showAll ? 'Show Only Missing' : 'Show All (incl. done)'}
          </button>
        </div>
      </div>

      {pageItems.length > 0 ? (
        <>
          <div className="research-items">
            {pageItems.map((entry) => (
              <div key={entry.internalName} className={`research-item ${entry.isMissing ? 'missing' : 'done'}`}>
                <div className="item-info">
                  <span className="item-name">{entry.displayName}</span>
                  <div className="item-bar">
                    <div
                      className="item-bar-fill"
                      style={{ width: `${Math.min((entry.current / entry.needed) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="item-count">{entry.current}/{entry.needed}</span>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>««</button>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
            <span className="page-info">
              Page {page} of {totalPages}
              <span className="page-count">({filtered.length.toLocaleString()} items)</span>
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
};
