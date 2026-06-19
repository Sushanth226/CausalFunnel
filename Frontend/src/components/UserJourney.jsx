import { useState, useEffect } from 'react';

export default function UserJourney({ sessionId, onBack, apiUrl }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessionEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/sessions/${sessionId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch session events');
        }
        const data = await res.json();
        setEvents(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching session events:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionEvents();
    }
  }, [sessionId, apiUrl]);

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      millisecond: 'numeric',
    });
  };

  const getCleanTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="journey-container">
      <div className="journey-header">
        <button className="back-btn" onClick={onBack}>
          Back to Sessions
        </button>
        <div className="session-info-card">
          <span className="label">Analyzing Session</span>
          <code className="session-id-large">{sessionId}</code>
        </div>
      </div>

      {loading ? (
        <div className="journey-status">Retrieving chronological event path...</div>
      ) : error ? (
        <div className="error-message">Error: {error}</div>
      ) : events.length === 0 ? (
        <div className="journey-status">No events recorded for this session.</div>
      ) : (
        <div className="timeline-wrapper">
          <div className="timeline-line"></div>
          
          {events.map((event, index) => {
            const isClick = event.event_type === 'click';
            
            return (
              <div key={event._id || index} className="timeline-item">
                <div className="timeline-node-wrapper">
                  <div className={`timeline-node ${isClick ? 'node-click' : 'node-view'}`}>
                  </div>
                </div>

                <div className="timeline-content-card">
                  <div className="timeline-content-header">
                    <span className={`event-badge ${isClick ? 'badge-click' : 'badge-view'}`}>
                      {event.event_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="timeline-time" title={formatDateTime(event.timestamp)}>
                      {getCleanTime(event.timestamp)}
                    </span>
                  </div>
                  
                  <div className="timeline-detail-row">
                    <span className="detail-label">Page:</span>
                    <a href={event.page_url} target="_blank" rel="noopener noreferrer" className="detail-value page-link">
                      {event.page_url}
                    </a>
                  </div>

                  {isClick && event.x !== null && event.y !== null && (
                    <div className="timeline-detail-row">
                      <span className="detail-label">Coordinates:</span>
                      <span className="detail-value coordinate-badge">
                        X: <strong>{event.x}px</strong>, Y: <strong>{event.y}px</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
