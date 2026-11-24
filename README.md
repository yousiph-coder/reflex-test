# CineTest — Autonomous SRE & Reflex Stress-Test Benchmark

CineTest is a clean, minimal Movie Streaming Web App built for **Reflex** (Autonomous SRE & Self-Healing Testing).

It simulates a production streaming service (inspired by Netflix/Hulu) with **3 intentionally planted runtime exceptions** designed to evaluate automated diagnosis, log capture, code patching, and regression verification.

---

## 🎯 Benchmark Target Bugs (Intentional SRE Flaws)

| Bug ID | Description | Location | Planted Exception | Test Assertion |
| :--- | :--- | :--- | :--- | :--- |
| **Bug 1** | **Broken JSON & Data Parsing** | `data/movies.json` + `lib/movieLoader.js:30` | `TypeError: Cannot read properties of undefined (reading 'score')` | `test/cinetest.test.js` (Bug 1 suite) |
| **Bug 2** | **Undefined Property Crash in Filter/Search** | `lib/movieService.js:25` & `lib/movieService.js:28` | `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` | `test/cinetest.test.js` (Bug 2 suite) |
| **Bug 3** | **Watch Player Missing Stream URL** | `lib/movieService.js:77` & `public/app.js:207` | `TypeError: Cannot read properties of undefined (reading 'split')` | `test/cinetest.test.js` (Bug 3 suite) |

---

## 🛠 Project Structure

```text
a:\reflex test\
├── data/
│   └── movies.json         # 6 sample movies containing the planted data omissions
├── lib/
│   ├── movieLoader.js      # Loads & normalizes catalog (contains Bug 1)
│   ├── movieService.js     # Search, filter, and stream initialization (contains Bugs 2 & 3)
│   └── sentryMock.js       # Sentry-compatible exception interceptor & event ledger
├── public/
│   ├── index.html          # CineTest streaming UI + SRE Control Dashboard
│   ├── style.css           # Modern dark-mode streaming styles
│   └── app.js              # Client-side controller, error traps & watch handler
├── test/
│   └── cinetest.test.js    # Vitest unit test suite (asserts the 3 edge cases)
├── package.json            # Scripts: start, test
├── server.js               # Express API & crash simulation endpoints
└── README.md
```

---

## 🚀 Quickstart

### 1. Run Unit Tests (Baseline Failure Verification)
```bash
npm test
```
**Expected Initial Output:**
- `1 passed` (Sanity Check: file system reads raw movies)
- `3 failed` (Bugs 1, 2, and 3 failing on unhandled TypeErrors)

### 2. Start the Streaming Web App
```bash
npm start
```
Open **[http://localhost:3050](http://localhost:3050)** in your browser.

---

## 🔬 SRE / Autonomous Agent APIs

### 1. Deterministic Crash Trigger Endpoint: `/api/test-crash`
You can trigger and verify each bug programmatically via HTTP:

- **Trigger Bug 1 (Catalog Parsing):**
  ```bash
  curl http://localhost:3050/api/test-crash?bug=1
  ```
  Returns HTTP 500 with `TypeError: Cannot read properties of undefined (reading 'score')`.

- **Trigger Bug 2 (Search/Filter):**
  ```bash
  curl http://localhost:3050/api/test-crash?bug=2
  ```
  Returns HTTP 500 with `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`.

- **Trigger Bug 3 (Watch Player):**
  ```bash
  curl http://localhost:3050/api/test-crash?bug=3
  ```
  Returns HTTP 500 with `TypeError: Cannot read properties of undefined (reading 'split')`.

### 2. Sentry Event Ledger: `/api/sentry/events`
Inspect captured runtime exceptions formatted as Sentry envelopes:
```bash
curl http://localhost:3050/api/sentry/events
```

---

## 🧪 Detailed Bug Injection Breakdown

### Bug 1: Missing Nested Field in `movies.json`
- **Data Flaw**: Movie `id: 4` (`Blade Runner 2049`) has no `ratings` object.
- **Vulnerable Code** (`lib/movieLoader.js`):
  ```javascript
  const score = movie.ratings.score;
  const formattedScore = score.toFixed(1);
  ```
- **Autonomous Fix Strategy**: Use optional chaining or fallback object:
  ```javascript
  const score = movie.ratings?.score ?? 0;
  const formattedScore = movie.ratings?.score != null ? score.toFixed(1) : 'N/A';
  ```

### Bug 2: Missing Optional Fields in Search & Filter
- **Data Flaw**: Movie `id: 5` (`Dune: Part Two`) has `tagline: undefined` and `genre: undefined`.
- **Vulnerable Code** (`lib/movieService.js`):
  ```javascript
  const taglineMatch = movie.tagline.toLowerCase().includes(q);
  const genreMatch = movie.genre.toLowerCase().includes(q);
  ```
- **Autonomous Fix Strategy**: Guard with null checks or default strings:
  ```javascript
  const taglineMatch = movie.tagline ? movie.tagline.toLowerCase().includes(q) : false;
  const genreMatch = movie.genre ? movie.genre.toLowerCase().includes(q) : false;
  ```

### Bug 3: Missing `streamUrl` on Watch Now
- **Data Flaw**: Movie `id: 6` (`Oppenheimer`) has no `streamUrl`.
- **Vulnerable Code** (`lib/movieService.js`):
  ```javascript
  const protocol = movie.streamUrl.split('://')[0];
  ```
- **Autonomous Fix Strategy**: Validate `movie.streamUrl` before parsing or provide a default fallback stream URL.
