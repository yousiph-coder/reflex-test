const express = require('express');
const path = require('path');
const { loadMoviesRaw, loadCatalog } = require('./lib/movieLoader');
const { searchAndFilterMovies, initializeWatchSession } = require('./lib/movieService');
const sentry = require('./lib/sentryMock');

const app = express();
const PORT = process.env.PORT || 3050;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging & breadcrumb tracker
app.use((req, res, next) => {
  sentry.addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.url}`,
    data: { query: req.query, body: req.body }
  });
  next();
});

/**
 * GET /api/movies
 * Fetches the movie catalog.
 * Defaults to calling loadCatalog() which has Bug 1 intentionally planted.
 * Optional query parameter ?mode=raw allows fetching without normalization.
 */
app.get('/api/movies', (req, res, next) => {
  try {
    const mode = req.query.mode || 'catalog';
    if (mode === 'raw') {
      const movies = loadMoviesRaw();
      return res.json({ success: true, count: movies.length, data: movies });
    }

    // Triggers Bug 1: loadCatalog() crashes on Movie 4 (missing ratings object)
    const catalog = loadCatalog();
    res.json({ success: true, count: catalog.length, data: catalog });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/movies/search
 * Filters and searches movies.
 * Triggers Bug 2 when querying or filtering categories across Movie 5 (missing tagline/genre).
 */
app.get('/api/movies/search', (req, res, next) => {
  try {
    const { q, genre, source } = req.query;
    // By default, query raw movies to isolate Bug 2 from Bug 1
    const baseMovies = loadMoviesRaw();
    const results = searchAndFilterMovies(baseMovies, { query: q, genre });
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/movies/:id/watch
 * Initializes streaming playback session.
 * Triggers Bug 3 when called with movie ID 6 (missing streamUrl).
 */
app.get('/api/movies/:id/watch', (req, res, next) => {
  try {
    const movieId = req.params.id;
    const session = initializeWatchSession(movieId);
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

/**
 * Dedicated SRE Autonomous Testing Endpoint
 * Allows Reflex sandbox / QA automation to trigger each planted bug deterministically.
 */
app.get('/api/test-crash', (req, res, next) => {
  const bug = req.query.bug || '1';

  try {
    if (bug === '1') {
      // Trigger Bug 1: Broken JSON / nested property access in loader
      console.log('[Reflex Target] Triggering Bug 1: loadCatalog()');
      const data = loadCatalog();
      return res.json({ success: true, bug: 1, message: "Bug 1 did not fire (fixed?)", data });
    } else if (bug === '2') {
      // Trigger Bug 2: Undefined property crash in search / filter
      console.log('[Reflex Target] Triggering Bug 2: searchAndFilterMovies()');
      const rawMovies = loadMoviesRaw();
      const results = searchAndFilterMovies(rawMovies, { query: 'future', genre: 'Sci-Fi' });
      return res.json({ success: true, bug: 2, message: "Bug 2 did not fire (fixed?)", count: results.length });
    } else if (bug === '3') {
      // Trigger Bug 3: Watch player crash on missing streamUrl
      console.log('[Reflex Target] Triggering Bug 3: initializeWatchSession(6)');
      const session = initializeWatchSession(6);
      return res.json({ success: true, bug: 3, message: "Bug 3 did not fire (fixed?)", session });
    } else {
      return res.status(400).json({ error: "Invalid bug index. Use ?bug=1, ?bug=2, or ?bug=3" });
    }
  } catch (err) {
    // Pass to Sentry error-handler middleware
    next(err);
  }
});

/**
 * Sentry Inspection Endpoints
 */
app.get('/api/sentry/events', (req, res) => {
  res.json({
    total: sentry.getEvents().length,
    events: sentry.getEvents()
  });
});

app.post('/api/sentry/clear', (req, res) => {
  sentry.clearEvents();
  res.json({ success: true, message: 'Sentry event ledger cleared.' });
});

// Sentry Error Handler Middleware (captures unhandled runtime exceptions)
app.use(sentry.errorHandler());

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  🎬 CineTest SRE Benchmark Server Started!`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`  Planted SRE Target Bugs:`);
    console.log(`    - Bug 1: Broken JSON/Data Parsing (GET /api/test-crash?bug=1)`);
    console.log(`    - Bug 2: Search/Filter TypeError  (GET /api/test-crash?bug=2)`);
    console.log(`    - Bug 3: Watch Player Crash       (GET /api/test-crash?bug=3)`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
