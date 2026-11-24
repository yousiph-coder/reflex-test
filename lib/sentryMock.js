const crypto = require('crypto');

class SentryMock {
  constructor() {
    this.events = [];
    this.breadcrumbs = [];
    this.dsn = "https://reflex_sre_cinetest@o0.ingest.sentry.io/4509999999999999";
  }

  addBreadcrumb(crumb) {
    this.breadcrumbs.push({
      timestamp: new Date().toISOString(),
      category: crumb.category || 'default',
      message: crumb.message || '',
      level: crumb.level || 'info',
      data: crumb.data || {}
    });
    // Keep last 30 breadcrumbs
    if (this.breadcrumbs.length > 30) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Captures an unhandled exception into the Sentry event ledger.
   * @param {Error} error
   * @param {Object} [context]
   * @returns {string} eventId
   */
  captureException(error, context = {}) {
    const eventId = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `evt_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const event = {
      event_id: eventId,
      timestamp,
      platform: "node",
      level: "error",
      environment: process.env.NODE_ENV || "staging",
      release: "cinetest@1.0.0",
      exception: {
        values: [
          {
            type: error.name || "Error",
            value: error.message || String(error),
            stacktrace: {
              frames: (error.stack || "").split("\n").map((line) => line.trim())
            }
          }
        ]
      },
      tags: {
        service: "cinetest",
        sre_target: "reflex",
        bug_category: context.bugCategory || "unhandled_runtime_crash",
        ...context.tags
      },
      extra: {
        ...context.extra,
        url: context.url,
        method: context.method,
        query: context.query
      },
      breadcrumbs: [...this.breadcrumbs]
    };

    this.events.unshift(event);

    // Keep last 50 events in memory
    if (this.events.length > 50) {
      this.events.pop();
    }

    console.error(`\x1b[31m[Sentry Interceptor] Captured ${error.name}: "${error.message}" (Event ID: ${eventId})\x1b[0m`);
    if (error.stack) {
      console.error(`\x1b[33m${error.stack}\x1b[0m`);
    }

    return eventId;
  }

  getEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
    this.breadcrumbs = [];
  }

  /**
   * Express error-handling middleware that captures unhandled exceptions into Sentry
   */
  errorHandler() {
    return (err, req, res, next) => {
      const eventId = this.captureException(err, {
        url: req.originalUrl,
        method: req.method,
        query: req.query,
        tags: { endpoint: req.path }
      });

      res.status(500).json({
        success: false,
        error: {
          name: err.name,
          message: err.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
        },
        sentry: {
          captured: true,
          eventId,
          dsn: this.dsn
        }
      });
    };
  }
}

const sentry = new SentryMock();

module.exports = sentry;
