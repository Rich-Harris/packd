const LRU = require('lru-cache');

module.exports = new LRU({
	max: 128 * 1024 * 1024,
	length: src => src.length
});
