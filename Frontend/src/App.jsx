import { useState, useEffect } from 'react';
import SessionsList from './components/SessionsList.jsx';
import UserJourney from './components/UserJourney.jsx';
import Heatmap from './components/Heatmap.jsx';
import { trackEvent } from './tracker.js';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('playground'); // 'playground' or 'dashboard'
  const [dashSubTab, setDashSubTab] = useState('sessions'); // 'sessions' or 'heatmap'
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  
  // Playground states
  const [count, setCount] = useState(0);

  // Dashboard Stats States
  const [stats, setStats] = useState({ totalEvents: 0, totalSessions: 0, topPage: 'N/A' });
  const [statsLoading, setStatsLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch stats when dashboard tab is active
  useEffect(() => {
    if (activeTab === 'dashboard') {
      const fetchStats = async () => {
        setStatsLoading(true);
        try {
          const res = await fetch(`${apiUrl}/api/stats`);
          if (res.ok) {
            const data = await res.json();
            setStats(data);
          }
        } catch (err) {
          console.error('Failed to fetch stats:', err);
        } finally {
          setStatsLoading(false);
        }
      };
      fetchStats();
    }
  }, [activeTab, apiUrl]);

  // Track page view on tab transitions
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSelectedSessionId(null); // Reset detail view
    
    // Programmatically push state change to trigger tracker page view
    const path = tabName === 'playground' ? '/' : `/${tabName}`;
    window.history.pushState({}, '', path);
  };

  return (
    <>
      {/* App Header */}
      <header className="navbar">
        <div className="navbar-brand">
          <div className="brand-logo">CF</div>
          <span className="brand-name">CausalFunnel Analytics</span>
        </div>
        <nav className="navbar-nav">
          <button
            className={`nav-link ${activeTab === 'playground' ? 'active' : ''}`}
            onClick={() => handleTabChange('playground')}
          >
            Playground
          </button>
          <button
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            Dashboard
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'playground' ? (
          <div className="playground-view">
            <section id="center">
              <div className="hero">
                <img src={heroImg} className="base" width="170" height="179" alt="" />
                <img src={reactLogo} className="framework" alt="React logo" />
                <img src={viteLogo} className="vite" alt="Vite logo" />
              </div>
              <div>
                <h1>Get started</h1>
                <p>
                  Click around this playground! Clicks & Page Views are automatically tracked and transmitted to the database.
                </p>
              </div>
              <button
                type="button"
                className="counter"
                onClick={() => setCount((prev) => prev + 1)}
              >
                Count is {count}
              </button>
            </section>

            <div className="ticks"></div>

            <section id="next-steps">
              <div id="docs">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#documentation-icon"></use>
                </svg>
                <h2>Documentation</h2>
                <p>Your questions, answered</p>
                <ul>
                  <li>
                    <a href="https://vite.dev/" target="_blank" rel="noreferrer">
                      <img className="logo" src={viteLogo} alt="" />
                      Explore Vite
                    </a>
                  </li>
                  <li>
                    <a href="https://react.dev/" target="_blank" rel="noreferrer">
                      <img className="button-icon" src={reactLogo} alt="" />
                      Learn more
                    </a>
                  </li>
                </ul>
              </div>
              <div id="social">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#social-icon"></use>
                </svg>
                <h2>Connect with us</h2>
                <p>Join the Vite community</p>
                <ul>
                  <li>
                    <a href="https://github.com/vitejs/vite" target="_blank" rel="noreferrer">
                      <svg className="button-icon" role="presentation" aria-hidden="true">
                        <use href="/icons.svg#github-icon"></use>
                      </svg>
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="https://chat.vite.dev/" target="_blank" rel="noreferrer">
                      <svg className="button-icon" role="presentation" aria-hidden="true">
                        <use href="/icons.svg#discord-icon"></use>
                      </svg>
                      Discord
                    </a>
                  </li>
                </ul>
              </div>
            </section>
            <div className="ticks"></div>
            <section id="spacer"></section>
          </div>
        ) : (
          <div className="dashboard-view">
            {/* KPI Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Events Tracked</span>
                <span className="stat-value">
                  {statsLoading ? '...' : stats.totalEvents.toLocaleString()}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Unique Active Sessions</span>
                <span className="stat-value">
                  {statsLoading ? '...' : stats.totalSessions.toLocaleString()}
                </span>
              </div>
              <div className="stat-card top-page-card">
                <span className="stat-label">Most Visited Page</span>
                <span className="stat-value top-page-value" title={stats.topPage}>
                  {statsLoading ? '...' : stats.topPage.replace(window.location.origin, '') || '/'}
                </span>
              </div>
            </div>

            {/* Dashboard Sub Navigation */}
            <div className="dash-sub-nav">
              <button
                className={`sub-nav-link ${dashSubTab === 'sessions' ? 'active' : ''}`}
                onClick={() => {
                  setDashSubTab('sessions');
                  setSelectedSessionId(null);
                }}
              >
                User Sessions
              </button>
              <button
                className={`sub-nav-link ${dashSubTab === 'heatmap' ? 'active' : ''}`}
                onClick={() => setDashSubTab('heatmap')}
              >
                Click Heatmap
              </button>
            </div>

            {/* Sub Tab Contents */}
            <div className="dash-tab-content">
              {dashSubTab === 'sessions' ? (
                selectedSessionId ? (
                  <UserJourney
                    sessionId={selectedSessionId}
                    onBack={() => setSelectedSessionId(null)}
                    apiUrl={apiUrl}
                  />
                ) : (
                  <SessionsList
                    onSelectSession={(id) => setSelectedSessionId(id)}
                    apiUrl={apiUrl}
                  />
                )
              ) : (
                <Heatmap apiUrl={apiUrl} />
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
