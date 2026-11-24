import { describe, it, expect } from 'vitest';
import { loadMoviesRaw, loadCatalog } from '../lib/movieLoader.js';
import { searchAndFilterMovies, initializeWatchSession } from '../lib/movieService.js';

describe('CineTest SRE Benchmark Test Suite', () => {

  // Sanity check: file existence and raw parsing
  describe('Sanity Check: Raw File System & Data Integrity', () => {
    it('successfully loads raw movies.json with exactly 6 movie entries', () => {
      const rawMovies = loadMoviesRaw();
      expect(Array.isArray(rawMovies)).toBe(true);
      expect(rawMovies.length).toBe(6);
      expect(rawMovies[0].title).toBe('Inception');
    });
  });

  // BUG 1 Edge Case: Broken JSON & Data Parsing Bug
  describe('Bug 1: Broken JSON & Data Parsing Bug (data/movies.json + loader)', () => {
    it('loads and normalizes all 6 catalog movies with ratings without throwing TypeError', () => {
      // INTENTIONAL FAILURE:
      // Movie 4 ("Blade Runner 2049") is missing the 'ratings' nested object.
      // loadCatalog() attempts `movie.ratings.score.toFixed(1)` without a null guard,
      // throwing: TypeError: Cannot read properties of undefined (reading 'score')
      const catalog = loadCatalog();

      expect(catalog).toHaveLength(6);
      catalog.forEach((movie) => {
        expect(movie).toHaveProperty('ratingDisplay');
        expect(typeof movie.isTopRated).toBe('boolean');
      });
    });
  });

  // BUG 2 Edge Case: Undefined Property Crash in Search / Filter
  describe('Bug 2: Undefined Property Crash (TypeError in Movie Search / Filter)', () => {
    it('searches and filters movies without throwing TypeError on missing tagline or genre', () => {
      const rawMovies = loadMoviesRaw();

      // INTENTIONAL FAILURE:
      // Movie 5 ("Dune: Part Two") is missing both 'tagline' and 'genre'.
      // searchAndFilterMovies() calls .toLowerCase() on movie.tagline and movie.genre directly,
      // throwing: TypeError: Cannot read properties of undefined (reading 'toLowerCase')
      const queryResults = searchAndFilterMovies(rawMovies, { query: 'future' });
      expect(Array.isArray(queryResults)).toBe(true);

      const categoryResults = searchAndFilterMovies(rawMovies, { genre: 'Sci-Fi' });
      expect(Array.isArray(categoryResults)).toBe(true);
    });
  });

  // BUG 3 Edge Case: Watch Player Crash on Missing streamUrl
  describe('Bug 3: Watch Player Crash (ReferenceError / TypeError on "Watch Now")', () => {
    it('initializes watch stream session without throwing TypeError when streamUrl is missing', () => {
      // INTENTIONAL FAILURE:
      // Movie 6 ("Oppenheimer") has no 'streamUrl' field (undefined).
      // initializeWatchSession(6) calls `movie.streamUrl.split('://')` directly,
      // throwing: TypeError: Cannot read properties of undefined (reading 'split')
      const session = initializeWatchSession(6);

      expect(session).toBeDefined();
      expect(session.movieId).toBe(6);
      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('streamUrl');
    });
  });

});
