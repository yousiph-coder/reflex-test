const fs = require('fs');
const path = require('path');

const MOVIES_FILE_PATH = path.join(__dirname, '..', 'data', 'movies.json');

/**
 * Loads raw movies data from disk.
 * @returns {Array<Object>} List of movies
 */
function loadMoviesRaw() {
  const content = fs.readFileSync(MOVIES_FILE_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Normalizes movie data and computes rating display metrics.
 * 
 * INTENTIONAL SRE BUG 1:
 * Intentionally accesses nested `movie.ratings.score` directly without checking
 * if `movie.ratings` exists. Movie 4 ("Blade Runner 2049") has no `ratings` field,
 * causing an unhandled TypeError: Cannot read properties of undefined (reading 'score').
 * 
 * @returns {Array<Object>}
 */
function loadCatalog() {
  const movies = loadMoviesRaw();

  return movies.map((movie) => {
    // BUG 1 (Intentional): Missing null guard for movie.ratings
    const score = movie.ratings.score;
    const formattedScore = score.toFixed(1);

    return {
      ...movie,
      ratingDisplay: `${formattedScore} / 10`,
      ratingVotes: movie.ratings.votes,
      isTopRated: score >= 8.8
    };
  });
}

module.exports = {
  MOVIES_FILE_PATH,
  loadMoviesRaw,
  loadCatalog
};
