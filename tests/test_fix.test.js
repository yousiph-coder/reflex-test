const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const movieLoaderPath = path.join(__dirname, '..', 'lib', 'movieLoader.js');
const movieLoader = require(movieLoaderPath);

test('loadCatalog handles missing ratings gracefully', () => {
  const originalReadFileSync = fs.readFileSync;
  try {
    fs.readFileSync = () => JSON.stringify([
      { id: 1, title: 'Movie A', ratings: { score: 9.2, votes: 1200 } },
      { id: 2, title: 'Movie B' } // no ratings field
    ]);

    const catalog = movieLoader.loadCatalog();

    assert.strictEqual(catalog.length, 2);

    const a = catalog[0];
    assert.strictEqual(a.ratingDisplay, '9.2 / 10');
    assert.strictEqual(a.ratingVotes, 1200);
    assert.strictEqual(a.isTopRated, true);

    const b = catalog[1];
    assert.strictEqual(b.ratingDisplay, 'N/A');
    assert.strictEqual(b.ratingVotes, 0);
    assert.strictEqual(b.isTopRated, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});