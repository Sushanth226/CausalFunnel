import { useState, useEffect, useRef } from 'react';

export default function Heatmap({ apiUrl }) {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('thermal'); // 'thermal' or 'dots'
  const canvasRef = useRef(null);

  // Fetch unique pages for dropdown
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/pages`);
        if (!res.ok) throw new Error('Failed to fetch pages');
        const data = await res.json();
        setPages(data || []);
        if (data && data.length > 0) {
          setSelectedPage(data[0]);
        }
      } catch (err) {
        console.error('Error fetching pages:', err);
        setError('Failed to load tracked URLs');
      }
    };
    fetchPages();
  }, [apiUrl]);

  // Fetch clicks when selected page changes
  useEffect(() => {
    const fetchClicks = async () => {
      if (!selectedPage) return;
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/heatmap?pageUrl=${encodeURIComponent(selectedPage)}`);
        if (!res.ok) throw new Error('Failed to fetch heatmap data');
        const data = await res.json();
        setClicks(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching heatmap:', err);
        setError('Failed to load click coordinates');
      } finally {
        setLoading(false);
      }
    };

    fetchClicks();
  }, [selectedPage, apiUrl]);

  // Draw Heatmap Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas dimensions based on clicks or standard layout
    // Determine dynamic boundaries
    const defaultWidth = 1126; // Matches index.css #root width
    const defaultHeight = 800;
    
    const maxClickX = clicks.length > 0 ? Math.max(...clicks.map(c => c.x)) : 0;
    const maxClickY = clicks.length > 0 ? Math.max(...clicks.map(c => c.y)) : 0;
    
    // Set canvas dimensions to wrap all clicks or fit default
    const width = Math.max(maxClickX + 50, defaultWidth);
    const height = Math.max(maxClickY + 100, defaultHeight);

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (clicks.length === 0) {
      ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No click data available for this page URL', width / 2, height / 2);
      return;
    }

    if (viewMode === 'dots') {
      clicks.forEach(click => {
        ctx.beginPath();
        ctx.arc(click.x, click.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      });
    } else {
      const radius = 30;

      clicks.forEach(click => {
        const gradient = ctx.createRadialGradient(click.x, click.y, 2, click.x, click.y, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.beginPath();
        ctx.arc(click.x, click.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const getHeatmapColor = (value) => {
          const colors = [
            { offset: 0.0, r: 0, g: 100, b: 255 },  // Cold (Blue)
            { offset: 0.25, r: 0, g: 255, b: 255 }, // Cool (Cyan)
            { offset: 0.5, r: 0, g: 255, b: 0 },    // Warm (Green)
            { offset: 0.75, r: 255, g: 255, b: 0 }, // Hot (Yellow)
            { offset: 1.0, r: 255, g: 0, b: 0 }     // Fire (Red)
          ];

          let c1 = colors[0];
          let c2 = colors[colors.length - 1];

          for (let i = 0; i < colors.length - 1; i++) {
            if (value >= colors[i].offset && value <= colors[i + 1].offset) {
              c1 = colors[i];
              c2 = colors[i + 1];
              break;
            }
          }

          const range = c2.offset - c1.offset;
          const factor = range === 0 ? 0 : (value - c1.offset) / range;

          return {
            r: Math.round(c1.r + factor * (c2.r - c1.r)),
            g: Math.round(c1.g + factor * (c2.g - c1.g)),
            b: Math.round(c1.b + factor * (c2.b - c1.b))
          };
        };

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 0) {
            const intensity = alpha / 255;
            const color = getHeatmapColor(intensity);
            
            data[i] = color.r;
            data[i + 1] = color.g;
            data[i + 2] = color.b;
            data[i + 3] = Math.round(alpha * 0.75);
          }
        }

        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.error('Error colorizing canvas:', err);
      }
    }
  }, [clicks, viewMode]);

  return (
    <div className="heatmap-container">
      <div className="dashboard-header-row">
        <h3 className="tab-title">Interactive Click Heatmap</h3>
        <div className="heatmap-controls">
          <div className="select-wrapper">
            <label htmlFor="url-select" className="control-label">Target Page:</label>
            <select
              id="url-select"
              className="url-dropdown"
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
            >
              {pages.length === 0 ? (
                <option value="">No tracked pages available</option>
              ) : (
                pages.map(page => (
                  <option key={page} value={page}>{page}</option>
                ))
              )}
            </select>
          </div>

          <div className="toggle-wrapper">
            <button
              className={`toggle-btn ${viewMode === 'thermal' ? 'active' : ''}`}
              onClick={() => setViewMode('thermal')}
            >
              Thermal Map
            </button>
            <button
              className={`toggle-btn ${viewMode === 'dots' ? 'active' : ''}`}
              onClick={() => setViewMode('dots')}
            >
              Dot Plot
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      <div className="heatmap-viewport">
        {loading ? (
          <div className="heatmap-status">Generating visualization overlay...</div>
        ) : (
          <div className="canvas-wrapper">
            {/* Underlay a mockup container that matches the site layout so clicks line up nicely */}
            <div className="mockup-bg">
              <div className="mockup-header-stub">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="address-bar">{selectedPage}</span>
              </div>
              <div className="mockup-content-grid">
                <div className="mockup-hero">
                  <div className="mockup-logo-circle"></div>
                  <div className="mockup-title-bar"></div>
                  <div className="mockup-subtitle-bar"></div>
                  <div className="mockup-btn-stub"></div>
                </div>
                <div className="mockup-footer-section">
                  <div className="mockup-card"></div>
                  <div className="mockup-card"></div>
                </div>
              </div>
            </div>

            {/* Heatmap Canvas overlay */}
            <canvas ref={canvasRef} className="heatmap-canvas" />
          </div>
        )}
      </div>
    </div>
  );
}
