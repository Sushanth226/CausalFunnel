import { useState, useEffect } from 'react';

export default function SessionsList({ onSelectSession, apiUrl }) {
  const [sessions, setSessions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table options states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('last_seen');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 8; // Sessions per page

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          search: debouncedSearch,
          sortBy,
          sortOrder,
          page: page.toString(),
          limit: limit.toString(),
        });

        const res = await fetch(`${apiUrl}/api/sessions?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch sessions data');
        }
        const data = await res.json();
        setSessions(data.sessions || []);
        setTotalCount(data.total || 0);
        setError(null);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [debouncedSearch, sortBy, sortOrder, page, apiUrl]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending for new sort column
    }
    setPage(1);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSortIndicator = (field) => {
    if (sortBy !== field) return '↕';
    return sortOrder === 'asc' ? '▲' : '▼';
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="sessions-container">
      <div className="dashboard-header-row">
        <h3 className="tab-title">Active User Sessions</h3>
        <div className="search-box-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search Session ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      <div className="table-responsive">
        <table className="sessions-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('session_id')} className="sortable-header">
                Session ID <span className="sort-icon">{getSortIndicator('session_id')}</span>
              </th>
              <th onClick={() => handleSort('total_events')} className="sortable-header text-right">
                Event Count <span className="sort-icon">{getSortIndicator('total_events')}</span>
              </th>
              <th onClick={() => handleSort('first_seen')} className="sortable-header">
                First Seen <span className="sort-icon">{getSortIndicator('first_seen')}</span>
              </th>
              <th onClick={() => handleSort('last_seen')} className="sortable-header">
                Last Seen <span className="sort-icon">{getSortIndicator('last_seen')}</span>
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="table-status">Loading session data...</td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-status">No matching sessions found.</td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.session_id} className="session-row" onClick={() => onSelectSession(session.session_id)}>
                  <td className="session-id-cell">
                    <code className="session-id-code">{session.session_id}</code>
                  </td>
                  <td className="text-right font-medium">
                    {session.total_events}
                  </td>
                  <td>{formatDateTime(session.first_seen)}</td>
                  <td>{formatDateTime(session.last_seen)}</td>
                  <td>
                    <button 
                      className="view-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid double trigger
                        onSelectSession(session.session_id);
                      }}
                    >
                      Analyze Journey
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-wrapper">
          <span className="pagination-info">
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} sessions total)
          </span>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                
                return (
                  <span key={p} className="page-item-wrapper">
                    {showEllipsis && <span className="pagination-ellipsis">...</span>}
                    <button
                      className={`pagination-btn number-btn ${page === p ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                      disabled={loading}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}

            <button
              className="pagination-btn"
              disabled={page === totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
