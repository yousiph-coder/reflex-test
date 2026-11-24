const { loadMoviesRaw, loadCatalog } = require('./movieLoader');

/**
 * Searches and filters movies based on query and genre.
 * 
 * INTENTIONAL SRE BUG 2:
 * Directly calls `.toLowerCase()` on `movie.tagline` and `movie.genre`
 * without null guards. Movie 5 ("Dune: Part Two") has undefined `tagline` and `genre`,
 * throwing unhandled `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`.
 * 
 * @param {Array<Object>} movies
 * @param {Object} filterOptions
 * @param {string} [filterOptions.query]
 * @param {string} [filterOptions.genre]
 * @returns {Array<Object>}
 */
function searchAndFilterMovies(movies, { query, genre } = {}) {
  let filtered = [...movies];

  if (query && query.trim() !== '') {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter((movie) => {
      const titleMatch = movie.title.toLowerCase().includes(q);
      
      // BUG 2 (Intentional): Missing null guard on optional tagline property
      const taglineMatch = movie.tagline.toLowerCase().includes(q);
      
      // BUG 2 (Intentional): Missing null guard on optional genre property
      const genreMatch = movie.genre.toLowerCase().includes(q);

      return titleMatch || taglineMatch || genreMatch;
    });
  }

  if (genre && genre !== 'All') {
    filtered = filtered.filter((movie) => {
      // BUG 2 (Intentional): Missing null guard when filtering by category
      return movie.genre.toLowerCase() === genre.toLowerCase();
    });
  }

  return filtered;
}

/**
 * Prepares and initializes an HLS video stream playback session.
 * 
 * INTENTIONAL SRE BUG 3:
 * Accesses `movie.streamUrl.split()` directly without a null/undefined guard.
 * Movie 6 ("Oppenheimer") is missing the `streamUrl` field,
 * triggering an unhandled `TypeError: Cannot read properties of undefined (reading 'split')`.
 * 
 * @param {number|string} movieId
 * @param {Array<Object>} [moviesList]
 * @returns {Object} Stream session info
 */
function initializeWatchSession(movieId, moviesList = null) {
  const movies = moviesList || loadMoviesRaw();
  const movie = movies.find((m) => m.id === Number(movieId));

  if (!movie) {
    throw new Error(`Movie with ID ${movieId} not found in catalog.`);
  }

  // BUG 3 (Intentional): Missing null guard for streamUrl
  const protocol = movie.streamUrl.split('://')[0];
  const urlParts = movie.streamUrl.split('/');
  const streamKey = urlParts[urlParts.length - 1];

  return {
    sessionId: `stream_sess_${Date.now()}_${movie.id}`,
    movieId: movie.id,
    title: movie.title,
    protocol,
    streamUrl: movie.streamUrl,
    streamKey,
    playerConfig: {
      autoplay: true,
      quality: "1080p60",
      drmProtected: false,
      bufferLengthSec: 30
    }
  };
}

module.exports = {
  searchAndFilterMovies,
  initializeWatchSession
};
