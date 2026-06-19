let apiUrl = '';
let sessionId = '';
let eventQueue = [];
let isFlushing = false;
let retryCount = 0;
let flushTimeoutId = null;

const SESSION_KEY = 'analytics_session_id';
const QUEUE_KEY = 'analytics_pending_events';

// Generate a unique session ID using standard crypto or math fallback
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Persist the event queue to localStorage
function saveQueueToLocalStorage() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(eventQueue));
  } catch (err) {
    console.error('Failed to save event queue to localStorage', err);
  }
}

// Load pending events from localStorage
function loadQueueFromLocalStorage() {
  try {
    const saved = localStorage.getItem(QUEUE_KEY);
    if (saved) {
      eventQueue = JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to load event queue from localStorage', err);
  }
}

// Get the existing session ID or generate a new one
function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Send queue to backend with retry logic and backoff
async function flushQueue() {
  if (isFlushing || eventQueue.length === 0) return;

  isFlushing = true;
  const event = eventQueue[0];

  try {
    const response = await fetch(`${apiUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    // Success: remove from queue and proceed
    eventQueue.shift();
    saveQueueToLocalStorage();
    retryCount = 0;
    isFlushing = false;

    if (eventQueue.length > 0) {
      flushQueue();
    }
  } catch (error) {
    console.error('Failed to send event to analytics server. Retrying soon...', error);
    isFlushing = false;
    retryCount++;

    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    
    if (flushTimeoutId) clearTimeout(flushTimeoutId);
    flushTimeoutId = setTimeout(() => {
      flushQueue();
    }, delay);
  }
}

// Manually track any event type
export function trackEvent(eventType, details = {}) {
  const eventPayload = {
    session_id: sessionId || getOrCreateSessionId(),
    event_type: eventType,
    page_url: window.location.href.split('?')[0].split('#')[0], // Track base clean URLs
    timestamp: new Date().toISOString(),
    x: details.x !== undefined ? details.x : null,
    y: details.y !== undefined ? details.y : null,
  };

  eventQueue.push(eventPayload);
  saveQueueToLocalStorage();

  if (apiUrl) {
    flushQueue();
  }
}

// Initialize the tracking listeners
let isInitialized = false;

export function initTracker(customApiUrl) {
  if (isInitialized) return;
  isInitialized = true;

  apiUrl = customApiUrl || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  sessionId = getOrCreateSessionId();

  // Load offline queue
  loadQueueFromLocalStorage();
  if (eventQueue.length > 0) {
    flushQueue();
  }

  // Track initial page view
  trackEvent('page_view');

  window.addEventListener('click', (e) => {
    if (e.clientX !== undefined && e.clientY !== undefined) {
      trackEvent('click', {
        x: Math.round(e.pageX),
        y: Math.round(e.pageY),
      });
    }
  });

  window.addEventListener('popstate', () => {
    trackEvent('page_view');
  });

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    trackEvent('page_view');
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    trackEvent('page_view');
  };
}
