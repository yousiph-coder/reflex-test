// CineTest Client Application & SRE Reflex Target Controller
let currentMovies = [];
let currentCategory = 'All';
let currentSearch = '';
let currentMode = 'catalog';

// Client-side Sentry Error Capture Hook
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[CineTest Sentry Client Hook] Intercepted unhandled client error:', {
    message,
    source,
    lineno,
    colno,
    error
  });

  showSystemAlert({
    title: 'Client Runtime Exception Intercepted',
    message: `${message} (Line ${lineno}:${colno})`,
    stack: error ? error.stack : `Source: ${source}:${lineno}`
  });

  recordClientCrashEvent({
    name: error ? error.name : 'ClientError',
    message: String(message),
    stack: error ? error.stack : `${source}:${lineno}`
  });
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('[CineTest Sentry Client Hook] Unhandled Promise Rejection:', event.reason);
  showSystemAlert({
    title: 'Unhandled Async Rejection',
    message: event.reason ? (event.reason.message || String(event.reason)) : 'Promise rejected',
    stack: event.reason ? event.reason.stack : ''
  });
});

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  fetchCatalog(currentMode);
  refreshSentryEvents();
});

function initUI() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const refreshCatalogBtn = document.getElementById('refreshCatalogBtn');
  const catalogModeSelect = document.getElementById('catalogModeSelect');
  const toggleSrePanelBtn = document.getElementById('toggleSrePanelBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const closeAlertBtn = document.getElementById('closeAlertBtn');
  const closePlayerBtn = document.getElementById('closePlayerBtn');
  const stopStreamBtn = document.getElementById('stopStreamBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const testApiEndpointBtn = document.getElementById('testApiEndpointBtn');

  // Search input
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    clearSearchBtn.style.display = currentSearch ? 'block' : 'none';
    executeSearchAndFilter();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    clearSearchBtn.style.display = 'none';
    executeSearchAndFilter();
  });

  // Category pills
  const catPills = document.querySelectorAll('.cat-pill');
  catPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      catPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-genre');
      executeSearchAndFilter();
    });
  });

  // Reload button
  refreshCatalogBtn.addEventListener('click', () => {
    fetchCatalog(currentMode);
  });

  // Data mode select
  catalogModeSelect.addEventListener('change', (e) => {
    currentMode = e.target.value;
    fetchCatalog(currentMode);
  });

  // SRE Trigger buttons
  document.getElementById('triggerBug1Btn').addEventListener('click', () => triggerBug('1'));
  document.getElementById('triggerBug2Btn').addEventListener('click', () => triggerBug('2'));
  document.getElementById('triggerBug3Btn').addEventListener('click', () => triggerBug('3'));

  // Sidebar toggle
  toggleSrePanelBtn.addEventListener('click', toggleSidebar);
  closeSidebarBtn.addEventListener('click', toggleSidebar);
  closeAlertBtn.addEventListener('click', hideSystemAlert);

  // Player close
  closePlayerBtn.addEventListener('click', closePlayerModal);
  stopStreamBtn.addEventListener('click', closePlayerModal);

  // Sentry Actions
  clearLogsBtn.addEventListener('click', clearSentryLedger);
  testApiEndpointBtn.addEventListener('click', refreshSentryEvents);
}

/**
 * Loads movie catalog from API.
 * In 'catalog' mode, triggers Bug 1 (TypeError in loadCatalog on movie 4).
 */
async function fetchCatalog(mode) {
  const movieCount = document.getElementById('movieCount');
  movieCount.textContent = 'Loading titles from catalog...';

  try {
    const res = await fetch(`/api/movies?mode=${mode}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error ? `${data.error.name}: ${data.error.message}` : `HTTP Error ${res.status}`);
    }

    currentMovies = data.data;
    renderMovies(currentMovies);
    movieCount.textContent = `${currentMovies.length} titles available`;
    refreshSentryEvents();
  } catch (err) {
    console.error('[CineTest] Catalog fetch failed:', err);
    movieCount.textContent = 'Error loading catalog';
    showSystemAlert({
      title: 'Bug 1 Active: Catalog Load Exception',
      message: err.message,
      stack: err.stack || 'Check server logs for full stack trace.'
    });
    // Render fallback empty grid with alert
    renderErrorInGrid(err.message);
    refreshSentryEvents();
  }
}

/**
 * Searches and filters movies.
 * Triggers Bug 2 if searching or filtering across movie 5 (missing tagline/genre).
 */
async function executeSearchAndFilter() {
  try {
    const params = new URLSearchParams();
    if (currentSearch) params.append('q', currentSearch);
    if (currentCategory && currentCategory !== 'All') params.append('genre', currentCategory);

    const res = await fetch(`/api/movies/search?${params.toString()}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error ? `${data.error.name}: ${data.error.message}` : `HTTP Error ${res.status}`);
    }

    renderMovies(data.data);
    document.getElementById('movieCount').textContent = `${data.data.length} matches found`;
  } catch (err) {
    console.error('[CineTest] Search/filter failed:', err);
    showSystemAlert({
      title: 'Bug 2 Active: Search/Filter TypeError',
      message: err.message,
      stack: err.stack || 'Triggered by missing property on movie object during filter evaluation.'
    });
    refreshSentryEvents();
  }
}

/**
 * Renders movie cards into the grid.
 */
function renderMovies(movies) {
  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = '';

  if (!movies || movies.length === 0) {
    grid.innerHTML = `<div class="empty-state">No movies found matching the current criteria.</div>`;
    return;
  }

  movies.forEach((movie) => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const ratingText = movie.ratingDisplay || (movie.ratings && movie.ratings.score ? `${movie.ratings.score.toFixed(1)} / 10` : 'No rating');
    const genreText = movie.genre || 'Undefined Genre';
    const hasGenre = Boolean(movie.genre);

    card.innerHTML = `
      <div class="card-poster">
        <img src="${movie.posterUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80'}" alt="${movie.title}" loading="lazy">
        <div class="poster-overlay">
          <span class="rating-badge">★ ${ratingText}</span>
          <span class="year-badge">${movie.year}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">
          <span>${movie.title}</span>
        </div>
        <span class="genre-tag ${hasGenre ? '' : 'missing'}">${genreText}</span>
        <p class="card-desc">${movie.description || movie.tagline || 'No synopsis available.'}</p>
        <div class="card-meta">
          <span>⏱ ${movie.durationMinutes || 120} min</span>
          ${movie.cast ? ` • <span>${movie.cast.slice(0, 2).join(', ')}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-watch ${movie.id === 6 ? 'broken-target' : ''}" data-id="${movie.id}">
            ▶ Watch Now ${movie.id === 6 ? '(Bug 3 Target)' : ''}
          </button>
        </div>
      </div>
    `;

    // Watch button click
    const watchBtn = card.querySelector('.btn-watch');
    watchBtn.addEventListener('click', () => {
      handleWatchClick(movie);
    });

    grid.appendChild(card);
  });
}

/**
 * Watch button click handler.
 * INTENTIONAL SRE BUG 3:
 * On movie id 6 ("Oppenheimer"), movie.streamUrl is missing/undefined.
 * Accessing movie.streamUrl.split() throws unhandled TypeError directly!
 */
async function handleWatchClick(movie) {
  console.log(`[CineTest] Watch clicked for movie id=${movie.id} ("${movie.title}")`);

  try {
    // BUG 3 (Client-side crash): Accesses split directly on undefined streamUrl without null guard
    console.log('[CineTest] Resolving client stream protocol...');
    const protocol = movie.streamUrl.split('://')[0];
    console.log(`[CineTest] Client protocol resolved: ${protocol}`);

    // If client did not crash, invoke backend watch session initialization
    const res = await fetch(`/api/movies/${movie.id}/watch`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error ? `${data.error.name}: ${data.error.message}` : `HTTP Error ${res.status}`);
    }

    openPlayerModal(data.session);
  } catch (err) {
    console.error('[CineTest] Watch playback failure:', err);
    showSystemAlert({
      title: 'Bug 3 Active: Watch Player Crash',
      message: err.message,
      stack: err.stack || `Triggered on movie ID ${movie.id} ("${movie.title}") missing streamUrl.`
    });
    refreshSentryEvents();
  }
}

/**
 * Triggers bugs 1, 2, or 3 via the dedicated SRE endpoint.
 */
async function triggerBug(bugIndex) {
  try {
    console.log(`[Reflex] Invoking /api/test-crash?bug=${bugIndex}`);
    const res = await fetch(`/api/test-crash?bug=${bugIndex}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error ? `${data.error.name}: ${data.error.message}` : `HTTP Error ${res.status}`);
    }

    showSystemAlert({
      title: `Bug ${bugIndex} Trigger Response`,
      message: data.message || 'Endpoint returned success (Bug may be patched!).',
      stack: JSON.stringify(data, null, 2)
    });
    refreshSentryEvents();
  } catch (err) {
    showSystemAlert({
      title: `Bug ${bugIndex} Intercepted Successfully!`,
      message: err.message,
      stack: err.stack || 'Captured by Sentry Error Handler middleware.'
    });
    refreshSentryEvents();
  }
}

/**
 * Refreshes Sentry event ledger and displays in the sidebar.
 */
async function refreshSentryEvents() {
  try {
    const res = await fetch('/api/sentry/events');
    const data = await res.json();

    document.getElementById('totalErrorsCount').textContent = data.total;

    const list = document.getElementById('eventsLogList');
    list.innerHTML = '';

    if (!data.events || data.events.length === 0) {
      list.innerHTML = `<div class="empty-state">No exceptions recorded yet. Trigger a bug or click a movie card.</div>`;
      return;
    }

    data.events.forEach((evt) => {
      const card = document.createElement('div');
      card.className = 'event-card';
      const exc = evt.exception.values[0] || {};
      const timeStr = new Date(evt.timestamp).toLocaleTimeString();

      card.innerHTML = `
        <div class="event-card-header">
          <span class="event-type">${exc.type || 'Error'}</span>
          <span class="event-time">${timeStr}</span>
        </div>
        <div class="event-msg">${exc.value || 'No message'}</div>
        <div class="event-id">ID: ${evt.event_id.slice(0, 12)}... | ${evt.extra && evt.extra.url ? evt.extra.url : 'client'}</div>
      `;
      list.appendChild(card);
    });
  } catch (e) {
    console.warn('Failed to load Sentry events:', e);
  }
}

async function clearSentryLedger() {
  await fetch('/api/sentry/clear', { method: 'POST' });
  refreshSentryEvents();
}

function openPlayerModal(session) {
  document.getElementById('playerMovieTitle').textContent = `Now Playing: ${session.title}`;
  document.getElementById('playerSessionId').textContent = session.sessionId;
  document.getElementById('playerProtocol').textContent = session.protocol || 'HLS';
  document.getElementById('playerStreamUrl').textContent = session.streamUrl || 'N/A';
  document.getElementById('playerModal').style.display = 'flex';
}

function closePlayerModal() {
  document.getElementById('playerModal').style.display = 'none';
}

function showSystemAlert({ title, message, stack }) {
  document.getElementById('alertTitle').textContent = title;
  document.getElementById('alertMessage').textContent = message;
  document.getElementById('alertStack').textContent = stack || '';
  document.getElementById('systemAlert').style.display = 'flex';
}

function hideSystemAlert() {
  document.getElementById('systemAlert').style.display = 'none';
}

function renderErrorInGrid(message) {
  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; background: rgba(239,68,68,0.05); border: 1px dashed rgba(239,68,68,0.3); border-radius: 12px;">
      <h3 style="color: #fca5a5; margin-bottom: 0.5rem;">⚠️ Catalog Crash Active (Bug 1)</h3>
      <p style="color: #9ca3af; max-width: 500px; margin: 0 auto 1.5rem; font-size: 0.85rem;">
        <code>loadCatalog()</code> encountered an unhandled TypeError while reading <code>ratings.score</code> on Movie 4.
      </p>
      <button class="btn btn-secondary" onclick="document.getElementById('catalogModeSelect').value='raw'; fetchCatalog('raw');">
        Switch to Raw File Loader (Safe Bypass)
      </button>
    </div>
  `;
}

function toggleSidebar() {
  document.getElementById('sreSidebar').classList.toggle('open');
}

function recordClientCrashEvent({ name, message, stack }) {
  // Push to local event ledger
  refreshSentryEvents();
}
